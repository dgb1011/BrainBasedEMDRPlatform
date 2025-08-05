import jwt from 'jsonwebtoken';
import { supabase } from './supabase';
import { z } from 'zod';

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// User roles
export enum UserRole {
  STUDENT = 'student',
  CONSULTANT = 'consultant',
  ADMIN = 'admin'
}

// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  profileImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Student extends User {
  role: UserRole.STUDENT;
  phone?: string;
  timezone?: string;
  courseCompletionDate: Date;
  totalVerifiedHours: number;
  certificationStatus: 'in_progress' | 'completed' | 'pending';
  preferredSessionLength: number;
  consultationPreferences: Record<string, any>;
}

export interface Consultant extends User {
  role: UserRole.CONSULTANT;
  licenseNumber: string;
  specializations: string[];
  hourlyRate: number;
  isActive: boolean;
  bio?: string;
  yearsExperience: number;
  totalHoursCompleted: number;
  averageRating: number;
}

export interface Admin extends User {
  role: UserRole.ADMIN;
  permissions: string[];
}

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.nativeEnum(UserRole)
});

export const studentProfileSchema = z.object({
  phone: z.string().optional(),
  timezone: z.string().optional(),
  courseCompletionDate: z.date(),
  preferredSessionLength: z.number().min(30).max(120),
  consultationPreferences: z.record(z.any()).optional()
});

export const consultantProfileSchema = z.object({
  licenseNumber: z.string().min(1),
  specializations: z.array(z.string()),
  hourlyRate: z.number().min(0),
  bio: z.string().optional(),
  yearsExperience: z.number().min(0)
});

// JWT Token interface
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// Authentication functions
export class AuthService {
  // Generate JWT token
  static generateToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }

  // Verify JWT token
  static verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  // Register new user
  static async register(userData: z.infer<typeof registerSchema>): Promise<{ user: User; token: string }> {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role
        }
      }
    });

    if (authError) {
      throw new Error(`Auth error: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Failed to create user');
    }

    // Create user profile in database
    const user: User = {
      id: authData.user.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert user profile based on role (using correct column names)
    const { error: profileError } = await supabase
      .from('users')
      .insert([{
        id: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        role: user.role,
        created_at: user.createdAt,
        updated_at: user.updatedAt
      }]);

    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Profile creation error: ${profileError.message}`);
    }

    // Create role-specific profile
    if (userData.role === UserRole.STUDENT) {
      const { error: studentError } = await supabase
        .from('students')
        .insert([{
          user_id: user.id,
          course_completion_date: new Date(),
          total_verified_hours: 0,
          certification_status: 'in_progress',
          preferred_session_length: 60,
          consultation_preferences: {}
        }]);

      if (studentError) {
        throw new Error(`Student profile creation error: ${studentError.message}`);
      }
    } else if (userData.role === UserRole.CONSULTANT) {
      const { error: consultantError } = await supabase
        .from('consultants')
        .insert([{
          user_id: user.id,
          license_number: 'TEMP-' + user.id.slice(0, 8),
          specializations: ['General EMDR'],
          hourly_rate: 150,
          is_active: true,
          years_experience: 5,
          total_hours_completed: 0,
          average_rating: 5.0
        }]);

      if (consultantError) {
        throw new Error(`Consultant profile creation error: ${consultantError.message}`);
      }
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  // Login user
  static async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      throw new Error(`Login error: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('User not found');
    }

    // Get user profile from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      throw new Error('User profile not found');
    }

    const user: User = {
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      profileImageUrl: userData.profileImageUrl,
      createdAt: new Date(userData.createdAt),
      updatedAt: new Date(userData.updatedAt)
    };

    const token = this.generateToken(user);
    return { user, token };
  }

  // Get user by ID
  static async getUserById(userId: string): Promise<User | null> {
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !userData) {
      return null;
    }

    return {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name,
      role: userData.role,
      profileImageUrl: userData.profile_image_url,
      createdAt: new Date(userData.created_at),
      updatedAt: new Date(userData.updated_at)
    };
  }

  // Get student profile
  static async getStudentProfile(userId: string): Promise<Student | null> {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('role', UserRole.STUDENT)
      .single();

    if (userError || !userData) {
      return null;
    }

    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (studentError || !studentData) {
      return null;
    }

    return {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name,
      role: UserRole.STUDENT,
      profileImageUrl: userData.profile_image_url,
      createdAt: new Date(userData.created_at),
      updatedAt: new Date(userData.updated_at),
      phone: studentData.phone,
      timezone: studentData.timezone,
      courseCompletionDate: new Date(studentData.course_completion_date),
      totalVerifiedHours: studentData.total_verified_hours,
      certificationStatus: studentData.certification_status,
      preferredSessionLength: studentData.preferred_session_length,
      consultationPreferences: studentData.consultation_preferences
    };
  }

  // Get consultant profile
  static async getConsultantProfile(userId: string): Promise<Consultant | null> {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('role', UserRole.CONSULTANT)
      .single();

    if (userError || !userData) {
      return null;
    }

    const { data: consultantData, error: consultantError } = await supabase
      .from('consultants')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (consultantError || !consultantData) {
      return null;
    }

    return {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name,
      role: UserRole.CONSULTANT,
      profileImageUrl: userData.profile_image_url,
      createdAt: new Date(userData.created_at),
      updatedAt: new Date(userData.updated_at),
      licenseNumber: consultantData.license_number,
      specializations: consultantData.specializations,
      hourlyRate: consultantData.hourly_rate,
      isActive: consultantData.is_active,
      bio: consultantData.bio,
      yearsExperience: consultantData.years_experience,
      totalHoursCompleted: consultantData.total_hours_completed,
      averageRating: consultantData.average_rating
    };
  }

  // Update student profile
  static async updateStudentProfile(userId: string, profileData: z.infer<typeof studentProfileSchema>): Promise<Student> {
    const { error } = await supabase
      .from('students')
      .update(profileData)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Profile update error: ${error.message}`);
    }

    const updatedProfile = await this.getStudentProfile(userId);
    if (!updatedProfile) {
      throw new Error('Failed to retrieve updated profile');
    }

    return updatedProfile;
  }

  // Update consultant profile
  static async updateConsultantProfile(userId: string, profileData: z.infer<typeof consultantProfileSchema>): Promise<Consultant> {
    const { error } = await supabase
      .from('consultants')
      .update(profileData)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Profile update error: ${error.message}`);
    }

    const updatedProfile = await this.getConsultantProfile(userId);
    if (!updatedProfile) {
      throw new Error('Failed to retrieve updated profile');
    }

    return updatedProfile;
  }

  // Logout user
  static async logout(userId: string): Promise<void> {
    await supabase.auth.admin.signOut(userId);
  }
}

// Middleware for authentication
export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const payload = AuthService.verifyToken(token);
  if (!payload) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  req.user = payload;
  next();
};

// Middleware for role-based access control
export const requireRole = (roles: UserRole[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
}; 