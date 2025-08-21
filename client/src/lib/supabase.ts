import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helper functions (BYPASSING SUPABASE AUTH)
export const auth = {
  // Sign up
  async signUp(email: string, password: string, userData: {
    firstName: string;
    lastName: string;
    role: 'student' | 'consultant' | 'admin';
  }) {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role
      }),
      credentials: 'include'
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { data: null, error: data };
    }

    // Store token after successful registration
    if (data.token) {
      localStorage.setItem('token', data.token);
    }

    return { data, error: null };
  },

  // Sign in
  async signIn(email: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { data: null, error: data };
    }

    // Store token after successful login
    if (data.token) {
      localStorage.setItem('token', data.token);
    }

    return { data, error: null };
  },

  // Sign out
  async signOut() {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const data = await response.json();
    
    // Always clear the token regardless of server response
    localStorage.removeItem('token');
    
    if (!response.ok) {
      return { error: data };
    }

    return { error: null };
  },

  // Reset password
  async resetPassword(email: string) {
    // TODO: Implement password reset functionality
    return { error: { message: 'Password reset not implemented yet' } };
  },

  // Get current user
  async getCurrentUser() {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/auth/me', {
      method: 'GET',
      headers,
      credentials: 'include'
    });

    const data = await response.json();
    
    if (!response.ok) {
      // If token is invalid, remove it
      if (response.status === 401) {
        localStorage.removeItem('token');
      }
      return { user: null, error: data };
    }

    return { user: data.user, error: null };
  },

  // Listen to auth changes (simplified for now)
  onAuthStateChange(callback: (event: string, session: any) => void) {
    // TODO: Implement proper auth state change listening
    // For now, just call the callback with the current state
    const token = localStorage.getItem('token');
    if (token) {
      callback('SIGNED_IN', { user: null });
    } else {
      callback('SIGNED_OUT', null);
    }
    
    // Return a cleanup function
    return () => {};
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