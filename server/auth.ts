import { supabase } from './supabase';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export enum UserRole {
  STUDENT = 'student',
  CONSULTANT = 'consultant',
  ADMIN = 'admin'
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  profileImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  passwordHash?: string; // For internal use only
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

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // Compare password
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate user ID
  static generateUserId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Register new user (BYPASSING SUPABASE AUTH)
  static async register(userData: z.infer<typeof registerSchema>): Promise<{ user: User; token: string }> {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .single();

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(userData.password);

    // Insert user and return generated UUID
    const { data: insertedUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role,
          password_hash: passwordHash,
          email_verified: true,
          source: 'platform',
          created_at: new Date(),
          updated_at: new Date()
        }
      ])
      .select('*')
      .single();

    if (insertError || !insertedUser) {
      throw new Error(`Profile creation error: ${insertError?.message || 'Unknown error'}`);
    }

    const user: User = {
      id: insertedUser.id,
      email: insertedUser.email,
      firstName: insertedUser.first_name,
      lastName: insertedUser.last_name,
      role: insertedUser.role as UserRole,
      createdAt: new Date(insertedUser.created_at),
      updatedAt: new Date(insertedUser.updated_at)
    };

    // Create role-specific profile
    if (user.role === UserRole.STUDENT) {
      const { error: studentError } = await supabase
        .from('students')
        .insert([
          {
            user_id: user.id,
            course_completion_date: new Date(),
            total_verified_hours: 0,
            certification_status: 'in_progress',
            preferred_session_length: 60,
            consultation_preferences: {}
          }
        ]);

      if (studentError) {
        throw new Error(`Student profile creation error: ${studentError.message}`);
      }
    } else if (user.role === UserRole.CONSULTANT) {
      const { data: consultant, error: consultantError } = await supabase
        .from('consultants')
        .insert([
          {
            user_id: user.id,
            license_number: 'TEMP-' + String(user.id).slice(0, 8),
            specializations: ['EMDR'],
            hourly_rate: 150,
            is_active: true,
            years_experience: 5,
            total_hours_completed: 0,
            average_rating: 5.0
          }
        ])
        .select()
        .single();

      if (consultantError) {
        throw new Error(`Consultant profile creation error: ${consultantError.message}`);
      }

      // Set up default availability for new consultant
      if (consultant) {
        try {
          // Import the service here to avoid circular dependency
          const { schedulingService } = await import('./services/schedulingService');
          
          // Default schedule: Monday-Friday 9 AM to 5 PM (standard business hours)
          const defaultSchedule = {
            1: [{ startTime: '09:00', endTime: '17:00', isAvailable: true }], // Monday
            2: [{ startTime: '09:00', endTime: '17:00', isAvailable: true }], // Tuesday
            3: [{ startTime: '09:00', endTime: '17:00', isAvailable: true }], // Wednesday
            4: [{ startTime: '09:00', endTime: '17:00', isAvailable: true }], // Thursday
            5: [{ startTime: '09:00', endTime: '17:00', isAvailable: true }], // Friday
            0: [], // Sunday - no availability
            6: []  // Saturday - no availability
          };

          await schedulingService.setWeeklyAvailability(
            consultant.id,
            defaultSchedule,
            'America/New_York' // Default timezone - can be updated by consultant
          );
        } catch (availabilityError) {
          console.warn('Failed to set default availability for new consultant:', availabilityError);
          // Don't fail the registration if availability setup fails
        }
      }
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  // Login user (BYPASSING SUPABASE AUTH)
  static async login(email: string, password: string): Promise<{ user: User; token: string }> {
    // Account lockout simple guard
    // Note: For production, persist attempts in DB or cache. Here, rely on DB fields if present.
    // Get user from database
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!userData || !userData.password_hash) {
      throw new Error('Invalid login credentials');
    }

    // Verify password
    const isValid = await this.comparePassword(password, userData.password_hash);
    if (!isValid) {
      // Optional: increment failed_login_attempts
      try {
        await supabase
          .from('users')
          .update({ failed_login_attempts: (userData.failed_login_attempts || 0) + 1, last_failed_login_at: new Date() })
          .eq('id', userData.id);
      } catch {}
      throw new Error('Invalid login credentials');
    }

    // Reset failed attempts on success
    try {
      await supabase
        .from('users')
        .update({ failed_login_attempts: 0, last_login_at: new Date() })
        .eq('id', userData.id);
    } catch {}

    // Create user object
    const user: User = {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name,
      role: userData.role as UserRole,
      createdAt: new Date(userData.created_at),
      updatedAt: new Date(userData.updated_at)
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
      role: userData.role as UserRole,
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
      phone: studentData.phone,
      timezone: studentData.timezone,
      courseCompletionDate: new Date(studentData.course_completion_date),
      totalVerifiedHours: studentData.total_verified_hours,
      certificationStatus: studentData.certification_status,
      preferredSessionLength: studentData.preferred_session_length,
      consultationPreferences: studentData.consultation_preferences || {},
      createdAt: new Date(userData.created_at),
      updatedAt: new Date(userData.updated_at)
    };
  }

  // Get consultant profile
  static async getConsultantProfile(userId: string): Promise<Consultant | null> {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
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
      licenseNumber: consultantData.license_number,
      specializations: consultantData.specializations || [],
      hourlyRate: consultantData.hourly_rate,
      isActive: consultantData.is_active,
      bio: consultantData.bio,
      yearsExperience: consultantData.years_experience,
      totalHoursCompleted: consultantData.total_hours_completed,
      averageRating: consultantData.average_rating,
      createdAt: new Date(userData.created_at),
      updatedAt: new Date(userData.updated_at)
    };
  }

  // Update student profile
  static async updateStudentProfile(userId: string, profileData: z.infer<typeof studentProfileSchema>): Promise<Student> {
    const { error } = await supabase
      .from('students')
      .update({
        phone: profileData.phone,
        timezone: profileData.timezone,
        course_completion_date: profileData.courseCompletionDate,
        preferred_session_length: profileData.preferredSessionLength,
        consultation_preferences: profileData.consultationPreferences,
        updated_at: new Date()
      })
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
      .update({
        license_number: profileData.licenseNumber,
        specializations: profileData.specializations,
        hourly_rate: profileData.hourlyRate,
        bio: profileData.bio,
        years_experience: profileData.yearsExperience,
        updated_at: new Date()
      })
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

  // Logout (no server-side action needed for JWT)
  static async logout(userId: string): Promise<void> {
    // JWT tokens are stateless, so no server-side logout needed
    // Client should remove the token from storage
    console.log(`User ${userId} logged out`);
  }
}

// Middleware for token authentication
export const authenticateToken = (req: any, res: any, next: any) => {
  // Prefer HttpOnly cookie; fall back to Authorization header for backward compatibility
  const cookieToken = req.cookies?.bb_jwt as string | undefined;
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const token = cookieToken || headerToken;

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

// Middleware for role-based access
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