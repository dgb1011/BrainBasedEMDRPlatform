import sgMail from '@sendgrid/mail';

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

export interface EmailData {
  to: string;
  from?: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: any;
}

export class TwilioEmailService {
  private fromEmail: string;
  private fromName: string;

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY environment variable is required');
    }

    sgMail.setApiKey(apiKey);
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@brainbasedemdr.com';
    this.fromName = process.env.SENDGRID_FROM_NAME || 'BrainBased EMDR Training';
  }

  /**
   * Send email using SendGrid
   */
  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      const msg = {
        to: emailData.to,
        from: {
          email: emailData.from || this.fromEmail,
          name: this.fromName
        },
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
        templateId: emailData.templateId,
        dynamicTemplateData: emailData.dynamicTemplateData
      };

      await sgMail.send(msg);
      console.log(`Email sent successfully to ${emailData.to}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Send session confirmation email
   */
  async sendSessionConfirmation(
    userEmail: string,
    userName: string,
    sessionDate: string,
    sessionTime: string,
    consultantName: string,
    sessionId: string
  ): Promise<boolean> {
    const template = this.getSessionConfirmationTemplate(
      userName,
      sessionDate,
      sessionTime,
      consultantName,
      sessionId
    );

    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  /**
   * Send session reminder email
   */
  async sendSessionReminder(
    userEmail: string,
    userName: string,
    sessionDate: string,
    sessionTime: string,
    sessionId: string,
    reminderType: '24h' | '30min' = '30min'
  ): Promise<boolean> {
    const template = this.getSessionReminderTemplate(
      userName,
      sessionDate,
      sessionTime,
      sessionId,
      reminderType
    );

    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  /**
   * Send session completion notification
   */
  async sendSessionCompletion(
    studentEmail: string,
    studentName: string,
    sessionDuration: number,
    totalHours: number,
    consultantName: string
  ): Promise<boolean> {
    const template = this.getSessionCompletionTemplate(
      studentName,
      sessionDuration,
      totalHours,
      consultantName
    );

    return this.sendEmail({
      to: studentEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  /**
   * Send certificate available notification
   */
  async sendCertificateAvailable(
    studentEmail: string,
    studentName: string,
    certificateUrl: string
  ): Promise<boolean> {
    const template = this.getCertificateAvailableTemplate(
      studentName,
      certificateUrl
    );

    return this.sendEmail({
      to: studentEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  /**
   * Send consultant payment notification
   */
  async sendConsultantPayment(
    consultantEmail: string,
    consultantName: string,
    monthlyEarnings: number,
    sessionCount: number,
    paymentDate: string
  ): Promise<boolean> {
    const template = this.getConsultantPaymentTemplate(
      consultantName,
      monthlyEarnings,
      sessionCount,
      paymentDate
    );

    return this.sendEmail({
      to: consultantEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  /**
   * Email template generators
   */
  private getSessionConfirmationTemplate(
    userName: string,
    sessionDate: string,
    sessionTime: string,
    consultantName: string,
    sessionId: string
  ): EmailTemplate {
    const subject = 'EMDR Consultation Session Confirmed';
    const baseUrl = process.env.APP_URL || 'http://localhost:5173';
    
    const text = `
Hello ${userName},

Your EMDR consultation session has been confirmed!

Session Details:
- Date: ${sessionDate}
- Time: ${sessionTime}
- Consultant: ${consultantName}
- Session ID: ${sessionId}

Please join your session at: ${baseUrl}/video/${sessionId}

Make sure to:
- Test your camera and microphone beforehand
- Join the session 5 minutes early
- Have a quiet, private space for the consultation

If you need to reschedule or have any questions, please contact us immediately.

Best regards,
BrainBased EMDR Training Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">Session Confirmed!</h1>
    </div>
    
    <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin-top: 20px;">
      <p>Hello <strong>${userName}</strong>,</p>
      <p>Your EMDR consultation session has been confirmed!</p>
      
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #2563eb; margin-top: 0;">Session Details</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="margin: 10px 0;"><strong>Date:</strong> ${sessionDate}</li>
          <li style="margin: 10px 0;"><strong>Time:</strong> ${sessionTime}</li>
          <li style="margin: 10px 0;"><strong>Consultant:</strong> ${consultantName}</li>
          <li style="margin: 10px 0;"><strong>Session ID:</strong> ${sessionId}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}/video/${sessionId}" 
           style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Join Session
        </a>
      </div>
      
      <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h4 style="color: #1976d2; margin-top: 0;">Before Your Session:</h4>
        <ul>
          <li>Test your camera and microphone</li>
          <li>Join the session 5 minutes early</li>
          <li>Ensure you have a quiet, private space</li>
        </ul>
      </div>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        If you need to reschedule or have any questions, please contact us immediately.
      </p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
      Best regards,<br>
      BrainBased EMDR Training Team
    </div>
  </div>
</body>
</html>
    `;

    return { subject, text, html };
  }

  private getSessionReminderTemplate(
    userName: string,
    sessionDate: string,
    sessionTime: string,
    sessionId: string,
    reminderType: '24h' | '30min'
  ): EmailTemplate {
    const timeText = reminderType === '24h' ? '24 hours' : '30 minutes';
    const subject = `Reminder: EMDR Session in ${timeText}`;
    const baseUrl = process.env.APP_URL || 'http://localhost:5173';
    
    const text = `
Hello ${userName},

This is a reminder that your EMDR consultation session is scheduled for ${sessionDate} at ${sessionTime}.

Join your session at: ${baseUrl}/video/${sessionId}

Please make sure you're ready 5 minutes before the scheduled time.

Best regards,
BrainBased EMDR Training Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #ff9800; color: white; padding: 20px; border-radius: 10px; text-align: center;">
      <h1 style="margin: 0;">Session Reminder</h1>
      <p style="margin: 10px 0 0 0;">Your session starts in ${timeText}</p>
    </div>
    
    <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin-top: 20px;">
      <p>Hello <strong>${userName}</strong>,</p>
      <p>This is a reminder that your EMDR consultation session is scheduled for:</p>
      
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <h3 style="color: #ff9800; margin: 0;">${sessionDate} at ${sessionTime}</h3>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}/video/${sessionId}" 
           style="background: #ff9800; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Join Session Now
        </a>
      </div>
      
      <p style="text-align: center; color: #666;">
        Please be ready 5 minutes before your scheduled time.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    return { subject, text, html };
  }

  private getSessionCompletionTemplate(
    studentName: string,
    sessionDuration: number,
    totalHours: number,
    consultantName: string
  ): EmailTemplate {
    const subject = 'EMDR Session Completed - Progress Updated';
    const remainingHours = Math.max(0, 40 - totalHours);
    const isComplete = totalHours >= 40;
    
    const text = `
Hello ${studentName},

Your EMDR consultation session with ${consultantName} has been completed and logged.

Session Details:
- Duration: ${sessionDuration} minutes
- Total Hours Completed: ${totalHours}/40 hours
- Remaining Hours: ${remainingHours} hours

${isComplete ? 'Congratulations! You have completed your 40-hour requirement and are eligible for certification!' : 'Keep up the great work on your certification journey!'}

Best regards,
BrainBased EMDR Training Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #4caf50; color: white; padding: 30px; border-radius: 10px; text-align: center;">
      <h1 style="margin: 0;">Session Completed!</h1>
    </div>
    
    <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin-top: 20px;">
      <p>Hello <strong>${studentName}</strong>,</p>
      <p>Your EMDR consultation session with <strong>${consultantName}</strong> has been completed and logged.</p>
      
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #4caf50; margin-top: 0;">Session Summary</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="margin: 10px 0;"><strong>Duration:</strong> ${sessionDuration} minutes</li>
          <li style="margin: 10px 0;"><strong>Total Hours:</strong> ${totalHours}/40 hours</li>
          <li style="margin: 10px 0;"><strong>Remaining:</strong> ${remainingHours} hours</li>
        </ul>
        
        <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <div style="width: ${(totalHours/40) * 100}%; height: 20px; background: #4caf50; border-radius: 10px;"></div>
          <p style="text-align: center; margin: 10px 0 0 0; font-weight: bold;">${Math.round((totalHours/40) * 100)}% Complete</p>
        </div>
      </div>
      
      ${isComplete ? `
        <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 8px; text-align: center;">
          <h3 style="color: #856404; margin-top: 0;">🎉 Congratulations!</h3>
          <p style="color: #856404; margin-bottom: 0;">You have completed your 40-hour requirement and are eligible for certification!</p>
        </div>
      ` : `
        <p style="text-align: center; color: #4caf50; font-weight: bold;">
          Keep up the great work on your certification journey!
        </p>
      `}
    </div>
  </div>
</body>
</html>
    `;

    return { subject, text, html };
  }

  private getCertificateAvailableTemplate(
    studentName: string,
    certificateUrl: string
  ): EmailTemplate {
    const subject = '🎉 Your EMDR Certificate is Ready!';
    
    const text = `
Hello ${studentName},

Congratulations! Your EMDR certification is now available for download.

You have successfully completed your 40-hour consultation requirement and are now certified in EMDR.

Download your certificate: ${certificateUrl}

Welcome to the community of certified EMDR practitioners!

Best regards,
BrainBased EMDR Training Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px;">🎉 Certificate Ready!</h1>
      <p style="margin: 10px 0 0 0; font-size: 18px;">Your EMDR Certification</p>
    </div>
    
    <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin-top: 20px;">
      <p>Hello <strong>${studentName}</strong>,</p>
      <p><strong>Congratulations!</strong> Your EMDR certification is now available for download.</p>
      
      <div style="background: #e8f5e8; border: 2px solid #4caf50; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <h3 style="color: #2e7d32; margin-top: 0;">🏆 Achievement Unlocked</h3>
        <p style="color: #2e7d32; margin-bottom: 0;">
          You have successfully completed your 40-hour consultation requirement and are now certified in EMDR.
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${certificateUrl}" 
           style="background: #4caf50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
          📄 Download Certificate
        </a>
      </div>
      
      <p style="text-align: center; color: #4caf50; font-weight: bold; font-size: 18px;">
        Welcome to the community of certified EMDR practitioners!
      </p>
    </div>
  </div>
</body>
</html>
    `;

    return { subject, text, html };
  }

  private getConsultantPaymentTemplate(
    consultantName: string,
    monthlyEarnings: number,
    sessionCount: number,
    paymentDate: string
  ): EmailTemplate {
    const subject = 'Monthly Payment Summary - BrainBased EMDR';
    
    const text = `
Hello ${consultantName},

Here is your monthly payment summary:

Payment Details:
- Sessions Completed: ${sessionCount}
- Total Earnings: $${monthlyEarnings.toFixed(2)}
- Payment Date: ${paymentDate}

Thank you for your dedication to EMDR training and supervision.

Best regards,
BrainBased EMDR Training Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #2563eb; color: white; padding: 30px; border-radius: 10px; text-align: center;">
      <h1 style="margin: 0;">Monthly Payment Summary</h1>
    </div>
    
    <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin-top: 20px;">
      <p>Hello <strong>${consultantName}</strong>,</p>
      <p>Here is your monthly payment summary:</p>
      
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #2563eb; margin-top: 0;">Payment Details</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="margin: 15px 0; font-size: 16px;"><strong>Sessions Completed:</strong> ${sessionCount}</li>
          <li style="margin: 15px 0; font-size: 18px;"><strong>Total Earnings:</strong> <span style="color: #4caf50; font-size: 24px;">$${monthlyEarnings.toFixed(2)}</span></li>
          <li style="margin: 15px 0; font-size: 16px;"><strong>Payment Date:</strong> ${paymentDate}</li>
        </ul>
      </div>
      
      <p style="text-align: center; color: #2563eb; font-style: italic;">
        Thank you for your dedication to EMDR training and supervision.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    return { subject, text, html };
  }
}

// Export singleton instance
export const twilioEmailService = new TwilioEmailService();
