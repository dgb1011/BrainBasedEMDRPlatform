import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helper functions
export const auth = {
  // Sign up
  async signUp(email: string, password: string, userData: {
    firstName: string;
    lastName: string;
    role: 'student' | 'consultant' | 'admin';
  }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role
        }
      }
    });

    return { data, error };
  },

  // Sign in
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    return { data, error };
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Reset password
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });
    return { error };
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // Listen to auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Database helper functions
export const db = {
  // Get user profile
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    return { data, error };
  },

  // Get student profile
  async getStudentProfile(userId: string) {
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        user:users(*)
      `)
      .eq('user_id', userId)
      .single();

    return { data, error };
  },

  // Get consultant profile
  async getConsultantProfile(userId: string) {
    const { data, error } = await supabase
      .from('consultants')
      .select(`
        *,
        user:users(*)
      `)
      .eq('user_id', userId)
      .single();

    return { data, error };
  },

  // Update student profile
  async updateStudentProfile(userId: string, updates: any) {
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error };
  },

  // Update consultant profile
  async updateConsultantProfile(userId: string, updates: any) {
    const { data, error } = await supabase
      .from('consultants')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error };
  },

  // Get consultation sessions
  async getConsultationSessions(filters: {
    studentId?: string;
    consultantId?: string;
    status?: string;
    limit?: number;
  }) {
    let query = supabase
      .from('consultation_sessions')
      .select(`
        *,
        student:students(
          *,
          user:users(*)
        ),
        consultant:consultants(
          *,
          user:users(*)
        )
      `);

    if (filters.studentId) {
      query = query.eq('student_id', filters.studentId);
    }

    if (filters.consultantId) {
      query = query.eq('consultant_id', filters.consultantId);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query.order('scheduled_start', { ascending: true });

    return { data, error };
  },

  // Create consultation session
  async createConsultationSession(sessionData: any) {
    const { data, error } = await supabase
      .from('consultation_sessions')
      .insert([sessionData])
      .select()
      .single();

    return { data, error };
  },

  // Update consultation session
  async updateConsultationSession(sessionId: string, updates: any) {
    const { data, error } = await supabase
      .from('consultation_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    return { data, error };
  }
};

// Storage helper functions
export const storage = {
  // Upload file
  async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file);

    return { data, error };
  },

  // Get file URL
  getFileUrl(bucket: string, path: string) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  },

  // Delete file
  async deleteFile(bucket: string, path: string) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    return { error };
  }
}; 