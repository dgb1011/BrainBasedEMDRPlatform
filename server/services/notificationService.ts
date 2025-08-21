import { supabase } from '../supabase';
import { twilioEmailService } from './twilioEmailService';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export enum NotificationType {
  SESSION_REMINDER = 'session_reminder',
  SESSION_COMPLETED = 'session_completed',
  CERTIFICATE_ISSUED = 'certificate_issued',
  HOURS_MILESTONE = 'hours_milestone',
  PAYMENT_RECEIVED = 'payment_received',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  CONSULTANT_APPROVED = 'consultant_approved',
  SCHEDULE_CHANGE = 'schedule_change'
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  sessionReminders: boolean;
  milestoneAlerts: boolean;
  paymentNotifications: boolean;
  systemUpdates: boolean;
}

export class NotificationService {
  
  /**
   * Create a new notification
   */
  static async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: any,
    expiresAt?: Date
  ): Promise<Notification> {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
        read: false,
        expires_at: expiresAt?.toISOString()
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create notification: ${error.message}`);
    }

    // Check user preferences and send external notifications
    await this.sendExternalNotifications(userId, type, title, message, data);

    return {
      id: notification.id,
      userId: notification.user_id,
      type: notification.type as NotificationType,
      title: notification.title,
      message: notification.message,
      data: notification.data ? JSON.parse(notification.data) : null,
      read: notification.read,
      createdAt: new Date(notification.created_at),
      expiresAt: notification.expires_at ? new Date(notification.expires_at) : undefined
    };
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    // Filter out expired notifications
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return (data || []).map(notification => ({
      id: notification.id,
      userId: notification.user_id,
      type: notification.type as NotificationType,
      title: notification.title,
      message: notification.message,
      data: notification.data ? JSON.parse(notification.data) : null,
      read: notification.read,
      createdAt: new Date(notification.created_at),
      expiresAt: notification.expires_at ? new Date(notification.expires_at) : undefined
    }));
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (error) {
      throw new Error(`Failed to get unread count: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Get or create notification preferences for a user
   */
  static async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch notification preferences: ${error.message}`);
    }

    if (!data) {
      // Create default preferences
      const defaultPrefs = {
        user_id: userId,
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true,
        session_reminders: true,
        milestone_alerts: true,
        payment_notifications: true,
        system_updates: true
      };

      const { data: created, error: createError } = await supabase
        .from('notification_preferences')
        .insert([defaultPrefs])
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create notification preferences: ${createError.message}`);
      }

      return this.mapPreferencesFromDb(created);
    }

    return this.mapPreferencesFromDb(data);
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const updateData: any = {};
    
    if (preferences.emailNotifications !== undefined) updateData.email_notifications = preferences.emailNotifications;
    if (preferences.smsNotifications !== undefined) updateData.sms_notifications = preferences.smsNotifications;
    if (preferences.pushNotifications !== undefined) updateData.push_notifications = preferences.pushNotifications;
    if (preferences.sessionReminders !== undefined) updateData.session_reminders = preferences.sessionReminders;
    if (preferences.milestoneAlerts !== undefined) updateData.milestone_alerts = preferences.milestoneAlerts;
    if (preferences.paymentNotifications !== undefined) updateData.payment_notifications = preferences.paymentNotifications;
    if (preferences.systemUpdates !== undefined) updateData.system_updates = preferences.systemUpdates;

    const { data, error } = await supabase
      .from('notification_preferences')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update notification preferences: ${error.message}`);
    }

    return this.mapPreferencesFromDb(data);
  }

  /**
   * Send external notifications based on user preferences
   */
  private static async sendExternalNotifications(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: any
  ): Promise<void> {
    try {
      const preferences = await this.getNotificationPreferences(userId);
      const { data: user } = await supabase
        .from('users')
        .select('email, first_name, last_name, phone')
        .eq('id', userId)
        .single();

      if (!user) return;

      // Email notifications
      if (preferences.emailNotifications && this.shouldSendEmailForType(type, preferences)) {
        await this.sendEmailNotification(user, type, title, message, data);
      }

      // SMS notifications (if phone number and preference enabled)
      if (preferences.smsNotifications && user.phone && this.shouldSendSMSForType(type, preferences)) {
        await this.sendSMSNotification(user.phone, title, message);
      }

    } catch (error) {
      console.error('Error sending external notifications:', error);
      // Don't throw - external notification failure shouldn't break the main flow
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(
    user: any,
    type: NotificationType,
    title: string,
    message: string,
    data?: any
  ): Promise<void> {
    const emailTemplate = this.getEmailTemplate(type, title, message, data);
    
    await twilioEmailService.sendEmail({
      to: user.email,
      subject: title,
      html: emailTemplate,
      data: {
        firstName: user.first_name,
        lastName: user.last_name,
        ...data
      }
    });
  }

  /**
   * Send SMS notification (placeholder - integrate with SMS service)
   */
  private static async sendSMSNotification(
    phone: string,
    title: string,
    message: string
  ): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`SMS to ${phone}: ${title} - ${message}`);
  }

  /**
   * Check if email should be sent for notification type
   */
  private static shouldSendEmailForType(type: NotificationType, preferences: NotificationPreferences): boolean {
    switch (type) {
      case NotificationType.SESSION_REMINDER:
        return preferences.sessionReminders;
      case NotificationType.HOURS_MILESTONE:
      case NotificationType.CERTIFICATE_ISSUED:
        return preferences.milestoneAlerts;
      case NotificationType.PAYMENT_RECEIVED:
        return preferences.paymentNotifications;
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return preferences.systemUpdates;
      default:
        return true;
    }
  }

  /**
   * Check if SMS should be sent for notification type
   */
  private static shouldSendSMSForType(type: NotificationType, preferences: NotificationPreferences): boolean {
    switch (type) {
      case NotificationType.SESSION_REMINDER:
        return preferences.sessionReminders;
      case NotificationType.SCHEDULE_CHANGE:
        return true; // Always send SMS for urgent schedule changes
      default:
        return false; // SMS only for urgent notifications
    }
  }

  /**
   * Get email template for notification type
   */
  private static getEmailTemplate(type: NotificationType, title: string, message: string, data?: any): string {
    const baseTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white;">
          <h1 style="margin: 0;">BrainBased EMDR</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Professional EMDR Consultation Platform</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">${title}</h2>
          <p style="color: #666; line-height: 1.6;">${message}</p>
          ${this.getTypeSpecificContent(type, data)}
        </div>
        <div style="padding: 20px; background: #333; color: white; text-align: center;">
          <p style="margin: 0; font-size: 14px;">© 2024 BrainBased EMDR. All rights reserved.</p>
        </div>
      </div>
    `;
    return baseTemplate;
  }

  /**
   * Get type-specific email content
   */
  private static getTypeSpecificContent(type: NotificationType, data?: any): string {
    switch (type) {
      case NotificationType.SESSION_REMINDER:
        return `
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #4f46e5; margin-top: 0;">Session Details</h3>
            <p><strong>Date:</strong> ${data?.sessionDate}</p>
            <p><strong>Time:</strong> ${data?.sessionTime}</p>
            <p><strong>Consultant:</strong> ${data?.consultantName}</p>
            <a href="${data?.sessionLink}" style="display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Join Session</a>
          </div>
        `;
      case NotificationType.CERTIFICATE_ISSUED:
        return `
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="color: #059669; margin-top: 0;">🎉 Congratulations!</h3>
            <p>Your EMDR certification has been issued.</p>
            <a href="${data?.certificateLink}" style="display: inline-block; background: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Download Certificate</a>
          </div>
        `;
      default:
        return '';
    }
  }

  /**
   * Map database preferences to interface
   */
  private static mapPreferencesFromDb(data: any): NotificationPreferences {
    return {
      userId: data.user_id,
      emailNotifications: data.email_notifications,
      smsNotifications: data.sms_notifications,
      pushNotifications: data.push_notifications,
      sessionReminders: data.session_reminders,
      milestoneAlerts: data.milestone_alerts,
      paymentNotifications: data.payment_notifications,
      systemUpdates: data.system_updates
    };
  }

  /**
   * Create milestone notifications
   */
  static async createMilestoneNotification(userId: string, hours: number): Promise<void> {
    const milestones = [10, 20, 30, 40];
    if (milestones.includes(hours)) {
      const title = hours === 40 ? 'Certification Eligible! 🎉' : `${hours} Hours Completed! 🎯`;
      const message = hours === 40 
        ? 'Congratulations! You have completed 40 consultation hours and are now eligible for EMDR certification.'
        : `Great progress! You have completed ${hours} consultation hours toward your EMDR certification.`;

      await this.createNotification(
        userId,
        NotificationType.HOURS_MILESTONE,
        title,
        message,
        { hours, milestone: true }
      );
    }
  }

  /**
   * Create session reminder notifications
   */
  static async createSessionReminder(sessionId: string, reminderMinutes: number = 60): Promise<void> {
    const { data: session, error } = await supabase
      .from('consultation_sessions')
      .select(`
        *,
        student:students(user_id, user:users(first_name, last_name, email)),
        consultant:consultants(user_id, user:users(first_name, last_name))
      `)
      .eq('id', sessionId)
      .single();

    if (error || !session) return;

    const sessionDate = new Date(session.scheduled_start);
    const reminderTime = new Date(sessionDate.getTime() - reminderMinutes * 60 * 1000);

    if (reminderTime > new Date()) {
      // Schedule reminder for student
      await this.createNotification(
        session.student.user_id,
        NotificationType.SESSION_REMINDER,
        'Upcoming EMDR Session',
        `You have an EMDR consultation session with ${session.consultant.user.first_name} ${session.consultant.user.last_name} in ${reminderMinutes} minutes.`,
        {
          sessionId,
          sessionDate: sessionDate.toLocaleDateString(),
          sessionTime: sessionDate.toLocaleTimeString(),
          consultantName: `${session.consultant.user.first_name} ${session.consultant.user.last_name}`,
          sessionLink: `/video/${sessionId}`
        },
        new Date(sessionDate.getTime() + 2 * 60 * 60 * 1000) // Expires 2 hours after session
      );

      // Schedule reminder for consultant
      await this.createNotification(
        session.consultant.user_id,
        NotificationType.SESSION_REMINDER,
        'Upcoming EMDR Session',
        `You have an EMDR consultation session with ${session.student.user.first_name} ${session.student.user.last_name} in ${reminderMinutes} minutes.`,
        {
          sessionId,
          sessionDate: sessionDate.toLocaleDateString(),
          sessionTime: sessionDate.toLocaleTimeString(),
          studentName: `${session.student.user.first_name} ${session.student.user.last_name}`,
          sessionLink: `/video/${sessionId}`
        },
        new Date(sessionDate.getTime() + 2 * 60 * 60 * 1000)
      );
    }
  }
}

export const notificationService = NotificationService;





