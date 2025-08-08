import Stripe from 'stripe';
import { supabase } from '../supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
}

export interface ConsultantPayment {
  id: string;
  consultantId: string;
  sessionId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  stripePaymentIntentId?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
  stripePriceId: string;
}

export class PaymentService {
  /**
   * Create payment intent for session
   */
  static async createSessionPayment(
    sessionId: string,
    consultantId: string,
    amount: number,
    currency: string = 'usd'
  ): Promise<PaymentIntent> {
    try {
      // Get consultant details
      const { data: consultant } = await supabase
        .from('consultants')
        .select('stripe_account_id, hourly_rate')
        .eq('user_id', consultantId)
        .single();

      if (!consultant) {
        throw new Error('Consultant not found');
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata: {
          sessionId,
          consultantId,
          type: 'consultation_session'
        },
        application_fee_amount: Math.round(amount * 10), // 10% platform fee
        transfer_data: {
          destination: consultant.stripe_account_id,
        },
      });

      // Log payment intent
      await this.logPaymentIntent(sessionId, paymentIntent.id, amount, 'pending');

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret!,
      };
    } catch (error) {
      console.error('Payment intent creation error:', error);
      throw error;
    }
  }

  /**
   * Confirm payment for session
   */
  static async confirmSessionPayment(
    sessionId: string,
    paymentIntentId: string
  ): Promise<ConsultantPayment> {
    try {
      // Retrieve payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Payment not completed');
      }

      // Update session payment status
      const { data: session, error: sessionError } = await supabase
        .from('consultation_sessions')
        .update({
          payment_status: 'completed',
          payment_completed_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (sessionError) {
        throw new Error(`Session update error: ${sessionError.message}`);
      }

      // Create consultant payment record
      const { data: payment, error: paymentError } = await supabase
        .from('consultant_payments')
        .insert({
          session_id: sessionId,
          consultant_id: session.consultant_id,
          amount: paymentIntent.amount / 100,
          status: 'completed',
          stripe_payment_intent_id: paymentIntentId,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (paymentError) {
        throw new Error(`Payment record creation error: ${paymentError.message}`);
      }

      return {
        id: payment.id,
        consultantId: payment.consultant_id,
        sessionId: payment.session_id,
        amount: payment.amount,
        status: payment.status,
        stripePaymentIntentId: payment.stripe_payment_intent_id,
        createdAt: new Date(payment.created_at),
        completedAt: payment.completed_at ? new Date(payment.completed_at) : undefined
      };
    } catch (error) {
      console.error('Payment confirmation error:', error);
      throw error;
    }
  }

  /**
   * Create subscription for recurring payments
   */
  static async createSubscription(
    customerId: string,
    priceId: string,
    metadata: Record<string, string> = {}
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata,
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      return subscription;
    } catch (error) {
      console.error('Subscription creation error:', error);
      throw error;
    }
  }

  /**
   * Create customer for recurring payments
   */
  static async createCustomer(
    email: string,
    name: string,
    metadata: Record<string, string> = {}
  ): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata,
      });

      return customer;
    } catch (error) {
      console.error('Customer creation error:', error);
      throw error;
    }
  }

  /**
   * Get consultant earnings
   */
  static async getConsultantEarnings(
    consultantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalEarnings: number;
    completedSessions: number;
    pendingPayments: number;
    payments: ConsultantPayment[];
  }> {
    try {
      let query = supabase
        .from('consultant_payments')
        .select('*')
        .eq('consultant_id', consultantId);

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data: payments, error } = await query;

      if (error) {
        throw new Error(`Earnings query error: ${error.message}`);
      }

      const totalEarnings = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      const completedSessions = payments.filter(p => p.status === 'completed').length;
      const pendingPayments = payments.filter(p => p.status === 'pending').length;

      return {
        totalEarnings,
        completedSessions,
        pendingPayments,
        payments: payments.map(p => ({
          id: p.id,
          consultantId: p.consultant_id,
          sessionId: p.session_id,
          amount: p.amount,
          status: p.status,
          stripePaymentIntentId: p.stripe_payment_intent_id,
          createdAt: new Date(p.created_at),
          completedAt: p.completed_at ? new Date(p.completed_at) : undefined
        }))
      };
    } catch (error) {
      console.error('Earnings calculation error:', error);
      throw error;
    }
  }

  /**
   * Process refund for session
   */
  static async processRefund(
    sessionId: string,
    amount?: number,
    reason: string = 'customer_request'
  ): Promise<Stripe.Refund> {
    try {
      // Get session payment details
      const { data: session } = await supabase
        .from('consultation_sessions')
        .select('stripe_payment_intent_id')
        .eq('id', sessionId)
        .single();

      if (!session?.stripe_payment_intent_id) {
        throw new Error('No payment found for session');
      }

      // Process refund through Stripe
      const refund = await stripe.refunds.create({
        payment_intent: session.stripe_payment_intent_id,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason: reason as any,
        metadata: {
          sessionId,
          reason
        }
      });

      // Update session refund status
      await supabase
        .from('consultation_sessions')
        .update({
          refund_status: 'processed',
          refund_amount: refund.amount / 100,
          refund_processed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      return refund;
    } catch (error) {
      console.error('Refund processing error:', error);
      throw error;
    }
  }

  /**
   * Log payment intent for tracking
   */
  private static async logPaymentIntent(
    sessionId: string,
    paymentIntentId: string,
    amount: number,
    status: string
  ): Promise<void> {
    try {
      await supabase
        .from('payment_intents')
        .insert({
          session_id: sessionId,
          stripe_payment_intent_id: paymentIntentId,
          amount,
          status,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Payment intent logging error:', error);
    }
  }

  /**
   * Get available subscription plans
   */
  static async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const { data: plans, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price');

      if (error) {
        throw new Error(`Plans query error: ${error.message}`);
      }

      return plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        interval: plan.interval,
        features: plan.features,
        stripePriceId: plan.stripe_price_id
      }));
    } catch (error) {
      console.error('Subscription plans error:', error);
      throw error;
    }
  }

  /**
   * Handle webhook events from Stripe
   */
  static async handleWebhook(
    event: Stripe.Event
  ): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
          break;
        case 'invoice.payment_succeeded':
          await this.handleSubscriptionPayment(event.data.object as Stripe.Invoice);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancellation(event.data.object as Stripe.Subscription);
          break;
        default:
          console.log(`Unhandled Stripe event: ${event.type}`);
      }
    } catch (error) {
      console.error('Stripe webhook handling error:', error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  private static async handlePaymentSuccess(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const sessionId = paymentIntent.metadata.sessionId;
    if (sessionId) {
      await this.confirmSessionPayment(sessionId, paymentIntent.id);
    }
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailure(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const sessionId = paymentIntent.metadata.sessionId;
    if (sessionId) {
      await supabase
        .from('consultation_sessions')
        .update({
          payment_status: 'failed',
          payment_failed_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    }
  }

  /**
   * Handle subscription payment
   */
  private static async handleSubscriptionPayment(
    invoice: Stripe.Invoice
  ): Promise<void> {
    // Handle subscription payment logic
    console.log('Subscription payment processed:', invoice.id);
  }

  /**
   * Handle subscription cancellation
   */
  private static async handleSubscriptionCancellation(
    subscription: Stripe.Subscription
  ): Promise<void> {
    // Handle subscription cancellation logic
    console.log('Subscription cancelled:', subscription.id);
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
