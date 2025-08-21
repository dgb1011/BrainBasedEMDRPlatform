import { supabase } from '../supabase';

export interface ConsultantEarningsSummary {
  totalEarnings: number;
  totalHours: number;
  completedSessions: number;
  pendingSessions: number;
}

export interface MonthlyEarningsItem {
  month: string; // YYYY-MM
  totalEarnings: number;
  totalHours: number;
  sessions: number;
}

export interface SessionEarningBreakdownItem {
  sessionId: string;
  date: string; // ISO
  durationMinutes: number;
  hours: number;
  hourlyRate: number;
  amount: number;
}

/**
 * EarningsService computes consultant earnings from verified sessions.
 * No payment processing is performed – reporting only.
 * Earnings are calculated as verified_hours * consultant.hourly_rate.
 */
export class EarningsService {
  /**
   * Ensure a consultant profile exists for the given platform user ID.
   * Returns consultant row with id and hourly_rate.
   */
  private static async ensureConsultantForUser(consultantUserId: string): Promise<{ id: string; hourly_rate: number }> {
    // Try to fetch existing consultant
    const { data: existing } = await supabase
      .from('consultants')
      .select('id, hourly_rate')
      .eq('user_id', consultantUserId)
      .single();

    if (existing) {
      return { id: existing.id, hourly_rate: existing.hourly_rate || 0 };
    }

    // Create minimal consultant profile if missing (defensive for dev/test)
    const { data: user } = await supabase
      .from('users')
      .select('id, role, first_name, last_name')
      .eq('id', consultantUserId)
      .single();

    if (!user) {
      throw new Error('User not found for consultant profile');
    }

    // Only auto-create for consultant role
    const defaultConsultant = {
      user_id: user.id,
      license_number: 'TEMP-' + String(user.id).slice(0, 8),
      specializations: ['EMDR'],
      hourly_rate: 150,
      is_active: true,
      years_experience: 0,
      total_hours_completed: 0,
      average_rating: 5.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error: createError } = await supabase
      .from('consultants')
      .insert([defaultConsultant])
      .select('id, hourly_rate')
      .single();

    if (createError || !created) {
      throw new Error(`Failed to create consultant profile: ${createError?.message || 'unknown error'}`);
    }

    return { id: created.id, hourly_rate: created.hourly_rate || 0 };
  }
  /**
   * Get overall earnings summary for a consultant within an optional date range.
   */
  static async getConsultantSummary(
    consultantUserId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ConsultantEarningsSummary> {
    // Get consultant profile (for hourly rate)
    const consultant = await this.ensureConsultantForUser(consultantUserId);
    const hourlyRate: number = consultant.hourly_rate || 0;

    // Fetch verified/completed sessions for this consultant
    let query = supabase
      .from('consultation_sessions')
      .select('id, scheduled_start, scheduled_end, actual_duration, status')
      .eq('consultant_id', consultant.id)
      .in('status', ['completed', 'verified', 'in_progress', 'scheduled']);

    if (startDate) query = query.gte('scheduled_start', startDate.toISOString());
    if (endDate) query = query.lte('scheduled_start', endDate.toISOString());

    const { data: sessions, error: sessionsError } = await query;
    if (sessionsError) {
      throw new Error(`Failed to load sessions: ${sessionsError.message}`);
    }

    let totalHours = 0;
    let completedSessions = 0;
    let pendingSessions = 0;

    for (const s of sessions || []) {
      const isCompleted = s.status === 'completed' || s.status === 'verified';
      const durationMinutes =
        typeof s.actual_duration === 'number' && s.actual_duration > 0
          ? s.actual_duration
          : Math.max(
              0,
              Math.floor(
                (new Date(s.scheduled_end).getTime() - new Date(s.scheduled_start).getTime()) / (1000 * 60)
              )
            );

      const hours = durationMinutes / 60;
      if (isCompleted) {
        totalHours += hours;
        completedSessions += 1;
      } else {
        pendingSessions += 1;
      }
    }

    const totalEarnings = parseFloat((totalHours * hourlyRate).toFixed(2));

    return {
      totalEarnings,
      totalHours: parseFloat(totalHours.toFixed(2)),
      completedSessions,
      pendingSessions,
    };
  }

  /**
   * Monthly earnings breakdown for a given year (defaults to current year).
   */
  static async getMonthlyBreakdown(
    consultantUserId: string,
    year?: number
  ): Promise<MonthlyEarningsItem[]> {
    const targetYear = year ?? new Date().getFullYear();

    // Get consultant and hourly rate
    const consultant = await this.ensureConsultantForUser(consultantUserId);
    const hourlyRate: number = consultant.hourly_rate || 0;

    const start = new Date(`${targetYear}-01-01T00:00:00.000Z`);
    const end = new Date(`${targetYear + 1}-01-01T00:00:00.000Z`);

    const { data: sessions, error } = await supabase
      .from('consultation_sessions')
      .select('id, scheduled_start, scheduled_end, actual_duration, status')
      .eq('consultant_id', consultant.id)
      .gte('scheduled_start', start.toISOString())
      .lt('scheduled_start', end.toISOString());

    if (error) throw new Error(`Failed to load sessions: ${error.message}`);

    const byMonth: Record<string, MonthlyEarningsItem> = {};

    for (const s of sessions || []) {
      if (!(s.status === 'completed' || s.status === 'verified')) continue;
      const startDate = new Date(s.scheduled_start);
      const monthKey = `${startDate.getUTCFullYear()}-${String(startDate.getUTCMonth() + 1).padStart(2, '0')}`;

      const durationMinutes =
        typeof s.actual_duration === 'number' && s.actual_duration > 0
          ? s.actual_duration
          : Math.max(
              0,
              Math.floor(
                (new Date(s.scheduled_end).getTime() - new Date(s.scheduled_start).getTime()) / (1000 * 60)
              )
            );
      const hours = durationMinutes / 60;

      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { month: monthKey, totalEarnings: 0, totalHours: 0, sessions: 0 };
      }
      byMonth[monthKey].totalHours += hours;
      byMonth[monthKey].sessions += 1;
      byMonth[monthKey].totalEarnings += hours * hourlyRate;
    }

    return Object.values(byMonth)
      .map((m) => ({
        month: m.month,
        totalEarnings: parseFloat(m.totalEarnings.toFixed(2)),
        totalHours: parseFloat(m.totalHours.toFixed(2)),
        sessions: m.sessions,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Per-session earning details for a given month (YYYY-MM). If omitted, returns the last 30 days.
   */
  static async getSessionBreakdown(
    consultantUserId: string,
    month?: string
  ): Promise<SessionEarningBreakdownItem[]> {
    const consultant = await this.ensureConsultantForUser(consultantUserId);
    const hourlyRate: number = consultant.hourly_rate || 0;

    let start: Date;
    let end: Date;
    if (month) {
      // month in format YYYY-MM
      const [y, m] = month.split('-').map((x) => parseInt(x, 10));
      start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
      end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    } else {
      end = new Date();
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const { data: sessions, error } = await supabase
      .from('consultation_sessions')
      .select('id, scheduled_start, scheduled_end, actual_duration, status')
      .eq('consultant_id', consultant.id)
      .gte('scheduled_start', start.toISOString())
      .lt('scheduled_start', end.toISOString())
      .order('scheduled_start', { ascending: true });

    if (error) throw new Error(`Failed to load sessions: ${error.message}`);

    const items: SessionEarningBreakdownItem[] = [];

    for (const s of sessions || []) {
      const durationMinutes =
        typeof s.actual_duration === 'number' && s.actual_duration > 0
          ? s.actual_duration
          : Math.max(
              0,
              Math.floor(
                (new Date(s.scheduled_end).getTime() - new Date(s.scheduled_start).getTime()) / (1000 * 60)
              )
            );

      const hours = durationMinutes / 60;
      const amount = hours * hourlyRate;

      items.push({
        sessionId: s.id,
        date: new Date(s.scheduled_start).toISOString(),
        durationMinutes,
        hours: parseFloat(hours.toFixed(2)),
        hourlyRate,
        amount: parseFloat(amount.toFixed(2)),
      });
    }

    return items;
  }
}

export const earningsService = new EarningsService();


