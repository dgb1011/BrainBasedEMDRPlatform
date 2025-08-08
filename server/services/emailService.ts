import nodemailer from 'nodemailer';
import { createTransport, Transporter } from 'nodemailer';
import { supabase } from '../supabase';
import { z } from 'zod';

// Email templates
const emailTemplates = {
  welcome: {
    subject: 'Welcome to BrainBased EMDR Platform',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome to BrainBased EMDR Platform!</h1>
        <p>Hello ${data.firstName},</p>
        <p>Your account has been created successfully. You can now start scheduling consultation sessions to complete your EMDR certification.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Next Steps:</h3>
          <ol>
            <li>Complete your profile</li>
            <li>Schedule your first consultation session</li>
            <li>Track your progress toward 40 hours</li>
          </ol>
        </div>
        <a href="${process.env.APP_URL}/login" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Access Your Dashboard</a>
        <p style="margin-top: 30px; color: #666;">Best regards,<br>The BrainBased EMDR Team</p>
      </div>
    `
  },
  
  kajabiWelcome: {
    subject: 'Complete Your EMDR Platform Setup',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome to BrainBased EMDR Consultation Platform!</h1>
        <p>Hello ${data.firstName},</p>
        <p>Congratulations on completing your EMDR training course! Your consultation tracking account has been automatically created.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Important: Set Your Password</h3>
          <p>Click the button below to set your password and access your dashboard:</p>
        </div>
        <a href="${process.env.APP_URL}/auth/kajabi-login?token=${data.loginToken}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Set Password & Login</a>
        <p style="margin-top: 20px; font-size: 14px; color: #666;">This link will expire in 7 days. If you need a new link, please contact support.</p>
        <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-radius: 8px;">
          <h3 style="color: #92400e;">What's Next?</h3>
          <ul style="color: #92400e;">
            <li>Set your password</li>
            <li>Complete your profile</li>
            <li>Schedule consultation sessions</li>
            <li>Track your 40-hour requirement</li>
            <li>Receive your certification automatically</li>
          </ul>
        </div>
        <p style="margin-top: 30px; color: #666;">Best regards,<br>The BrainBased EMDR Team</p>
      </div>
    `
  },

  sessionReminder: {
    subject: 'Upcoming Consultation Session Reminder',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Session Reminder</h1>
        <p>Hello ${data.studentName},</p>
        <p>This is a reminder about your upcoming EMDR consultation session:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Session Details:</h3>
          <p><strong>Date:</strong> ${data.sessionDate}</p>
          <p><strong>Time:</strong> ${data.sessionTime}</p>
          <p><strong>Consultant:</strong> ${data.consultantName}</p>
          <p><strong>Duration:</strong> ${data.duration} minutes</p>
          <p><strong>Type:</strong> ${data.sessionType}</p>
        </div>
        <a href="${process.env.APP_URL}/dashboard/sessions/${data.sessionId}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Join Video Session</a>
        <p style="margin-top: 20px; color: #666;">
          <strong>Important:</strong> Please ensure you have a stable internet connection and are in a quiet environment for your session.
        </p>
        <p style="margin-top: 30px; color: #666;">Best regards,<br>The BrainBased EMDR Team</p>
      </div>
    `
  },

  milestone35Hours: {
    subject: 'You\'re Almost There! 35 Hours Completed',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f59e0b;">🎉 35 Hours Milestone Reached!</h1>
        <p>Congratulations ${data.firstName}!</p>
        <p>You've completed <strong>35 hours</strong> of consultation sessions. You're just <strong>5 hours away</strong> from receiving your EMDR certification!</p>
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Your Progress:</h3>
          <div style="background-color: #e5e7eb; height: 30px; border-radius: 15px; overflow: hidden;">
            <div style="background-color: #f59e0b; height: 100%; width: 87.5%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
              35/40 hours (87.5%)
            </div>
          </div>
        </div>
        <p>Keep up the great work! Schedule your remaining sessions to complete your certification.</p>
        <a href="${process.env.APP_URL}/dashboard/schedule" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Schedule Sessions</a>
        <p style="margin-top: 30px; color: #666;">Best regards,<br>The BrainBased EMDR Team</p>
      </div>
    `
  },

  milestone40Hours: {
    subject: '🎓 Congratulations! You\'ve Completed 40 Hours',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">🎓 Certification Complete!</h1>
        <p>Congratulations ${data.firstName}!</p>
        <p>You've successfully completed <strong>40 hours</strong> of EMDR consultation sessions. Your certification is being generated!</p>
        <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h2 style="color: #065f46; margin: 0;">40 HOURS COMPLETED</h2>
          <p style="color: #065f46; margin: 10px 0 0 0;">EMDR Basic Training Certification Achieved</p>
        </div>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>What happens next?</h3>
          <ol>
            <li>Your certificate is being generated</li>
            <li>You'll receive it via email within 24 hours</li>
            <li>Your profile will be added to our directory</li>
            <li>You can continue booking advanced sessions</li>
          </ol>
        </div>
        <a href="${process.env.APP_URL}/dashboard/certification" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Your Achievement</a>
        <p style="margin-top: 30px; color: #666;">Congratulations again!<br>The BrainBased EMDR Team</p>
      </div>
    `
  },

  certificateDelivery: {
    subject: '🎓 Your EMDR Certification is Ready!',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Your EMDR Certificate is Ready!</h1>
        <p>Dear ${data.firstName} ${data.lastName},</p>
        <p>Your official EMDR Basic Training certificate has been generated and is attached to this email.</p>
        <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #065f46;">Certificate Details:</h3>
          <p><strong>Certificate Number:</strong> ${data.certificateNumber}</p>
          <p><strong>Issue Date:</strong> ${data.issueDate}</p>
          <p><strong>Total Hours Completed:</strong> ${data.totalHours}</p>
          <p><strong>Verification Code:</strong> ${data.verificationCode}</p>
        </div>
        <p>You can verify your certificate at any time using the verification code above on our website.</p>
        <a href="${process.env.APP_URL}/verify/${data.verificationCode}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Verify Certificate</a>
        <div style="margin-top: 30px; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
          <h3>Next Steps:</h3>
          <ul>
            <li>Save your certificate in a secure location</li>
            <li>Update your professional profiles</li>
            <li>Join our professional directory</li>
            <li>Consider advanced EMDR training</li>
          </ul>
        </div>
        <p style="margin-top: 30px; color: #666;">Congratulations on your achievement!<br>The BrainBased EMDR Team</p>
      </div>
    `
  },

  sessionConfirmation: {
    subject: 'Session Booking Confirmed',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Session Booking Confirmed</h1>
        <p>Hello ${data.studentName},</p>
        <p>Your consultation session has been successfully scheduled!</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Session Details:</h3>
          <p><strong>Date:</strong> ${data.sessionDate}</p>
          <p><strong>Time:</strong> ${data.sessionTime}</p>
          <p><strong>Consultant:</strong> ${data.consultantName}</p>
          <p><strong>Duration:</strong> ${data.duration} minutes</p>
          <p><strong>Session ID:</strong> ${data.sessionId}</p>
        </div>
        <div style="display: flex; gap: 10px; margin: 20px 0;">
          <a href="${process.env.APP_URL}/dashboard/sessions/${data.sessionId}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Session</a>
          <a href="${data.calendarLink}" style="display: inline-block; background-color: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Add to Calendar</a>
        </div>
        <p style="color: #666;">You'll receive a reminder 24 hours and 2 hours before your session.</p>
        <p style="margin-top: 30px; color: #666;">Best regards,<br>The BrainBased EMDR Team</p>
      </div>
    `
  }
};

export interface EmailData {
  to: string;
  cc?: string;
  bcc?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer;
    path?: string;
  }>;
  [key: string]: any;
}

export class EmailService {
  private transporter: Transporter;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // Use environment variables for email configuration
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        this.transporter = createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        this.isConfigured = true;
      } else {
        // Fallback to console logging in development
        console.warn('Email service not configured. Emails will be logged to console.');
        this.transporter = createTransport({
          streamTransport: true,
          newline: 'unix',
          buffer: true
        });
      }
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(data: EmailData): Promise<void> {
    const template = emailTemplates.welcome;
    await this.sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.template(data)
    });
  }

  /**
   * Send welcome email to Kajabi users with login token
   */
  async sendKajabiWelcomeEmail(data: EmailData): Promise<void> {
    const template = emailTemplates.kajabiWelcome;
    await this.sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.template(data)
    });
  }

  /**
   * Send session reminder emails
   */
  async sendSessionReminder(data: EmailData): Promise<void> {
    const template = emailTemplates.sessionReminder;
    await this.sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.template(data)
    });

    // Also send to consultant if provided
    if (data.consultantEmail) {
      await this.sendEmail({
        to: data.consultantEmail,
        subject: `Consultation Session Reminder - ${data.studentName}`,
        html: template.template({ ...data, studentName: `with ${data.studentName}` })
      });
    }
  }

  /**
   * Send 35-hour milestone notification
   */
  async send35HourMilestone(data: EmailData): Promise<void> {
    const template = emailTemplates.milestone35Hours;
    await this.sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.template(data)
    });

    // Log milestone achievement
    await this.logEmailEvent('milestone_35_hours', data.to, data);
  }

  /**
   * Send 40-hour completion notification
   */
  async send40HourCompletion(data: EmailData): Promise<void> {
    const template = emailTemplates.milestone40Hours;
    await this.sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.template(data)
    });

    // Log milestone achievement
    await this.logEmailEvent('milestone_40_hours', data.to, data);
  }

  /**
   * Send certificate delivery email with attachment
   */
  async sendCertificateEmail(data: EmailData): Promise<void> {
    const template = emailTemplates.certificateDelivery;
    await this.sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.template(data),
      attachments: data.attachments
    });

    // Log certificate delivery
    await this.logEmailEvent('certificate_delivered', data.to, data);
  }

  /**
   * Send session booking confirmation
   */
  async sendSessionConfirmation(data: EmailData): Promise<void> {
    const template = emailTemplates.sessionConfirmation;
    
    // Send to student
    await this.sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.template(data)
    });

    // Send to consultant
    if (data.consultantEmail) {
      await this.sendEmail({
        to: data.consultantEmail,
        subject: `New Session Booking - ${data.studentName}`,
        html: template.template({
          ...data,
          studentName: data.consultantName,
          consultantName: data.studentName
        })
      });
    }
  }

  /**
   * Schedule a reminder email
   */
  async scheduleReminder(
    sessionId: string, 
    reminderType: '24_hours' | '2_hours' | '15_minutes'
  ): Promise<void> {
    // Get session details
    const { data: session, error } = await supabase
      .from('consultation_sessions')
      .select(`
        *,
        student:students(user:users(*)),
        consultant:consultants(user:users(*))
      `)
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      console.error('Failed to get session for reminder:', error);
      return;
    }

    // Calculate when to send
    const sessionTime = new Date(session.scheduled_start);
    const sendTime = new Date(sessionTime);

    switch (reminderType) {
      case '24_hours':
        sendTime.setHours(sendTime.getHours() - 24);
        break;
      case '2_hours':
        sendTime.setHours(sendTime.getHours() - 2);
        break;
      case '15_minutes':
        sendTime.setMinutes(sendTime.getMinutes() - 15);
        break;
    }

    // Store scheduled reminder in database
    await supabase.from('scheduled_emails').insert({
      type: 'session_reminder',
      recipient_email: session.student.user.email,
      scheduled_for: sendTime,
      data: {
        sessionId,
        reminderType,
        studentName: `${session.student.user.first_name} ${session.student.user.last_name}`,
        consultantName: `${session.consultant.user.first_name} ${session.consultant.user.last_name}`,
        consultantEmail: session.consultant.user.email,
        sessionDate: sessionTime.toLocaleDateString(),
        sessionTime: sessionTime.toLocaleTimeString(),
        duration: 60
      }
    });
  }

  /**
   * Core email sending function
   */
  private async sendEmail(options: any): Promise<void> {
    try {
      if (!this.isConfigured) {
        // Log to console in development
        console.log('📧 Email would be sent:', {
          to: options.to,
          subject: options.subject,
          preview: options.html?.substring(0, 200) + '...'
        });
        return;
      }

      // Add default from address
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@brainbasedemdr.com',
        ...options
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);

      // Log successful send
      await this.logEmailEvent('sent', options.to, {
        messageId: info.messageId,
        subject: options.subject
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      
      // Log failed send
      await this.logEmailEvent('failed', options.to, {
        error: error instanceof Error ? error.message : 'Unknown error',
        subject: options.subject
      });
      
      throw error;
    }
  }

  /**
   * Log email events for tracking
   */
  private async logEmailEvent(
    eventType: string, 
    recipient: string, 
    data: any
  ): Promise<void> {
    try {
      await supabase.from('email_logs').insert({
        event_type: eventType,
        recipient_email: recipient,
        data: data,
        created_at: new Date()
      });
    } catch (error) {
      console.error('Failed to log email event:', error);
    }
  }

  /**
   * Process scheduled emails (should be called by a cron job)
   */
  async processScheduledEmails(): Promise<void> {
    const { data: scheduledEmails } = await supabase
      .from('scheduled_emails')
      .select('*')
      .lte('scheduled_for', new Date().toISOString())
      .eq('sent', false)
      .limit(50);

    if (!scheduledEmails) return;

    for (const email of scheduledEmails) {
      try {
        switch (email.type) {
          case 'session_reminder':
            await this.sendSessionReminder(email.data);
            break;
          // Add other scheduled email types as needed
        }

        // Mark as sent
        await supabase
          .from('scheduled_emails')
          .update({ sent: true, sent_at: new Date() })
          .eq('id', email.id);
      } catch (error) {
        console.error('Failed to send scheduled email:', error);
      }
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
