import { supabase } from '../supabase';
import { UserRole } from '../auth';

export interface SessionVerification {
  sessionId: string;
  studentId: string;
  consultantId: string;
  studentConfirmed: boolean;
  consultantConfirmed: boolean;
  sessionDuration: number; // in minutes
  verificationDate?: Date;
  notes?: string;
}

export interface VerificationResult {
  verified: boolean;
  hoursCounted: number;
  message: string;
}

export class VerificationService {
  /**
   * Process session attendance verification
   * Both student and consultant must confirm for hours to count
   */
  static async processSessionAttendance(sessionId: string): Promise<VerificationResult> {
    try {
      // Get session details
      const session = await this.getConsultationSession(sessionId);
      if (!session) {
        return {
          verified: false,
          hoursCounted: 0,
          message: 'Session not found'
        };
      }

      // Check if both parties have confirmed
      if (!session.studentConfirmed || !session.consultantConfirmed) {
        return {
          verified: false,
          hoursCounted: 0,
          message: 'Both student and consultant must confirm attendance'
        };
      }

      // Calculate session duration
      const duration = this.calculateSessionDuration(session.scheduledStart, session.scheduledEnd);
      
      // Add verified hours to student
      await this.addVerifiedHours(session.studentId, duration);
      
      // Update session verification status
      await this.updateSessionVerification(sessionId, true, duration);
      
      // Check if student has reached 40-hour milestone
      await this.checkMilestone(session.studentId);

      return {
        verified: true,
        hoursCounted: duration,
        message: `Session verified. ${duration} hours added to student progress.`
      };
    } catch (error) {
      console.error('Session verification error:', error);
      throw error;
    }
  }

  /**
   * Student confirms attendance
   */
  static async confirmStudentAttendance(sessionId: string, studentId: string): Promise<void> {
    const { error } = await supabase
      .from('consultation_sessions')
      .update({
        student_confirmed: true,
        updated_at: new Date(),
      })
      .eq('id', sessionId)
      .eq('student_id', studentId);

    if (error) {
      throw new Error(`Student confirmation error: ${error.message}`);
    }

    // Process verification if both parties have confirmed
    await this.processSessionAttendance(sessionId);
  }

  /**
   * Consultant confirms attendance
   */
  static async confirmConsultantAttendance(sessionId: string, consultantId: string): Promise<void> {
    const { error } = await supabase
      .from('consultation_sessions')
      .update({
        consultant_confirmed: true,
        updated_at: new Date(),
      })
      .eq('id', sessionId)
      .eq('consultant_id', consultantId);

    if (error) {
      throw new Error(`Consultant confirmation error: ${error.message}`);
    }

    // Process verification if both parties have confirmed
    await this.processSessionAttendance(sessionId);
  }

  /**
   * Get consultation session details
   */
  static async getConsultationSession(sessionId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('consultation_sessions')
      .select(`
        *,
        student:students(*),
        consultant:consultants(*)
      `)
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Calculate session duration in hours
   */
  static calculateSessionDuration(startTime: string | Date, endTime: string | Date): number {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60); // Convert to hours
    return Math.round(durationHours * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Add verified hours to student
   */
  static async addVerifiedHours(studentId: string, hours: number): Promise<void> {
    // Get current hours
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('total_verified_hours')
      .eq('id', studentId)
      .single();

    if (fetchError) {
      throw new Error(`Fetch student hours error: ${fetchError.message}`);
    }

    const currentHours = student?.total_verified_hours || 0;
    const newTotal = currentHours + hours;

    // Update student hours
    const { error: updateError } = await supabase
      .from('students')
      .update({
        total_verified_hours: newTotal,
        updated_at: new Date(),
      })
      .eq('id', studentId);

    if (updateError) {
      throw new Error(`Update student hours error: ${updateError.message}`);
    }

    console.log(`Added ${hours} hours to student ${studentId}. New total: ${newTotal}`);
  }

  /**
   * Update session verification status
   */
  static async updateSessionVerification(sessionId: string, verified: boolean, duration: number): Promise<void> {
    const { error } = await supabase
      .from('consultation_sessions')
      .update({
        is_verified: verified,
        hours_towards_consultation: duration,
        status: verified ? 'completed' : 'scheduled',
        updated_at: new Date(),
      })
      .eq('id', sessionId);

    if (error) {
      throw new Error(`Update session verification error: ${error.message}`);
    }
  }

  /**
   * Check if student has reached 40-hour milestone
   */
  static async checkMilestone(studentId: string): Promise<void> {
    const { data: student, error } = await supabase
      .from('students')
      .select('total_verified_hours, certification_status')
      .eq('id', studentId)
      .single();

    if (error || !student) {
      throw new Error(`Check milestone error: ${error?.message || 'Student not found'}`);
    }

    const totalHours = student.total_verified_hours || 0;

    if (totalHours >= 40 && student.certification_status !== 'completed') {
      // Student has reached 40-hour milestone
      await this.triggerCertificationProcess(studentId);
    } else if (totalHours >= 35) {
      // Send milestone warning (5 hours remaining)
      await this.sendMilestoneWarning(studentId, totalHours);
    }
  }

  /**
   * Trigger certification process when 40 hours are reached
   */
  static async triggerCertificationProcess(studentId: string): Promise<void> {
    // Update student status
    const { error: updateError } = await supabase
      .from('students')
      .update({
        certification_status: 'completed',
        updated_at: new Date(),
      })
      .eq('id', studentId);

    if (updateError) {
      throw new Error(`Update certification status error: ${updateError.message}`);
    }

    // Trigger certificate generation
    try {
      const { certificateService } = await import('./certificateService');
      await certificateService.generateCertificate(studentId);
    } catch (err) {
      console.error('Failed to generate certificate automatically:', err);
    }
  }

  /**
   * Send milestone warning when approaching 40 hours
   */
  static async sendMilestoneWarning(studentId: string, currentHours: number): Promise<void> {
    const remainingHours = 40 - currentHours;
    
    // TODO: Send email notification
    console.log(`Student ${studentId} has ${remainingHours} hours remaining until certification.`);
    
    // This will be implemented when we add email automation
    // await EmailService.sendMilestoneWarning(studentId, remainingHours);
  }

  /**
   * Get verification status for a session
   */
  static async getSessionVerificationStatus(sessionId: string): Promise<SessionVerification | null> {
    const session = await this.getConsultationSession(sessionId);
    if (!session) {
      return null;
    }

    return {
      sessionId: session.id,
      studentId: session.student_id,
      consultantId: session.consultant_id,
      studentConfirmed: session.student_confirmed || false,
      consultantConfirmed: session.consultant_confirmed || false,
      sessionDuration: this.calculateSessionDuration(session.scheduled_start, session.scheduled_end),
      verificationDate: session.is_verified ? new Date(session.updated_at) : undefined,
      notes: session.notes,
    };
  }

  /**
   * Get student's verification progress
   */
  static async getStudentVerificationProgress(studentId: string): Promise<{
    totalHours: number;
    remainingHours: number;
    completionPercentage: number;
    sessionsCompleted: number;
    sessionsPending: number;
  }> {
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('total_verified_hours')
      .eq('id', studentId)
      .single();

    if (studentError) {
      throw new Error(`Get student progress error: ${studentError.message}`);
    }

    const totalHours = student?.total_verified_hours || 0;
    const remainingHours = Math.max(0, 40 - totalHours);
    const completionPercentage = Math.min((totalHours / 40) * 100, 100);

    // Get session counts
    const { data: sessions, error: sessionsError } = await supabase
      .from('consultation_sessions')
      .select('status, is_verified')
      .eq('student_id', studentId);

    if (sessionsError) {
      throw new Error(`Get sessions error: ${sessionsError.message}`);
    }

    const sessionsCompleted = sessions?.filter(s => s.is_verified).length || 0;
    const sessionsPending = sessions?.filter(s => !s.is_verified && s.status === 'completed').length || 0;

    return {
      totalHours,
      remainingHours,
      completionPercentage,
      sessionsCompleted,
      sessionsPending,
    };
  }
} 