import twilio from 'twilio';

export interface SmsMessage {
  to: string;
  message: string;
  mediaUrl?: string;
}

export class TwilioSmsService {
  private client: twilio.Twilio;
  private fromNumber: string;
  private isEnabled: boolean;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
    this.isEnabled = process.env.ENABLE_SMS_NOTIFICATIONS === 'true';

    if (!this.isEnabled) {
      console.log('SMS notifications are disabled');
      return;
    }

    if (!accountSid || !authToken || !this.fromNumber) {
      console.warn('Twilio SMS configuration missing. SMS notifications will be disabled.');
      this.isEnabled = false;
      return;
    }

    this.client = twilio(accountSid, authToken);
    console.log('Twilio SMS service initialized successfully');
  }

  /**
   * Send SMS message
   */
  async sendSms(smsData: SmsMessage): Promise<boolean> {
    if (!this.isEnabled) {
      console.log('SMS disabled, skipping message to:', smsData.to);
      return false;
    }

    try {
      const message = await this.client.messages.create({
        body: smsData.message,
        from: this.fromNumber,
        to: smsData.to,
        mediaUrl: smsData.mediaUrl ? [smsData.mediaUrl] : undefined
      });

      console.log(`SMS sent successfully to ${smsData.to}, SID: ${message.sid}`);
      return true;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  /**
   * Send session reminder SMS
   */
  async sendSessionReminder(
    phoneNumber: string,
    userName: string,
    sessionDate: string,
    sessionTime: string,
    reminderType: '24h' | '30min' = '30min'
  ): Promise<boolean> {
    const timeText = reminderType === '24h' ? '24 hours' : '30 minutes';
    const message = `Hi ${userName}, your EMDR consultation session is scheduled for ${sessionDate} at ${sessionTime} (in ${timeText}). Please be ready to join on time. - BrainBased EMDR`;

    return this.sendSms({
      to: phoneNumber,
      message
    });
  }

  /**
   * Send session confirmation SMS
   */
  async sendSessionConfirmation(
    phoneNumber: string,
    userName: string,
    sessionDate: string,
    sessionTime: string,
    consultantName: string
  ): Promise<boolean> {
    const message = `Hi ${userName}, your EMDR session with ${consultantName} is confirmed for ${sessionDate} at ${sessionTime}. You'll receive a reminder before the session. - BrainBased EMDR`;

    return this.sendSms({
      to: phoneNumber,
      message
    });
  }

  /**
   * Send session completion SMS
   */
  async sendSessionCompletion(
    phoneNumber: string,
    userName: string,
    sessionDuration: number,
    totalHours: number
  ): Promise<boolean> {
    const remainingHours = Math.max(0, 40 - totalHours);
    const isComplete = totalHours >= 40;

    let message;
    if (isComplete) {
      message = `Congratulations ${userName}! You've completed your 40-hour EMDR requirement. Your session (${sessionDuration} min) has been logged. Certificate processing will begin shortly. - BrainBased EMDR`;
    } else {
      message = `Hi ${userName}, your ${sessionDuration}-minute EMDR session has been completed and logged. Total: ${totalHours}/40 hours. ${remainingHours} hours remaining. Keep going! - BrainBased EMDR`;
    }

    return this.sendSms({
      to: phoneNumber,
      message
    });
  }

  /**
   * Send certificate ready SMS
   */
  async sendCertificateReady(
    phoneNumber: string,
    userName: string
  ): Promise<boolean> {
    const message = `🎉 Congratulations ${userName}! Your EMDR certificate is ready for download. Log in to your account to access it. Welcome to the certified EMDR community! - BrainBased EMDR`;

    return this.sendSms({
      to: phoneNumber,
      message
    });
  }

  /**
   * Send session cancellation SMS
   */
  async sendSessionCancellation(
    phoneNumber: string,
    userName: string,
    sessionDate: string,
    sessionTime: string,
    reason?: string
  ): Promise<boolean> {
    const reasonText = reason ? ` Reason: ${reason}` : '';
    const message = `Hi ${userName}, your EMDR session scheduled for ${sessionDate} at ${sessionTime} has been cancelled.${reasonText} Please reschedule at your convenience. - BrainBased EMDR`;

    return this.sendSms({
      to: phoneNumber,
      message
    });
  }

  /**
   * Send consultant notification SMS
   */
  async sendConsultantNotification(
    phoneNumber: string,
    consultantName: string,
    notificationType: 'new_booking' | 'cancellation' | 'reminder',
    studentName: string,
    sessionDate: string,
    sessionTime: string
  ): Promise<boolean> {
    let message;

    switch (notificationType) {
      case 'new_booking':
        message = `Hi ${consultantName}, you have a new EMDR session booking with ${studentName} on ${sessionDate} at ${sessionTime}. Please confirm your availability. - BrainBased EMDR`;
        break;
      case 'cancellation':
        message = `Hi ${consultantName}, your EMDR session with ${studentName} on ${sessionDate} at ${sessionTime} has been cancelled. - BrainBased EMDR`;
        break;
      case 'reminder':
        message = `Hi ${consultantName}, reminder: EMDR session with ${studentName} starts in 30 minutes (${sessionTime}). Please be ready to begin. - BrainBased EMDR`;
        break;
      default:
        return false;
    }

    return this.sendSms({
      to: phoneNumber,
      message
    });
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCode(
    phoneNumber: string,
    verificationCode: string
  ): Promise<boolean> {
    const message = `Your BrainBased EMDR verification code is: ${verificationCode}. This code expires in 10 minutes. Do not share this code with anyone.`;

    return this.sendSms({
      to: phoneNumber,
      message
    });
  }

  /**
   * Send payment confirmation SMS to consultant
   */
  async sendPaymentConfirmation(
    phoneNumber: string,
    consultantName: string,
    amount: number,
    sessionCount: number
  ): Promise<boolean> {
    const message = `Hi ${consultantName}, your monthly payment of $${amount.toFixed(2)} for ${sessionCount} EMDR sessions has been processed. Thank you for your dedication! - BrainBased EMDR`;

    return this.sendSms({
      to: phoneNumber,
      message
    });
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Basic validation for US/international phone numbers
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/\D/g, ''));
  }

  /**
   * Format phone number for Twilio
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digits
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing (assuming US +1)
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // Return as-is if already formatted
    return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`;
  }

  /**
   * Get SMS delivery status
   */
  async getSmsStatus(messageSid: string): Promise<any> {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const message = await this.client.messages(messageSid).fetch();
      return {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        body: message.body,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };
    } catch (error) {
      console.error('Error fetching SMS status:', error);
      return null;
    }
  }
}

// Export singleton instance
export const twilioSmsService = new TwilioSmsService();
