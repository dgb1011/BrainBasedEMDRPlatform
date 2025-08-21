import { supabase } from '../supabase';
import { addDays, format, isBefore } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { twilioEmailService } from './twilioEmailService';
import { twilioSmsService } from './twilioSmsService';

export interface WeeklySchedule {
  [dayOfWeek: number]: TimeSlot[]; // 0-6 (Sunday-Saturday)
}

export interface TimeSlot {
  id?: string;
  startTime: string; // "09:00"
  endTime: string; // "10:00"
  maxSessions?: number;
  isAvailable: boolean;
}

export interface ConsultantAvailability {
  consultantId: string;
  weeklySchedule: WeeklySchedule;
  timezone: string;
  bufferMinutes: number;
  maxDailyHours: number;
  maxWeeklyHours: number;
  advanceBookingDays: number;
  minimumNoticeHours: number;
  autoApprove: boolean;
  blockedDates: string[]; // ISO date strings
}

export interface BookingPreferences {
  preferredDuration: number; // minutes
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening';
  preferredConsultants?: string[];
  preferredDays?: number[]; // 0-6
  timezone: string;
}

export interface AvailableSlot {
  consultantId: string;
  consultantName: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  duration: number;
  isOptimal: boolean;
  score: number; // For intelligent recommendations
}

export interface SessionBooking {
  studentId: string;
  consultantId: string;
  startTime: Date;
  endTime: Date;
  sessionType: 'consultation' | 'practice' | 'supervision';
  notes?: string;
  timezone: string;
}

export class SchedulingService {
  /**
   * Set consultant's weekly availability
   */
  async setWeeklyAvailability(
    consultantId: string, 
    schedule: WeeklySchedule,
    timezone: string
  ): Promise<void> {
    try {
      // Clear existing availability
      await supabase
        .from('consultant_availability_slots')
        .delete()
        .eq('consultant_id', consultantId)
        .eq('is_recurring', true);

      // Insert new availability slots
      const slots = [];
      for (const [dayOfWeek, timeSlots] of Object.entries(schedule)) {
        for (const slot of timeSlots) {
          if (slot.isAvailable) {
            slots.push({
              consultant_id: consultantId,
              day_of_week: parseInt(dayOfWeek),
              start_time: slot.startTime,
              end_time: slot.endTime,
              max_sessions: slot.maxSessions || 1,
              is_recurring: true,
              is_available: true,
              timezone: timezone
            });
          }
        }
      }

      if (slots.length > 0) {
        const { error } = await supabase
          .from('consultant_availability_slots')
          .insert(slots);

        if (error) throw error;
      }

      // Update consultant preferences
      await supabase
        .from('consultant_preferences')
        .upsert({
          consultant_id: consultantId,
          timezone: timezone,
          updated_at: new Date()
        });

    } catch (error) {
      console.error('Error setting weekly availability:', error);
      throw error;
    }
  }

  /**
   * Set exception dates (blocked dates)
   */
  async setExceptionDates(
    consultantId: string, 
    dates: Date[]
  ): Promise<void> {
    try {
      // Clear existing exceptions
      await supabase
        .from('consultant_blocked_dates')
        .delete()
        .eq('consultant_id', consultantId);

      // Insert new blocked dates
      if (dates.length > 0) {
        const blockedDates = dates.map(date => ({
          consultant_id: consultantId,
          blocked_date: format(date, 'yyyy-MM-dd'),
          reason: 'Time off'
        }));

        const { error } = await supabase
          .from('consultant_blocked_dates')
          .insert(blockedDates);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error setting exception dates:', error);
      throw error;
    }
  }

  /**
   * Find available slots based on student preferences
   */
  async findAvailableSlots(
    studentId: string,
    preferences: BookingPreferences,
    dateRange?: { start: Date; end: Date }
  ): Promise<AvailableSlot[]> {
    try {
      // Default date range: next 30 days
      const startDate = dateRange?.start || new Date();
      const endDate = dateRange?.end || addDays(new Date(), 30);

      // Get all consultants or filtered by preference
      const consultantQuery = supabase
        .from('consultants')
        .select(`
          *,
          user:users(*),
          availability:consultant_availability_slots(*),
          blocked_dates:consultant_blocked_dates(*),
          preferences:consultant_preferences(*)
        `)
        .eq('is_active', true);

      if (preferences.preferredConsultants?.length) {
        consultantQuery.in('id', preferences.preferredConsultants);
      }

      const { data: consultants, error } = await consultantQuery;
      if (error) throw error;

      const availableSlots: AvailableSlot[] = [];

      // Process each consultant
      for (const consultant of consultants || []) {
        const consultantTimezone = consultant.preferences?.[0]?.timezone || 'UTC';
        
        // Generate slots for each day in range
        let currentDate = startDate;
        while (isBefore(currentDate, endDate)) {
          const dayOfWeek = currentDate.getDay();
          
          // Check if this date is blocked
          const isBlocked = consultant.blocked_dates?.some(
            (blocked: any) => blocked.blocked_date === format(currentDate, 'yyyy-MM-dd')
          );

          if (!isBlocked) {
            // Get availability for this day of week
            const daySlots = consultant.availability?.filter(
              (slot: any) => slot.day_of_week === dayOfWeek && slot.is_available
            ) || [];

            for (const slot of daySlots) {
              // Convert times to student's timezone
              const slotStart = this.combineDateAndTime(currentDate, slot.start_time, consultantTimezone);
              const slotEnd = this.combineDateAndTime(currentDate, slot.end_time, consultantTimezone);
              
              // Check if slot is already booked
              const isBooked = await this.isSlotBooked(
                consultant.id,
                slotStart,
                slotEnd
              );

              if (!isBooked) {
                // Calculate slot score for intelligent recommendations
                const score = this.calculateSlotScore(
                  slotStart,
                  consultant,
                  preferences,
                  studentId
                );

                availableSlots.push({
                  consultantId: consultant.id,
                  consultantName: `${consultant.user.first_name} ${consultant.user.last_name}`,
                  date: currentDate,
                  startTime: slotStart,
                  endTime: slotEnd,
                  duration: (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60),
                  isOptimal: score > 80,
                  score
                });
              }
            }
          }

          currentDate = addDays(currentDate, 1);
        }
      }

      // Sort by score (best matches first)
      return availableSlots.sort((a, b) => b.score - a.score);

    } catch (error) {
      console.error('Error finding available slots:', error);
      throw error;
    }
  }

  /**
   * Book a session
   */
  async bookSession(booking: SessionBooking): Promise<any> {
    try {
      // Validate slot is still available
      const isBooked = await this.isSlotBooked(
        booking.consultantId,
        booking.startTime,
        booking.endTime
      );

      if (isBooked) {
        throw new Error('This time slot is no longer available');
      }

      // Create the session
      const { data: session, error } = await supabase
        .from('consultation_sessions')
        .insert({
          student_id: booking.studentId,
          consultant_id: booking.consultantId,
          scheduled_start: booking.startTime,
          scheduled_end: booking.endTime,
          session_type: booking.sessionType,
          notes: booking.notes,
          status: 'scheduled'
        })
        .select(`
          *,
          student:students(user:users(*)),
          consultant:consultants(user:users(*))
        `)
        .single();

      if (error) throw error;

      // Send confirmation emails
      await this.sendBookingConfirmations(session);

      // Schedule reminders
      await this.scheduleSessionReminders(session.id);

      return session;

    } catch (error) {
      console.error('Error booking session:', error);
      throw error;
    }
  }

  /**
   * Send booking confirmation emails
   */
  async sendBookingConfirmations(session: any): Promise<void> {
    const studentName = `${session.student.user.first_name} ${session.student.user.last_name}`;
    const consultantName = `${session.consultant.user.first_name} ${session.consultant.user.last_name}`;
    const sessionDate = new Date(session.scheduled_start).toLocaleDateString();
    const sessionTime = new Date(session.scheduled_start).toLocaleTimeString();

    // Send confirmation to student
    await twilioEmailService.sendSessionConfirmation(
      session.student.user.email,
      studentName,
      sessionDate,
      sessionTime,
      consultantName,
      session.id
    );

    // Send SMS confirmation to student (if phone number available)
    if (session.student.phone) {
      await twilioSmsService.sendSessionConfirmation(
        session.student.phone,
        studentName,
        sessionDate,
        sessionTime,
        consultantName
      );
    }
  }

  /**
   * Schedule reminder emails for a session
   */
  async scheduleSessionReminders(sessionId: string): Promise<void> {
    // Get session details
    const { data: session } = await supabase
      .from('consultation_sessions')
      .select(`
        *,
        student:students(user:users(first_name, email, phone)),
        consultant:consultants(user:users(first_name, last_name))
      `)
      .eq('id', sessionId)
      .single();

    if (!session) return;

    const studentName = session.student.user.first_name;
    const sessionDate = new Date(session.scheduled_start).toLocaleDateString();
    const sessionTime = new Date(session.scheduled_start).toLocaleTimeString();

    // Send 24-hour reminder
    await twilioEmailService.sendSessionReminder(
      session.student.user.email,
      studentName,
      sessionDate,
      sessionTime,
      sessionId,
      '24h'
    );

    // Send 30-minute reminder
    await twilioEmailService.sendSessionReminder(
      session.student.user.email,
      studentName,
      sessionDate,
      sessionTime,
      sessionId,
      '30min'
    );

    // Send SMS reminders if phone available
    if (session.student.user.phone) {
      await twilioSmsService.sendSessionReminder(
        session.student.user.phone,
        studentName,
        sessionDate,
        sessionTime,
        '24h'
      );
      
      await twilioSmsService.sendSessionReminder(
        session.student.user.phone,
        studentName,
        sessionDate,
        sessionTime,
        '30min'
      );
    }
  }

  /**
   * Handle session rescheduling
   */
  async rescheduleSession(
    sessionId: string, 
    newStartTime: Date,
    newEndTime: Date,
    reason?: string
  ): Promise<any> {
    try {
      // Get original session
      const { data: session, error: fetchError } = await supabase
        .from('consultation_sessions')
        .select(`
          *,
          student:students(user:users(*)),
          consultant:consultants(user:users(*))
        `)
        .eq('id', sessionId)
        .single();

      if (fetchError) throw fetchError;

      // Check if new slot is available
      const isBooked = await this.isSlotBooked(
        session.consultant_id,
        newStartTime,
        newEndTime
      );

      if (isBooked) {
        throw new Error('The new time slot is not available');
      }

      // Update session
      const { data: updatedSession, error: updateError } = await supabase
        .from('consultation_sessions')
        .update({
          scheduled_start: newStartTime,
          scheduled_end: newEndTime,
          updated_at: new Date()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log rescheduling
      await supabase
        .from('session_history')
        .insert({
          session_id: sessionId,
          action: 'rescheduled',
          old_time: session.scheduled_start,
          new_time: newStartTime,
          reason: reason,
          created_at: new Date()
        });

      // Send notification emails
      await this.sendReschedulingNotifications(session, newStartTime);

      // Reschedule reminders
      await this.cancelSessionReminders(sessionId);
      await this.scheduleSessionReminders(sessionId);

      return updatedSession;

    } catch (error) {
      console.error('Error rescheduling session:', error);
      throw error;
    }
  }

  /**
   * Cancel a session
   */
  async cancelSession(
    sessionId: string,
    reason: string,
    cancelledBy: 'student' | 'consultant'
  ): Promise<void> {
    try {
      // Get session details
      const { data: session, error: fetchError } = await supabase
        .from('consultation_sessions')
        .select(`
          *,
          student:students(user:users(*)),
          consultant:consultants(user:users(*))
        `)
        .eq('id', sessionId)
        .single();

      if (fetchError) throw fetchError;

      // Update session status
      const { error: updateError } = await supabase
        .from('consultation_sessions')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_by: cancelledBy,
          cancelled_at: new Date()
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Cancel reminders
      await this.cancelSessionReminders(sessionId);

      // Send cancellation notifications
      await this.sendCancellationNotifications(session, reason, cancelledBy);

      // Check if student needs to be added to waitlist
      if (cancelledBy === 'consultant') {
        await this.addToWaitlist(session.student_id, session.scheduled_start);
      }

    } catch (error) {
      console.error('Error cancelling session:', error);
      throw error;
    }
  }

  /**
   * Sync with external calendar (Google/Outlook)
   */
  async syncGoogleCalendar(consultantId: string, accessToken: string): Promise<void> {
    // Implementation for Google Calendar sync
    // This would use Google Calendar API to:
    // 1. Fetch consultant's calendar events
    // 2. Block times in our system
    // 3. Add our bookings to their calendar
    console.log('Google Calendar sync not yet implemented');
  }

  /**
   * Get consultant's availability for a specific date range
   */
  async getConsultantAvailability(
    consultantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      // Get consultant's availability rules
      const { data: availability } = await supabase
        .from('consultant_availability_slots')
        .select('*')
        .eq('consultant_id', consultantId)
        .eq('is_available', true);

      // Get blocked dates
      const { data: blockedDates } = await supabase
        .from('consultant_blocked_dates')
        .select('*')
        .eq('consultant_id', consultantId)
        .gte('blocked_date', format(startDate, 'yyyy-MM-dd'))
        .lte('blocked_date', format(endDate, 'yyyy-MM-dd'));

      // Get existing bookings
      const { data: bookings } = await supabase
        .from('consultation_sessions')
        .select('*')
        .eq('consultant_id', consultantId)
        .in('status', ['scheduled', 'in_progress'])
        .gte('scheduled_start', startDate.toISOString())
        .lte('scheduled_start', endDate.toISOString());

      return [
        ...(availability || []),
      ];

    } catch (error) {
      console.error('Error getting consultant availability:', error);
      throw error;
    }
  }

  /**
   * Helper: Check if a slot is already booked
   */
  private async isSlotBooked(
    consultantId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('consultation_sessions')
      .select('id')
      .eq('consultant_id', consultantId)
      .in('status', ['scheduled', 'in_progress'])
      .or(`scheduled_start.gte.${startTime.toISOString()},scheduled_start.lt.${endTime.toISOString()}`)
      .or(`scheduled_end.gt.${startTime.toISOString()},scheduled_end.lte.${endTime.toISOString()}`);

    return (data && data.length > 0) || false;
  }

  /**
   * Helper: Calculate slot score for intelligent recommendations
   */
  private calculateSlotScore(
    slotTime: Date,
    consultant: any,
    preferences: BookingPreferences,
    studentId: string
  ): number {
    let score = 50; // Base score

    // Time of day preference
    const hour = slotTime.getHours();
    if (preferences.preferredTimeOfDay) {
      if (preferences.preferredTimeOfDay === 'morning' && hour >= 6 && hour < 12) score += 20;
      else if (preferences.preferredTimeOfDay === 'afternoon' && hour >= 12 && hour < 17) score += 20;
      else if (preferences.preferredTimeOfDay === 'evening' && hour >= 17 && hour < 22) score += 20;
    }

    // Day of week preference
    if (preferences.preferredDays?.includes(slotTime.getDay())) {
      score += 15;
    }

    // Consultant rating
    if (consultant.average_rating > 4.5) score += 10;

    // Previous sessions with this consultant (continuity bonus)
    // This would require checking session history
    score += 5;

    // Sooner availability bonus
    const daysUntilSession = Math.floor((slotTime.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilSession <= 3) score += 10;
    else if (daysUntilSession <= 7) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Helper: Combine date and time string
   */
  private combineDateAndTime(date: Date, timeStr: string, timezone: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    // Construct a date at the consultant's local time, then convert to UTC
    const localDate = new Date(year, month, day, hours, minutes, 0, 0);
    // Interpret this local wall time in the given IANA timezone and convert to UTC Date
    return fromZonedTime(localDate, timezone);
  }

  /**
   * Helper: Generate calendar link
   */
  private generateCalendarLink(session: any): string {
    const start = new Date(session.scheduled_start);
    const end = new Date(session.scheduled_end);
    const title = `EMDR Consultation Session`;
    const details = `Consultant: ${session.consultant.user.first_name} ${session.consultant.user.last_name}`;
    const location = 'Online - BrainBased EMDR Platform';

    // Google Calendar link
    const googleUrl = new URL('https://calendar.google.com/calendar/render');
    googleUrl.searchParams.append('action', 'TEMPLATE');
    googleUrl.searchParams.append('text', title);
    googleUrl.searchParams.append('dates', `${format(start, "yyyyMMdd'T'HHmmss")}/${format(end, "yyyyMMdd'T'HHmmss")}`);
    googleUrl.searchParams.append('details', details);
    googleUrl.searchParams.append('location', location);

    return googleUrl.toString();
  }

  /**
   * Helper: Send rescheduling notifications
   */
  private async sendReschedulingNotifications(session: any, newStartTime: Date): Promise<void> {
    // Implementation for rescheduling emails
    console.log('Rescheduling notifications to be implemented');
  }

  /**
   * Helper: Cancel session reminders
   */
  private async cancelSessionReminders(sessionId: string): Promise<void> {
    await supabase
      .from('scheduled_emails')
      .update({ sent: true })
      .eq('data->>sessionId', sessionId)
      .eq('sent', false);
  }

  /**
   * Helper: Send cancellation notifications
   */
  private async sendCancellationNotifications(
    session: any, 
    reason: string, 
    cancelledBy: string
  ): Promise<void> {
    // Implementation for cancellation emails
    console.log('Cancellation notifications to be implemented');
  }

  /**
   * Helper: Add student to waitlist
   */
  private async addToWaitlist(studentId: string, preferredTime: Date): Promise<void> {
    await supabase
      .from('session_waitlist')
      .insert({
        student_id: studentId,
        preferred_time: preferredTime,
        created_at: new Date()
      });
  }
}

// Export singleton instance
export const schedulingService = new SchedulingService();
