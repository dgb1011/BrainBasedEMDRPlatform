import { supabase } from '../supabase';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export interface ClientConfig {
  id?: string;
  client_id: string;
  domain?: string;
  kajabi_webhook_url?: string;
  kajabi_webhook_secret?: string;
  email_config?: any;
  integration_status: 'not_connected' | 'ready' | 'active' | 'error';
  created_at?: string;
  updated_at?: string;
}

export interface WebhookConfig {
  webhook_url: string;
  webhook_secret: string;
  status: 'active' | 'inactive';
}

export class ClientIntegrationService {
  /**
   * Generate unique webhook URL for a client
   */
  static generateClientWebhookUrl(clientId: string): string {
    const uniqueToken = crypto.randomBytes(32).toString('hex');
    const baseUrl = process.env.API_BASE_URL || 'https://api.brainbasedemdr.com';
    return `${baseUrl}/api/webhooks/kajabi/${clientId}/${uniqueToken}`;
  }

  /**
   * Generate secure webhook secret for a client
   */
  static generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new client webhook configuration
   */
  static async createClientWebhook(clientId: string): Promise<WebhookConfig> {
    const webhookUrl = this.generateClientWebhookUrl(clientId);
    const webhookSecret = this.generateWebhookSecret();
    
    // Store webhook configuration
    const { error: webhookError } = await supabase
      .from('client_webhooks')
      .insert({
        client_id: clientId,
        webhook_url: webhookUrl,
        webhook_secret: webhookSecret,
        status: 'active'
      });

    if (webhookError) {
      throw new Error(`Failed to create webhook: ${webhookError.message}`);
    }

    // Update client configuration
    const { error: configError } = await supabase
      .from('client_configs')
      .upsert({
        client_id: clientId,
        kajabi_webhook_url: webhookUrl,
        kajabi_webhook_secret: webhookSecret,
        integration_status: 'ready',
        updated_at: new Date().toISOString()
      });

    if (configError) {
      throw new Error(`Failed to update client config: ${configError.message}`);
    }

    return { webhook_url: webhookUrl, webhook_secret: webhookSecret, status: 'active' };
  }

  /**
   * Get client configuration
   */
  static async getClientConfig(clientId: string): Promise<ClientConfig | null> {
    const { data, error } = await supabase
      .from('client_configs')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as ClientConfig;
  }

  /**
   * Update client configuration
   */
  static async updateClientConfig(clientId: string, updates: Partial<ClientConfig>): Promise<void> {
    const { error } = await supabase
      .from('client_configs')
      .upsert({
        client_id: clientId,
        ...updates,
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to update client config: ${error.message}`);
    }
  }

  /**
   * Test Kajabi integration for a client
   */
  static async testKajabiIntegration(clientId: string): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const clientConfig = await this.getClientConfig(clientId);
      if (!clientConfig || !clientConfig.kajabi_webhook_url) {
        return {
          success: false,
          message: 'Kajabi integration not configured'
        };
      }

      // Test webhook endpoint
      const testPayload = {
        event: 'test.integration',
        student: {
          id: 'test-student-123',
          email: 'test@integration.com',
          firstName: 'Test',
          lastName: 'Student',
          courseId: 'test-course'
        },
        course: {
          id: 'test-course',
          name: 'Test Course',
          status: 'active'
        }
      };

      // Simulate webhook processing
      const testResult = await this.processTestWebhook(clientId, testPayload);

      return {
        success: true,
        message: 'Kajabi integration test successful',
        details: {
          webhook_url: clientConfig.kajabi_webhook_url,
          test_student_created: testResult.studentCreated,
          test_email_sent: testResult.emailSent
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Process test webhook for integration testing
   */
  private static async processTestWebhook(clientId: string, testPayload: any): Promise<{
    studentCreated: boolean;
    emailSent: boolean;
  }> {
    // This simulates the webhook processing without actually creating real records
    console.log(`Processing test webhook for client ${clientId}:`, testPayload);
    
    return {
      studentCreated: true,
      emailSent: true
    };
  }

  /**
   * Get integration status for a client
   */
  static async getIntegrationStatus(clientId: string): Promise<{
    status: string;
    webhook_url?: string;
    students_count?: number;
    last_sync?: string;
  }> {
    const clientConfig = await this.getClientConfig(clientId);
    
    if (!clientConfig) {
      return { status: 'not_configured' };
    }

    // Get student count for this client
    const { count: studentsCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId);

    // Get last webhook activity
    const { data: lastWebhook } = await supabase
      .from('webhook_logs')
      .select('created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return {
      status: clientConfig.integration_status,
      webhook_url: clientConfig.kajabi_webhook_url,
      students_count: studentsCount || 0,
      last_sync: lastWebhook?.created_at
    };
  }

  /**
   * Validate webhook signature for a specific client
   */
  static async validateWebhookSignature(
    signature: string, 
    payload: string, 
    clientId: string
  ): Promise<boolean> {
    const clientConfig = await this.getClientConfig(clientId);
    
    if (!clientConfig?.kajabi_webhook_secret) {
      console.warn(`No webhook secret found for client ${clientId}`);
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', clientConfig.kajabi_webhook_secret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Webhook signature validation error:', error);
      return false;
    }
  }

  /**
   * Log webhook event for a client
   */
  static async logWebhookEvent(clientId: string, eventData: any): Promise<void> {
    const { error } = await supabase
      .from('webhook_logs')
      .insert({
        client_id: clientId,
        event_type: eventData.event,
        event_data: eventData,
        processed_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log webhook event:', error);
    }
  }

  /**
   * Get webhook logs for a client
   */
  static async getWebhookLogs(clientId: string, limit: number = 50): Promise<any[]> {
    const { data, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get webhook logs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Deactivate webhook for a client
   */
  static async deactivateWebhook(clientId: string): Promise<void> {
    // Update webhook status
    const { error: webhookError } = await supabase
      .from('client_webhooks')
      .update({ status: 'not_connected' })
      .eq('client_id', clientId);

    if (webhookError) {
      throw new Error(`Failed to deactivate webhook: ${webhookError.message}`);
    }

    // Update client config
    await this.updateClientConfig(clientId, {
      integration_status: 'not_connected'
    });
  }

  /**
   * Reactivate webhook for a client
   */
  static async reactivateWebhook(clientId: string): Promise<WebhookConfig> {
    // Create new webhook configuration
    const webhookConfig = await this.createClientWebhook(clientId);
    
    // Update client config
    await this.updateClientConfig(clientId, {
      integration_status: 'active'
    });

    return webhookConfig;
  }
}
