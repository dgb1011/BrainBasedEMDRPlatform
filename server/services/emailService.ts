import { twilioEmailService } from './twilioEmailService';
import { supabase } from '../supabase';

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface UserEmailData {
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'consultant' | 'admin';
  userId: string;
}

export interface SessionEmailData {
  sessionId: string;
  sessionDate: string;
  sessionTime: string;
  consultantName?: string;
  studentName?: string;
  sessionLink: string;
  sessionDuration: number;
}

export interface MilestoneEmailData {
  hours: number;
  totalHours: number;
  remainingHours: number;
  isCertificationEligible: boolean;
}

export class EmailService {
  
  /**
   * Send welcome email to new users
   */
  static async sendWelcomeEmail(userData: UserEmailData, source: 'kajabi' | 'platform' = 'platform'): Promise<void> {
    try {
      const template = this.getWelcomeEmailTemplate(userData, source);
      
      await twilioEmailService.sendEmail({
        to: userData.email,
        subject: template.subject,
        html: template.html,
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          source
        }
      });

      // Mark welcome email as sent
      await this.markWelcomeEmailSent(userData.userId);
      
      console.log(`✅ Welcome email sent to ${userData.email} (${userData.role})`);
    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${userData.email}:`, error);
      throw error;
    }
  }

  /**
   * Send session confirmation email
   */
  static async sendSessionConfirmationEmail(
    userData: UserEmailData, 
    sessionData: SessionEmailData,
    isStudent: boolean = true
  ): Promise<void> {
    try {
      const template = this.getSessionConfirmationTemplate(userData, sessionData, isStudent);
      
      await twilioEmailService.sendEmail({
        to: userData.email,
        subject: template.subject,
        html: template.html,
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          sessionData,
          isStudent
        }
      });

      console.log(`✅ Session confirmation email sent to ${userData.email}`);
    } catch (error) {
      console.error(`❌ Failed to send session confirmation email to ${userData.email}:`, error);
      throw error;
    }
  }

  /**
   * Send session reminder email
   */
  static async sendSessionReminderEmail(
    userData: UserEmailData,
    sessionData: SessionEmailData,
    reminderMinutes: number = 60
  ): Promise<void> {
    try {
      const template = this.getSessionReminderTemplate(userData, sessionData, reminderMinutes);
      
      await twilioEmailService.sendEmail({
        to: userData.email,
        subject: template.subject,
        html: template.html,
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          sessionData,
          reminderMinutes
        }
      });

      console.log(`✅ Session reminder email sent to ${userData.email} (${reminderMinutes}min before)`);
    } catch (error) {
      console.error(`❌ Failed to send session reminder email to ${userData.email}:`, error);
      throw error;
    }
  }

  /**
   * Send milestone achievement email
   */
  static async sendMilestoneEmail(userData: UserEmailData, milestoneData: MilestoneEmailData): Promise<void> {
    try {
      const template = this.getMilestoneTemplate(userData, milestoneData);
      
      await twilioEmailService.sendEmail({
        to: userData.email,
        subject: template.subject,
        html: template.html,
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          milestoneData
        }
      });

      console.log(`✅ Milestone email sent to ${userData.email} (${milestoneData.hours} hours)`);
    } catch (error) {
      console.error(`❌ Failed to send milestone email to ${userData.email}:`, error);
      throw error;
    }
  }

  /**
   * Send certification completion email
   */
  static async sendCertificationEmail(userData: UserEmailData, certificateUrl: string): Promise<void> {
    try {
      const template = this.getCertificationTemplate(userData, certificateUrl);
      
      await twilioEmailService.sendEmail({
        to: userData.email,
        subject: template.subject,
        html: template.html,
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          certificateUrl
        }
      });

      console.log(`✅ Certification email sent to ${userData.email}`);
    } catch (error) {
      console.error(`❌ Failed to send certification email to ${userData.email}:`, error);
      throw error;
    }
  }

  /**
   * Send account setup completion email
   */
  static async sendAccountSetupEmail(userData: UserEmailData): Promise<void> {
    try {
      const template = this.getAccountSetupTemplate(userData);
      
      await twilioEmailService.sendEmail({
        to: userData.email,
        subject: template.subject,
        html: template.html,
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role
        }
      });

      // Mark account setup as completed
      await this.markAccountSetupCompleted(userData.userId);
      
      console.log(`✅ Account setup email sent to ${userData.email}`);
    } catch (error) {
      console.error(`❌ Failed to send account setup email to ${userData.email}:`, error);
      throw error;
    }
  }

  /**
   * Mark welcome email as sent in database
   */
  private static async markWelcomeEmailSent(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ welcome_email_sent: true })
        .eq('id', userId);
      
      if (error) {
        console.log('⚠️  Could not mark welcome email as sent:', error.message);
      }
    } catch (error) {
      console.log('⚠️  Error marking welcome email as sent');
    }
  }

  /**
   * Mark account setup as completed in database
   */
  private static async markAccountSetupCompleted(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ account_setup_completed: true })
        .eq('id', userId);
      
      if (error) {
        console.log('⚠️  Could not mark account setup as completed:', error.message);
      }
    } catch (error) {
      console.log('⚠️  Error marking account setup as completed');
    }
  }

  /**
   * Get welcome email template
   */
  private static getWelcomeEmailTemplate(userData: UserEmailData, source: 'kajabi' | 'platform'): EmailTemplate {
    const roleText = this.getRoleDisplayText(userData.role);
    const sourceText = source === 'kajabi' ? 'your EMDR course purchase' : 'the platform';
    
    return {
      subject: `Welcome to BrainBased EMDR Platform, ${userData.firstName}! 🎉`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to BrainBased EMDR! 🎉</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Professional EMDR Consultation Platform</p>
          </div>
          
          <div style="padding: 40px; background: white;">
            <h2 style="color: #333; margin-top: 0;">Hello ${userData.firstName} ${userData.lastName}!</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Welcome to the BrainBased EMDR Platform! You're now part of our professional community of EMDR practitioners and students.
            </p>
            
            <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #4f46e5;">
              <h3 style="color: #4f46e5; margin-top: 0;">Your Role: ${roleText}</h3>
              <p style="color: #4f46e5; margin: 0; font-weight: 500;">
                You've been registered as a <strong>${roleText}</strong> on our platform.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              ${source === 'kajabi' ? 
                'Since you completed your EMDR course purchase, you can now:' : 
                'You can now:'
              }
            </p>
            
            <ul style="color: #666; line-height: 1.6; font-size: 16px;">
              <li>Complete your profile setup</li>
              <li>Access your personalized dashboard</li>
              <li>${userData.role === 'student' ? 'Book consultation sessions with our certified consultants' : 'Manage your availability and sessions'}</li>
              <li>Track your progress and achievements</li>
              <li>Receive important notifications and updates</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings" 
                 style="display: inline-block; background: #4f46e5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Complete Your Profile Setup
              </a>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h4 style="color: #333; margin-top: 0;">Next Steps:</h4>
              <ol style="color: #666; line-height: 1.6;">
                <li><strong>Complete Profile:</strong> Add your details, preferences, and contact information</li>
                <li><strong>Verify Account:</strong> Ensure your email and phone are verified</li>
                <li><strong>Explore Dashboard:</strong> Familiarize yourself with the platform features</li>
                ${userData.role === 'student' ? '<li><strong>Book Sessions:</strong> Schedule your first consultation session</li>' : ''}
                ${userData.role === 'consultant' ? '<li><strong>Set Availability:</strong> Configure your consultation hours</li>' : ''}
              </ol>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              If you have any questions or need assistance, our support team is here to help. 
              You can reach us at <a href="mailto:support@brainbasedemdr.com" style="color: #4f46e5;">support@brainbasedemdr.com</a>
            </p>
          </div>
          
          <div style="padding: 20px; background: #333; color: white; text-align: center;">
            <p style="margin: 0; font-size: 14px;">© 2024 BrainBased EMDR. All rights reserved.</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.8;">
              This email was sent to ${userData.email} as part of your BrainBased EMDR platform registration.
            </p>
          </div>
        </div>
      `
    };
  }

  /**
   * Get session confirmation email template
   */
  private static getSessionConfirmationTemplate(
    userData: UserEmailData, 
    sessionData: SessionEmailData,
    isStudent: boolean
  ): EmailTemplate {
    const otherPartyName = isStudent ? sessionData.consultantName : sessionData.studentName;
    const sessionType = isStudent ? 'consultation' : 'session';
    
    return {
      subject: `EMDR Session Confirmed - ${sessionData.sessionDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Session Confirmed! ✅</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your EMDR ${sessionType} has been scheduled</p>
          </div>
          
          <div style="padding: 40px; background: white;">
            <h2 style="color: #333; margin-top: 0;">Hello ${userData.firstName}!</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Your EMDR ${sessionType} has been successfully scheduled. Here are the details:
            </p>
            
            <div style="background: #f0f4ff; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #059669;">
              <h3 style="color: #059669; margin-top: 0;">Session Details</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                <div>
                  <strong style="color: #333;">Date:</strong><br>
                  <span style="color: #666;">${sessionData.sessionDate}</span>
                </div>
                <div>
                  <strong style="color: #333;">Time:</strong><br>
                  <span style="color: #666;">${sessionData.sessionTime}</span>
                </div>
                <div>
                  <strong style="color: #333;">Duration:</strong><br>
                  <span style="color: #666;">${sessionData.sessionDuration} minutes</span>
                </div>
                <div>
                  <strong style="color: #333;">${isStudent ? 'Consultant' : 'Student'}:</strong><br>
                  <span style="color: #666;">${otherPartyName}</span>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${sessionData.sessionLink}" 
                 style="display: inline-block; background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Join Session
              </a>
            </div>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
              <h4 style="color: #856404; margin-top: 0;">Important Reminders:</h4>
              <ul style="color: #856404; line-height: 1.6; margin: 0;">
                <li>Please join the session 5 minutes before the scheduled time</li>
                <li>Ensure you have a stable internet connection</li>
                <li>Find a quiet, private space for your session</li>
                <li>Have your session materials ready if needed</li>
              </ul>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              You'll receive a reminder email 1 hour before your session. 
              If you need to reschedule or have any questions, please contact us as soon as possible.
            </p>
          </div>
          
          <div style="padding: 20px; background: #333; color: white; text-align: center;">
            <p style="margin: 0; font-size: 14px;">© 2024 BrainBased EMDR. All rights reserved.</p>
          </div>
        </div>
      `
    };
  }

  /**
   * Get session reminder email template
   */
  private static getSessionReminderTemplate(
    userData: UserEmailData,
    sessionData: SessionEmailData,
    reminderMinutes: number
  ): EmailTemplate {
    return {
      subject: `Reminder: EMDR Session in ${reminderMinutes} minutes`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 30px; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Session Reminder! ⏰</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your EMDR session starts soon</p>
          </div>
          
          <div style="padding: 40px; background: white;">
            <h2 style="color: #333; margin-top: 0;">Hello ${userData.firstName}!</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              This is a friendly reminder that your EMDR consultation session starts in <strong>${reminderMinutes} minutes</strong>.
            </p>
            
            <div style="background: #fff3cd; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
              <h3 style="color: #856404; margin-top: 0;">Session Details</h3>
              <p style="color: #856404; margin: 5px 0;"><strong>Date:</strong> ${sessionData.sessionDate}</p>
              <p style="color: #856404; margin: 5px 0;"><strong>Time:</strong> ${sessionData.sessionTime}</p>
              <p style="color: #856404; margin: 5px 0;"><strong>Duration:</strong> ${sessionData.sessionDuration} minutes</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${sessionData.sessionLink}" 
                 style="display: inline-block; background: #ff6b6b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Join Session Now
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Please ensure you're ready and have a quiet, private space for your session. 
              We look forward to seeing you!
            </p>
          </div>
          
          <div style="padding: 20px; background: #333; color: white; text-align: center;">
            <p style="margin: 0; font-size: 14px;">© 2024 BrainBased EMDR. All rights reserved.</p>
          </div>
        </div>
      `
    };
  }

  /**
   * Get milestone achievement email template
   */
  private static getMilestoneTemplate(userData: UserEmailData, milestoneData: MilestoneEmailData): EmailTemplate {
    const isCertificationEligible = milestoneData.isCertificationEligible;
    const title = isCertificationEligible ? '🎉 Certification Eligible!' : `🎯 ${milestoneData.hours} Hours Completed!`;
    
    return {
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">${title}</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Congratulations on your progress!</p>
          </div>
          
          <div style="padding: 40px; background: white;">
            <h2 style="color: #333; margin-top: 0;">Hello ${userData.firstName}!</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              ${isCertificationEligible ? 
                '🎉 Congratulations! You have completed all 40 consultation hours and are now eligible for EMDR certification.' :
                `🎯 Great progress! You have completed ${milestoneData.hours} consultation hours toward your EMDR certification.`
              }
            </p>
            
            <div style="background: #d1fae5; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #059669;">
              <h3 style="color: #065f46; margin-top: 0;">Your Progress</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                <div>
                  <strong style="color: #065f46;">Hours Completed:</strong><br>
                  <span style="color: #065f46; font-size: 18px; font-weight: 600;">${milestoneData.totalHours}</span>
                </div>
                <div>
                  <strong style="color: #065f46;">Hours Remaining:</strong><br>
                  <span style="color: #065f46; font-size: 18px; font-weight: 600;">${milestoneData.remainingHours}</span>
                </div>
              </div>
              
              <div style="margin-top: 20px;">
                <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
                  <div style="background: #059669; height: 100%; width: ${(milestoneData.totalHours / 40) * 100}%; transition: width 0.3s ease;"></div>
                </div>
                <p style="color: #065f46; margin: 5px 0 0 0; font-size: 14px; text-align: center;">
                  ${Math.round((milestoneData.totalHours / 40) * 100)}% Complete
                </p>
              </div>
            </div>
            
            ${isCertificationEligible ? `
              <div style="background: #fef3c7; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                <h3 style="color: #92400e; margin-top: 0;">🎉 Next Steps to Certification</h3>
                <ol style="color: #92400e; line-height: 1.6;">
                  <li>Submit your final case study and reflection documents</li>
                  <li>Complete the certification evaluation form</li>
                  <li>Receive your official EMDR certification</li>
                  <li>Get added to our certified practitioners directory</li>
                </ol>
              </div>
            ` : `
              <div style="background: #f0f4ff; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #4f46e5;">
                <h3 style="color: #3730a3; margin-top: 0;">Keep Going!</h3>
                <p style="color: #3730a3; line-height: 1.6;">
                  You're making excellent progress! Only ${milestoneData.remainingHours} more hours until you're eligible for certification.
                </p>
              </div>
            `}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
                 style="display: inline-block; background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Your Progress
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Thank you for your dedication to EMDR practice. We're here to support you every step of the way!
            </p>
          </div>
          
          <div style="padding: 20px; background: #333; color: white; text-align: center;">
            <p style="margin: 0; font-size: 14px;">© 2024 BrainBased EMDR. All rights reserved.</p>
          </div>
        </div>
      `
    };
  }

  /**
   * Get certification completion email template
   */
  private static getCertificationTemplate(userData: UserEmailData, certificateUrl: string): EmailTemplate {
    return {
      subject: '🎉 Your EMDR Certification is Ready!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Certification Complete!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Congratulations on your EMDR certification!</p>
          </div>
          
          <div style="padding: 40px; background: white;">
            <h2 style="color: #333; margin-top: 0;">Congratulations ${userData.firstName}!</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              You have successfully completed all requirements for your EMDR certification. 
              This is a significant achievement that represents your dedication and commitment to professional excellence.
            </p>
            
            <div style="background: #d1fae5; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #059669;">
              <h3 style="color: #065f46; margin-top: 0;">Your Achievement</h3>
              <p style="color: #065f46; line-height: 1.6;">
                <strong>EMDR Certification Status:</strong> ✅ Certified<br>
                <strong>Total Hours Completed:</strong> 40 hours<br>
                <strong>Certification Date:</strong> ${new Date().toLocaleDateString()}<br>
                <strong>Issuing Organization:</strong> BrainBased EMDR
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${certificateUrl}" 
                 style="display: inline-block; background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Download Your Certificate
              </a>
            </div>
            
            <div style="background: #f0f4ff; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #4f46e5;">
              <h3 style="color: #3730a3; margin-top: 0;">What's Next?</h3>
              <ul style="color: #3730a3; line-height: 1.6;">
                <li>You'll be added to our certified practitioners directory</li>
                <li>Access to advanced EMDR resources and materials</li>
                <li>Invitations to continuing education opportunities</li>
                <li>Professional networking with other certified practitioners</li>
              </ul>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Welcome to the community of certified EMDR practitioners! Your expertise and dedication 
              will make a positive impact on the lives of many clients.
            </p>
          </div>
          
          <div style="padding: 20px; background: #333; color: white; text-align: center;">
            <p style="margin: 0; font-size: 14px;">© 2024 BrainBased EMDR. All rights reserved.</p>
          </div>
        </div>
      `
    };
  }

  /**
   * Get account setup completion email template
   */
  private static getAccountSetupTemplate(userData: UserEmailData): EmailTemplate {
    return {
      subject: '✅ Your BrainBased EMDR Account Setup is Complete!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Account Setup Complete! ✅</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">You're all set to use the platform</p>
          </div>
          
          <div style="padding: 40px; background: white;">
            <h2 style="color: #333; margin-top: 0;">Hello ${userData.firstName}!</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Great news! Your BrainBased EMDR platform account setup is now complete. 
              You have full access to all platform features and are ready to begin your EMDR journey.
            </p>
            
            <div style="background: #f0f4ff; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #4f46e5;">
              <h3 style="color: #3730a3; margin-top: 0;">Your Account Status</h3>
              <p style="color: #3730a3; line-height: 1.6;">
                <strong>Profile:</strong> ✅ Complete<br>
                <strong>Preferences:</strong> ✅ Configured<br>
                <strong>Notifications:</strong> ✅ Enabled<br>
                <strong>Role:</strong> ${this.getRoleDisplayText(userData.role)}
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
                 style="display: inline-block; background: #4f46e5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Go to Your Dashboard
              </a>
            </div>
            
            <div style="background: #fef3c7; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin-top: 0;">Ready to Get Started?</h3>
              <p style="color: #92400e; line-height: 1.6;">
                Your account is fully configured and ready for use. Explore the platform features, 
                customize your preferences, and begin your EMDR consultation journey!
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              If you have any questions or need assistance, our support team is here to help. 
              Welcome to BrainBased EMDR!
            </p>
          </div>
          
          <div style="padding: 20px; background: #333; color: white; text-align: center;">
            <p style="margin: 0; font-size: 14px;">© 2024 BrainBased EMDR. All rights reserved.</p>
          </div>
        </div>
      `
    };
  }

  /**
   * Get role display text
   */
  private static getRoleDisplayText(role: string): string {
    switch (role) {
      case 'student':
        return 'EMDR Student';
      case 'consultant':
        return 'EMDR Consultant';
      case 'admin':
        return 'Platform Administrator';
      default:
        return 'Platform User';
    }
  }
}
