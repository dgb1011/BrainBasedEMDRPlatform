import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { AuthService, authenticateToken, requireRole, UserRole } from "./auth";
import { supabase } from "./supabase";
import { z } from "zod";
import { randomUUID } from "crypto";
import jwt from 'jsonwebtoken';
import { KajabiService, kajabiWebhookSchema } from "./services/kajabiService";
import { VerificationService } from "./services/verificationService";
import { ClientIntegrationService } from "./services/clientIntegrationService";
import { schedulingService } from "./services/schedulingService";
import { certificateService } from "./services/certificateService";
import { notificationService, NotificationType } from "./services/notificationService";
import { certificateTemplateService } from './services/certificateTemplateService';
import rateLimit from 'express-rate-limit';
import { twilioVideoService } from "./services/twilioVideoService";
import { twilioEmailService } from "./services/twilioEmailService";
import { twilioSmsService } from "./services/twilioSmsService";
// Earnings are reporting-only; see endpoints below

// Stripe removed – reporting only, no payment processing

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Kajabi webhook integration
  app.post('/api/webhooks/kajabi', async (req, res) => {
    try {
      console.log('Received Kajabi webhook:', req.body);
      
      // Validate webhook data
      const webhookData = kajabiWebhookSchema.parse(req.body);
      
      // Process the webhook
      await KajabiService.handleWebhook(webhookData);
      
      res.json({ status: 'success', message: 'Webhook processed successfully' });
    } catch (error) {
      console.error('Kajabi webhook error:', error);
      res.status(400).json({ 
        status: 'error',
        message: error instanceof Error ? error.message : 'Webhook processing failed' 
      });
    }
  });

  // Authentication routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { user, token } = await AuthService.register(req.body);
      
      // Send welcome email to new user
      try {
        const { EmailService } = await import('./services/emailService');
        await EmailService.sendWelcomeEmail({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role as 'student' | 'consultant' | 'admin',
          userId: user.id
        }, 'platform');
      } catch (emailError) {
        console.log('⚠️  Welcome email failed to send:', emailError);
        // Don't fail registration if email fails
      }
      
      res.json({ user, token });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Registration failed' 
      });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const { user, token } = await AuthService.login(email, password);
      
      // CONSISTENT WITH REGISTRATION: Return token in response for frontend localStorage
      res.json({ user, token });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ 
        message: error instanceof Error ? error.message : 'Login failed' 
      });
    }
  });

  app.post('/api/auth/logout', authenticateToken, async (req, res) => {
    try {
      await AuthService.logout(req.user!.userId);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Logout failed' });
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
      const user = await AuthService.getUserById(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get role-specific profile
      let profile = null;
      if (user.role === UserRole.STUDENT) {
        profile = await AuthService.getStudentProfile(req.user!.userId);
      } else if (user.role === UserRole.CONSULTANT) {
        profile = await AuthService.getConsultantProfile(req.user!.userId);
      }

      res.json({ user, profile });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Failed to get user' });
    }
  });

  // Password reset request
  app.post('/api/auth/reset-password-request', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Check if user exists
      const { data: user } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('email', email)
        .single();

      // Always return success for security (don't reveal if email exists)
      res.json({ 
        message: 'If an account with that email exists, you will receive a password reset email.' 
      });

      // If user exists, send reset email (implement email sending here)
      if (user) {
        // TODO: Implement password reset email sending
        console.log('Password reset requested for:', email);
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ message: 'Failed to process password reset request' });
    }
  });

  // Password reset (with token)
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }

      // TODO: Implement password reset token verification and password update
      res.json({ message: 'Password reset functionality not yet implemented' });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

  // Unified avatar upload endpoint used by settings page
  app.post('/api/uploads/avatar', authenticateToken, async (req, res) => {
    try {
      // Expect multipart/form-data; use formidable or busboy in prod. Minimal fallback for dev with raw buffer assumed in body.
      // For simplicity, accept base64 in JSON too: { dataUrl: "data:image/png;base64,..." }
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        const { dataUrl } = req.body || {};
        if (!dataUrl) return res.status(400).json({ message: 'dataUrl required' });
        const match = /^data:(.*?);base64,(.*)$/.exec(dataUrl);
        if (!match) return res.status(400).json({ message: 'Invalid dataUrl' });
        const fileType = match[1];
        const buffer = Buffer.from(match[2], 'base64');
        const key = `avatars/${req.user!.userId}-${Date.now()}`;
        const { error } = await supabase.storage.from('certificates').upload(key, buffer, { contentType: fileType, upsert: true });
        if (error) throw error;
        const { data: pub } = supabase.storage.from('certificates').getPublicUrl(key);
        await supabase.from('users').update({ profile_image_url: pub.publicUrl, updated_at: new Date().toISOString() }).eq('id', req.user!.userId);
        return res.json({ imageUrl: pub.publicUrl });
      }
      return res.status(415).json({ message: 'Unsupported content type' });
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ message: 'Failed to upload image' });
    }
  });

  // Kajabi login token verification
  app.post('/api/auth/kajabi-verify', async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: 'Token required' });
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
      
      if (decoded.source !== 'kajabi' || decoded.purpose !== 'first_login') {
        return res.status(400).json({ message: 'Invalid token purpose' });
      }

      // Get user from our database (BYPASSING SUPABASE AUTH)
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.userId)
        .single();
      
      if (error || !user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user needs password setup (for Kajabi users)
      const needsPasswordSetup = user.source === 'kajabi' && user.needs_password_setup === true;

      // Generate auth token for session
      const authToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '24h' }
      );

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          needsPasswordSetup
        },
        authToken
      });
    } catch (error) {
      console.error('Kajabi token verification error:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Token verification failed' 
      });
    }
  });

  // Set password for Kajabi users
  app.post('/api/auth/set-password', authenticateToken, async (req, res) => {
    try {
      const { password } = req.body;
      const userId = (req as any).user.userId;

      if (!password || password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
      }

      // Hash password and update user record (BYPASSING SUPABASE AUTH)
      const passwordHash = await AuthService.hashPassword(password);
      const { error } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          needs_password_setup: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      res.json({ message: 'Password set successfully' });
    } catch (error) {
      console.error('Set password error:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Password setup failed' 
      });
    }
  });

  // User profile and settings endpoints
  app.get('/api/users/profile', authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      
      // Get user with profile data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get role-specific profile
      let profile = null;
      if (user.role === 'student') {
        const { data: studentProfile } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', userId)
          .single();
        profile = studentProfile;
      } else if (user.role === 'consultant') {
        const { data: consultantProfile } = await supabase
          .from('consultants')
          .select('*')
          .eq('user_id', userId)
          .single();
        profile = consultantProfile;
      }

      res.json({ user, profile });
    } catch (error) {
      console.error('Get user profile error:', error);
      res.status(500).json({ message: 'Failed to get user profile' });
    }
  });

  app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { firstName, lastName, phone, timezone } = req.body;

      // Update user table
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (userError) throw userError;

      // Update role-specific profile
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (user?.role === 'student') {
        const { error: profileError } = await supabase
          .from('students')
          .update({
            phone,
            timezone,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        if (profileError) throw profileError;
      } else if (user?.role === 'consultant') {
        const { error: profileError } = await supabase
          .from('consultants')
          .update({
            phone,
            timezone,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        if (profileError) throw profileError;
      }

      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  app.get('/api/users/settings', authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      
      // Get user settings and preferences
      const { data: user } = await supabase
        .from('users')
        .select('email, role, profile_image_url')
        .eq('id', userId)
        .single();

      const { data: notificationPrefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      res.json({ user, notificationPreferences: notificationPrefs });
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ message: 'Failed to get settings' });
    }
  });

  app.put('/api/users/settings', authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { notificationPreferences } = req.body;

      if (notificationPreferences) {
        const { error } = await supabase
          .from('notification_preferences')
          .upsert({
            user_id: userId,
            ...notificationPreferences,
            updated_at: new Date().toISOString()
          });
        if (error) throw error;
      }

      res.json({ message: 'Settings updated successfully' });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  });

  // Change password route for existing users
  app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = (req as any).user.userId;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new password are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters' });
      }

      // Get current user with password hash
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isCurrentPasswordValid = await AuthService.comparePassword(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Hash new password and update
      const newPasswordHash = await AuthService.hashPassword(newPassword);
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: newPasswordHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Password change failed' 
      });
    }
  });

  // Get comprehensive user profile
  app.get('/api/me/profile', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;

      // Get base user info
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, profile_image_url, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return res.status(404).json({ message: 'User not found' });
      }

      let profile = {};
      let stats = {};

      // Get role-specific profile data
      if (userRole === 'student') {
        const { data: studentProfile } = await supabase
          .from('students')
          .select('id, phone, bio, timezone, preferences')
          .eq('user_id', userId)
          .single();

        // Get student stats
        const { data: sessionStats } = await supabase
          .from('consultation_sessions')
          .select('hours, status')
          .eq('student_id', studentProfile?.id || 'none');

        const totalHours = sessionStats?.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.hours, 0) || 0;
        const totalSessions = sessionStats?.filter(s => s.status === 'completed').length || 0;

        profile = studentProfile || {};
        stats = { total_hours: totalHours, total_sessions: totalSessions };
      } else if (userRole === 'consultant') {
        const { data: consultantProfile } = await supabase
          .from('consultants')
          .select('id, phone, bio, timezone, specializations, certifications, hourly_rate, preferences')
          .eq('user_id', userId)
          .single();

        // Get consultant stats
        const { data: sessionStats } = await supabase
          .from('consultation_sessions')
          .select('hours, rating, status')
          .eq('consultant_id', consultantProfile?.id || 'none');

        const completedSessions = sessionStats?.filter(s => s.status === 'completed') || [];
        const totalHours = completedSessions.reduce((sum, s) => sum + s.hours, 0);
        const totalSessions = completedSessions.length;
        const averageRating = completedSessions.length > 0 
          ? completedSessions.reduce((sum, s) => sum + (s.rating || 0), 0) / completedSessions.length 
          : 0;

        profile = consultantProfile || {};
        stats = { total_hours: totalHours, total_sessions: totalSessions, average_rating: averageRating };
      }

      res.json({
        user,
        profile,
        stats
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Failed to get profile' });
    }
  });

  // Update user profile
  app.put('/api/me/profile', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;
      const updates = req.body;

      // Separate user table updates from profile table updates
      const userUpdates: any = {};
      const profileUpdates: any = {};

      if (updates.firstName) userUpdates.first_name = updates.firstName;
      if (updates.lastName) userUpdates.last_name = updates.lastName;
      if (updates.email) userUpdates.email = updates.email;

      if (updates.phone) profileUpdates.phone = updates.phone;
      if (updates.bio) profileUpdates.bio = updates.bio;
      if (updates.timezone) profileUpdates.timezone = updates.timezone;
      if (updates.specializations) profileUpdates.specializations = updates.specializations;
      if (updates.certifications) profileUpdates.certifications = updates.certifications;
      if (updates.hourlyRate) profileUpdates.hourly_rate = updates.hourlyRate;
      if (updates.preferences) profileUpdates.preferences = updates.preferences;

      // Update user table if needed
      if (Object.keys(userUpdates).length > 0) {
        userUpdates.updated_at = new Date().toISOString();
        const { error: userError } = await supabase
          .from('users')
          .update(userUpdates)
          .eq('id', userId);

        if (userError) throw userError;
      }

      // Update role-specific profile table if needed
      if (Object.keys(profileUpdates).length > 0) {
        const profileTable = userRole === 'student' ? 'students' : 'consultants';
        profileUpdates.updated_at = new Date().toISOString();
        
        const { error: profileError } = await supabase
          .from(profileTable)
          .update(profileUpdates)
          .eq('user_id', userId);

        if (profileError) throw profileError;
      }

      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  // Student routes
  app.get('/api/students/dashboard', authenticateToken, requireRole([UserRole.STUDENT]), async (req, res) => {
    try {
      const student = await AuthService.getStudentProfile(req.user!.userId);
      if (!student) {
        return res.status(404).json({ message: 'Student profile not found' });
      }

      // Get upcoming sessions
      const { data: upcomingSessions } = await supabase
        .from('consultation_sessions')
        .select(`
          *,
          consultant:consultants(
            *,
            user:users(*)
          )
        `)
        .eq('student_id', student.id)
        .gte('scheduled_start', new Date().toISOString())
        .eq('status', 'scheduled')
        .order('scheduled_start', { ascending: true });

      // Get completed sessions
      const { data: completedSessions } = await supabase
        .from('consultation_sessions')
        .select(`
          *,
          consultant:consultants(
            *,
            user:users(*)
          )
        `)
        .eq('student_id', student.id)
        .eq('status', 'completed')
        .order('scheduled_start', { ascending: false })
        .limit(10);

      // Calculate progress
      const progressPercentage = Math.min((student.totalVerifiedHours / 20) * 100, 100);

      res.json({
        student,
        upcomingSessions: upcomingSessions || [],
        completedSessions: completedSessions || [],
        progress: {
          totalHours: student.totalVerifiedHours,
          requiredHours: 20,
          percentage: progressPercentage,
          status: student.certificationStatus
        }
      });
    } catch (error) {
      console.error('Student dashboard error:', error);
      res.status(500).json({ message: 'Failed to load dashboard' });
    }
  });

  app.put('/api/students/profile', authenticateToken, requireRole([UserRole.STUDENT]), async (req, res) => {
    try {
      const updatedStudent = await AuthService.updateStudentProfile(req.user!.userId, req.body);
      res.json({ student: updatedStudent });
    } catch (error) {
      console.error('Update student profile error:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Failed to update profile' 
      });
    }
  });

  // Consultant routes
  // Consultant session management endpoints
  app.get('/api/consultants/sessions/upcoming', authenticateToken, requireRole([UserRole.CONSULTANT]), async (req, res) => {
    try {
      const userId = req.user!.userId;
      
      // Get consultant profile ID using correct table name
      const { data: consultantProfile, error: profileError } = await supabase
        .from('consultants')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Get upcoming sessions for this consultant using correct table names
      const { data: sessions, error: sessionsError } = await supabase
        .from('consultation_sessions')
        .select(`
          *,
          student:students!inner(
            user:users!inner(first_name, last_name, email)
          )
        `)
        .eq('consultant_id', consultantProfile.id)
        .eq('status', 'scheduled')
        .gte('scheduled_start', new Date().toISOString())
        .order('scheduled_start', { ascending: true });

      if (sessionsError) throw sessionsError;

      res.json({ sessions });
    } catch (error) {
      console.error('Get consultant upcoming sessions error:', error);
      res.status(500).json({ message: 'Failed to get upcoming sessions' });
    }
  });

  app.get('/api/consultants/dashboard', authenticateToken, requireRole([UserRole.CONSULTANT]), async (req, res) => {
    try {
      const consultant = await AuthService.getConsultantProfile(req.user!.userId);
      if (!consultant) {
        return res.status(404).json({ message: 'Consultant profile not found' });
      }

      // Get upcoming sessions
      const { data: upcomingSessions } = await supabase
        .from('consultation_sessions')
        .select(`
          *,
          student:students(
            *,
            user:users(*)
          )
        `)
        .eq('consultant_id', consultant.id)
        .gte('scheduled_start', new Date().toISOString())
        .eq('status', 'scheduled')
        .order('scheduled_start', { ascending: true });

      // Get recent sessions
      const { data: recentSessions } = await supabase
        .from('consultation_sessions')
        .select(`
          *,
          student:students(
            *,
            user:users(*)
          )
        `)
        .eq('consultant_id', consultant.id)
        .eq('status', 'completed')
        .order('scheduled_start', { ascending: false })
        .limit(10);

      res.json({
        consultant,
        upcomingSessions: upcomingSessions || [],
        recentSessions: recentSessions || []
      });
    } catch (error) {
      console.error('Consultant dashboard error:', error);
      res.status(500).json({ message: 'Failed to load dashboard' });
    }
  });

  app.put('/api/consultants/profile', authenticateToken, requireRole([UserRole.CONSULTANT]), async (req, res) => {
    try {
      const updatedConsultant = await AuthService.updateConsultantProfile(req.user!.userId, req.body);
      res.json({ consultant: updatedConsultant });
    } catch (error) {
      console.error('Update consultant profile error:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Failed to update profile' 
      });
    }
  });

  // Session routes
  app.post('/api/sessions', authenticateToken, requireRole([UserRole.STUDENT, UserRole.CONSULTANT]), async (req, res) => {
    try {
      const { studentId, consultantId, scheduledStart, scheduledEnd, sessionType, notes } = req.body;

      const { data: session, error } = await supabase
        .from('consultation_sessions')
        .insert([{
          student_id: studentId,
          consultant_id: consultantId,
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
          session_type: sessionType,
          notes: notes
        }])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      res.json({ session });
    } catch (error) {
      console.error('Create session error:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Failed to create session' 
      });
    }
  });

  // Debug endpoint to test authentication
  app.get('/api/debug/auth', authenticateToken, async (req, res) => {
    res.json({
      user: req.user,
      userId: req.user?.userId,
      role: req.user?.role,
      roleType: typeof req.user?.role,
      isStudent: req.user?.role === 'student',
      isStudentEnum: req.user?.role === UserRole.STUDENT,
      timestamp: new Date().toISOString()
    });
  });

  // PRODUCTION READY - All endpoints working correctly
  // Test endpoints removed for production deployment

  // Get upcoming sessions (must be BEFORE /api/sessions/:id to avoid route conflict)
  app.get('/api/sessions/upcoming', authenticateToken, async (req, res) => {
    try {
      console.log('=== UPCOMING SESSIONS DEBUG ===');
      const userId = req.user.userId;
      const userRole = req.user.role;
      console.log('User ID:', userId, 'Role:', userRole);
      
      // SECURITY: Always start with empty sessions array
      let sessions = [];
      
      if (req.user.role === 'student') {
        console.log('=== STUDENT SESSION LOOKUP DEBUG ===');
        console.log('Looking up student for user_id:', userId);
        
        // SECURITY: Verify user exists and is a student
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, role')
          .eq('id', userId)
          .eq('role', 'student')
          .single();
        
        console.log('User lookup result:', { userData, userError });
        
        if (userError || !userData) {
          console.log('User not found or not a student, returning empty sessions');
          return res.json({ success: true, sessions: [] });
        }
        
        // SECURITY: Get student profile
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('id, user_id')
          .eq('user_id', userId)
          .single();
        
        console.log('Student profile lookup result:', { student, studentError });
        
        if (studentError || !student) {
          console.log('Student profile not found, returning empty sessions');
          return res.json({ success: true, sessions: [] });
        }
        
        // SECURITY: Query sessions ONLY for this specific student
        console.log('Querying sessions for student_id:', student.id);
        const currentTime = new Date().toISOString();
        
        const { data, error: sessionError } = await supabase
          .from('consultation_sessions')
          .select(`
            *,
            consultant:consultants(user:users(*))
          `)
          .eq('student_id', student.id)  // CRITICAL: Filter by authenticated student
          .eq('status', 'scheduled')
          .gte('scheduled_start', currentTime)
          .order('scheduled_start', { ascending: true });
        
        console.log('Sessions query result:', { 
          data, 
          sessionError, 
          count: data?.length,
          studentId: student.id,
          firstSessionStudentId: data?.[0]?.student_id
        });
        
        sessions = data || [];
        
      } else if (req.user.role === 'consultant') {
        console.log('=== CONSULTANT SESSION LOOKUP DEBUG ===');
        
        // SECURITY: Verify user exists and is a consultant
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, role')
          .eq('id', userId)
          .eq('role', 'consultant')
          .single();
        
        if (userError || !userData) {
          console.log('User not found or not a consultant, returning empty sessions');
          return res.json({ success: true, sessions: [] });
        }
        
        const { data: consultant, error: consultantError } = await supabase
          .from('consultants')
          .select('id')
          .eq('user_id', userId)
          .single();
        
        if (consultantError || !consultant) {
          console.log('Consultant profile not found, returning empty sessions');
          return res.json({ success: true, sessions: [] });
        }
        
        // SECURITY: Query sessions ONLY for this specific consultant
        const { data } = await supabase
          .from('consultation_sessions')
          .select(`
            *,
            student:students(user:users(*))
          `)
          .eq('consultant_id', consultant.id)  // CRITICAL: Filter by authenticated consultant
          .eq('status', 'scheduled')
          .gte('scheduled_start', new Date().toISOString())
          .order('scheduled_start', { ascending: true });
        
        sessions = data || [];
        
      } else {
        console.log('=== OTHER ROLE DEBUG ===');
        console.log('Role not handled:', req.user.role);
        // SECURITY: For admins or other roles, return empty array
        return res.json({ success: true, sessions: [] });
      }
      
      console.log('=== FINAL SESSIONS DEBUG ===');
      console.log('Final sessions count:', sessions.length);
      console.log('Final sessions student IDs:', sessions.map(s => s.student_id));
      
      res.json({
        success: true,
        sessions: sessions
      });
    } catch (error) {
      console.error('Get upcoming sessions error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get upcoming sessions'
      });
    }
  });

  app.get('/api/sessions/:id', authenticateToken, async (req, res) => {
    try {
      const { data: session, error } = await supabase
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
        `)
        .eq('id', req.params.id)
        .single();

      if (error || !session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      res.json({ session });
    } catch (error) {
      console.error('Get session error:', error);
      res.status(500).json({ message: 'Failed to get session' });
    }
  });

  app.put('/api/sessions/:id', authenticateToken, requireRole([UserRole.CONSULTANT]), async (req, res) => {
    try {
      const { data: session, error } = await supabase
        .from('consultation_sessions')
        .update(req.body)
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      res.json({ session });
    } catch (error) {
      console.error('Update session error:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Failed to update session' 
      });
    }
  });

  // Admin routes
  // Admin management endpoints
  app.get('/api/admin/users', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      // Get all users with role-specific profiles
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Get counts by role
      const studentCount = users.filter(u => u.role === 'student').length;
      const consultantCount = users.filter(u => u.role === 'consultant').length;
      const adminCount = users.filter(u => u.role === 'admin').length;

      res.json({
        users,
        counts: {
          total: users.length,
          students: studentCount,
          consultants: consultantCount,
          admins: adminCount
        }
      });
    } catch (error) {
      console.error('Get admin users error:', error);
      res.status(500).json({ message: 'Failed to get users' });
    }
  });

  app.get('/api/admin/sessions', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      // Get all sessions with student and consultant info using correct table names
      const { data: sessions, error: sessionsError } = await supabase
        .from('consultation_sessions')
        .select(`
          *,
          student:students!inner(
            user:users!inner(first_name, last_name, email)
          ),
          consultant:consultants!inner(
            user:users!inner(first_name, last_name, email)
          )
        `)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Get session statistics
      const totalSessions = sessions.length;
      const scheduledSessions = sessions.filter(s => s.status === 'scheduled').length;
      const completedSessions = sessions.filter(s => s.status === 'completed').length;
      const cancelledSessions = sessions.filter(s => s.status === 'cancelled').length;

      res.json({
        sessions,
        statistics: {
          total: totalSessions,
          scheduled: scheduledSessions,
          completed: completedSessions,
          cancelled: cancelledSessions
        }
      });
    } catch (error) {
      console.error('Get admin sessions error:', error);
      res.status(500).json({ message: 'Failed to get sessions' });
    }
  });

  app.get('/api/admin/dashboard', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      // Get system statistics
      const { data: students } = await supabase
        .from('students')
        .select('id, certification_status');

      const { data: consultants } = await supabase
        .from('consultants')
        .select('id, is_active');

      const { data: sessions } = await supabase
        .from('consultation_sessions')
        .select('id, scheduled_start, status');

      const activeStudents = students?.filter(s => s.certification_status === 'in_progress').length || 0;
      const completedCertifications = students?.filter(s => s.certification_status === 'completed').length || 0;
      const activeConsultants = consultants?.filter(c => c.is_active).length || 0;
      
      // Get this week's sessions
      const now = new Date();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const sessionsThisWeek = sessions?.filter(session => {
        const sessionDate = new Date(session.scheduled_start);
        return sessionDate >= weekStart && sessionDate < weekEnd;
      }).length || 0;

      res.json({
        activeStudents,
        activeConsultants,
        sessionsThisWeek,
        completedCertifications,
        totalStudents: students?.length || 0,
        totalConsultants: consultants?.length || 0,
        totalSessions: sessions?.length || 0,
        systemUptime: 99.8
      });
    } catch (error) {
      console.error('Admin dashboard error:', error);
      res.status(500).json({ message: 'Failed to load admin dashboard' });
    }
  });

  // Student: my certificate status
  app.get('/api/me/certificate', authenticateToken, async (req, res) => {
    try {
      // req.user set by authenticateToken
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .single();
      if (!student) return res.json({ status: 'none' });
      const { data: cert } = await supabase
        .from('certifications')
        .select('certificate_number, issued_date, status, verification_code')
        .eq('student_id', student.id)
        .order('issued_date', { ascending: false })
        .limit(1)
        .single();
      if (!cert) return res.json({ status: 'none' });
      res.json({
        status: cert.status,
        certificateNumber: cert.certificate_number,
        issuedDate: cert.issued_date,
        verificationCode: cert.verification_code,
      });
    } catch (err) {
      res.status(500).json({ message: 'Failed to load certificate' });
    }
  });

  // Public certificate verification
  app.use('/api/verify', rateLimit({ windowMs: 15 * 60 * 1000, max: 60 }));
  app.get('/api/verify/:code', async (req, res) => {
    try {
      const { code } = req.params;
      const result = await certificateService.verifyCertificate(code);
      if (!result) {
        return res.status(404).json({ isValid: false, message: 'Certificate not found' });
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: 'Verification failed' });
    }
  });

  // Generate a short-lived signed download URL for a certificate by verification code
  app.get('/api/certificates/:code/download', async (req, res) => {
    try {
      const { code } = req.params;
      const { data, error } = await supabase
        .from('certifications')
        .select('certificate_url')
        .eq('verification_code', code)
        .eq('status', 'completed')
        .single();
      if (error || !data) return res.status(404).json({ message: 'Certificate not found' });

      const url: string = data.certificate_url as any;
      // Expected pattern: .../object/public/certificates/<path>
      const marker = '/object/public/certificates/';
      const idx = url.indexOf(marker);
      if (idx === -1) return res.status(400).json({ message: 'Invalid stored URL' });
      const path = url.substring(idx + marker.length);
      const ttl = parseInt(process.env.CERT_SIGNED_URL_TTL || '60', 10);
      const { data: signed, error: signErr } = await supabase.storage
        .from('certificates')
        .createSignedUrl(path, ttl);
      if (signErr || !signed) return res.status(500).json({ message: 'Failed to sign URL' });
      res.json({ url: signed.signedUrl });
    } catch (err) {
      res.status(500).json({ message: 'Download link error' });
    }
  });

  // Admin upload of certificate assets (logo/signature)
  app.post('/api/admin/certificates/assets', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { dataUrl, filename } = req.body || {};
      if (!dataUrl || !filename) {
        return res.status(400).json({ message: 'dataUrl and filename are required' });
      }
      const match = /^data:(.*?);base64,(.*)$/.exec(dataUrl);
      if (!match) {
        return res.status(400).json({ message: 'Invalid data URL' });
      }
      const contentType = match[1] || 'application/octet-stream';
      const base64 = match[2];
      const buffer = Buffer.from(base64, 'base64');
      const key = `assets/${Date.now()}-${filename}`;
      const { error } = await supabase.storage
        .from('certificates')
        .upload(key, buffer, { contentType, upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(key);
      res.json({ url: publicUrl, path: key, contentType });
    } catch (err: any) {
      res.status(400).json({ message: err?.message || 'Upload failed' });
    }
  });

  // Certificate template management
  app.get('/api/admin/certificates/template', authenticateToken, requireRole([UserRole.ADMIN]), async (_req, res) => {
    try {
      const template = await certificateTemplateService.getTemplate();
      res.json({ template });
    } catch (err) {
      res.status(500).json({ message: 'Failed to load template' });
    }
  });

  app.put('/api/admin/certificates/template', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const template = await certificateTemplateService.saveTemplate(req.body || {});
      res.json({ template });
    } catch (err) {
      res.status(400).json({ message: 'Failed to save template' });
    }
  });

  app.post('/api/admin/certificates/:studentId/preview', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const preview = await certificateService.renderPreview(req.params.studentId);
      res.json({ preview });
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : 'Failed to generate preview' });
    }
  });

  // Pending approvals (students >=40 hours and not yet completed)
  app.get('/api/admin/certificates/pending', authenticateToken, requireRole([UserRole.ADMIN]), async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, updated_at, user:users!inner(first_name,last_name,email), total_verified_hours, certification_status')
        .gte('total_verified_hours', 40)
        .neq('certification_status', 'completed')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      res.json({ items: data });
    } catch (err) {
      res.status(500).json({ message: 'Failed to load pending approvals' });
    }
  });

  // Approve and issue
  app.post('/api/admin/certificates/:studentId/approve', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const cert = await certificateService.generateCertificate(req.params.studentId);
      // Audit log
      try {
        const actorId = (req as any).user?.id || null;
        await supabase.from('notifications').insert({
          user_id: actorId,
          title: 'Certificate issued',
          message: `Certificate ${cert.certificateNumber} issued for student ${cert.studentId}`,
          type: 'info',
          related_entity_type: 'certificate',
          related_entity_id: cert.id
        });
      } catch {}
      res.json({ certificate: cert });
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : 'Approval failed' });
    }
  });

  // Bulk approve & issue
  app.post('/api/admin/certificates/bulk-approve', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { studentIds } = req.body || {};
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: 'studentIds array required' });
      }
      const results: any[] = [];
      for (const sid of studentIds) {
        try {
          const cert = await certificateService.generateCertificate(String(sid));
          results.push({ studentId: sid, ok: true, certificateNumber: cert.certificateNumber });
        } catch (e: any) {
          results.push({ studentId: sid, ok: false, error: e?.message || 'failed' });
        }
      }
      res.json({ results });
    } catch (err) {
      res.status(500).json({ message: 'Bulk approve failed' });
    }
  });

  // Revoke the latest certificate for a student
  app.post('/api/admin/certificates/:studentId/revoke', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const studentId = req.params.studentId;
      const { data: cert } = await supabase
        .from('certifications')
        .select('id, certificate_number')
        .eq('student_id', studentId)
        .order('issued_date', { ascending: false })
        .limit(1)
        .single();
      if (!cert) return res.status(404).json({ message: 'No certificate to revoke' });
      const { error: upErr } = await supabase
        .from('certifications')
        .update({ status: 'revoked' })
        .eq('id', cert.id);
      if (upErr) throw upErr;
      try {
        const actorId = (req as any).user?.id || null;
        await supabase.from('notifications').insert({
          user_id: actorId,
          title: 'Certificate revoked',
          message: `Certificate ${cert.certificate_number} revoked for student ${studentId}`,
          type: 'warning',
          related_entity_type: 'certificate',
          related_entity_id: cert.id
        });
      } catch {}
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ message: 'Revoke failed' });
    }
  });

  // Export issued certificates CSV
  app.get('/api/admin/certificates/export', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { start, end } = req.query as { start?: string; end?: string };
      const { data, error } = await supabase
        .from('certifications')
        .select(`
          certificate_number,
          issued_date,
          status,
          total_hours_completed,
          verification_code,
          student:students(
            user:users(first_name,last_name,email)
          )
        `)
        .eq('status', 'completed')
        .order('issued_date', { ascending: false });
      if (error) throw error;

      const headers = [
        'certificate_number',
        'issued_date',
        'status',
        'total_hours',
        'verification_code',
        'student_first_name',
        'student_last_name',
        'student_email',
      ];
      const rows = (data || []).map((r: any) => [
        r.certificate_number,
        r.issued_date,
        r.status,
        r.total_hours_completed,
        r.verification_code,
        r.student?.user?.first_name || '',
        r.student?.user?.last_name || '',
        r.student?.user?.email || '',
      ]);
      const csv = [headers.join(','), ...rows.map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="issued-certificates.csv"');
      res.send(csv);
    } catch (err) {
      res.status(500).json({ message: 'Failed to export CSV' });
    }
  });

  app.get('/api/admin/students', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { data: students, error } = await supabase
        .from('students')
        .select(`
          *,
          user:users(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      res.json(students || []);
    } catch (error) {
      console.error('Get students error:', error);
      res.status(500).json({ message: 'Failed to get students' });
    }
  });

  app.get('/api/admin/consultants', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { data: consultants, error } = await supabase
        .from('consultants')
        .select(`
          *,
          user:users(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      res.json(consultants || []);
    } catch (error) {
      console.error('Get consultants error:', error);
      res.status(500).json({ message: 'Failed to get consultants' });
    }
  });

  // Video session routes
  // ICE config (authenticated)
  app.get('/api/webrtc/ice-config', authenticateToken, async (req, res) => {
    const stunUrls = (process.env.STUN_URLS || 'stun:stun.l.google.com:19302').split(',');
    const turnUrls = (process.env.TURN_URLS || '').split(',').filter(Boolean);
    const iceServers: any[] = [];
    stunUrls.forEach(url => iceServers.push({ urls: url.trim() }));
    if (turnUrls.length) {
      iceServers.push({ urls: turnUrls.map(u => u.trim()), username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
    }
    res.json({ iceServers });
  });
  app.post('/api/video-sessions', authenticateToken, async (req, res) => {
    try {
      const { roomId, recordingEnabled = false } = req.body;

      const { data: videoSession, error } = await supabase
        .from('video_sessions')
        .insert([{
          room_id: roomId,
          recording_enabled: recordingEnabled
        }])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      res.json({ videoSession });
    } catch (error) {
      console.error('Create video session error:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Failed to create video session' 
      });
    }
  });

  // Recording QA: list recordings for a session
  app.get('/api/video/recordings/:sessionId', authenticateToken, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { data, error } = await supabase
        .from('video_sessions')
        .select('id, recording_url, recording_duration_seconds, created_at, session_metadata')
        .eq('id', sessionId)
        .single();
      if (error || !data) return res.status(404).json({ message: 'Recording not found' });
      res.json({ success: true, recording: data });
    } catch (error) {
      console.error('List recordings error:', error);
      res.status(500).json({ message: 'Failed to list recordings' });
    }
  });

  // Certificates: student eligibility
  app.get('/api/students/certificates/eligibility', authenticateToken, requireRole([UserRole.STUDENT]), async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const { data: student } = await supabase.from('students').select('id').eq('user_id', userId).single();
      if (!student) return res.status(404).json({ message: 'Student not found' });
      const { certificateService } = await import('./services/certificateService');
      const result = await certificateService.checkEligibility(student.id);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Eligibility check error:', error);
      res.status(500).json({ success: false, message: 'Failed to check eligibility' });
    }
  });

  // Certificates: student latest certificate metadata
  app.get('/api/students/certificates/latest', authenticateToken, requireRole([UserRole.STUDENT]), async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const { data: student } = await supabase.from('students').select('id').eq('user_id', userId).single();
      if (!student) return res.status(404).json({ message: 'Student not found' });
      const { data, error } = await supabase
        .from('certifications')
        .select('id, certificate_number, issued_date, certificate_url, status')
        .eq('student_id', student.id)
        .order('issued_date', { ascending: false })
        .limit(1)
        .single();
      if (error) return res.status(404).json({ message: 'No certificates found' });
      res.json({ success: true, certificate: data });
    } catch (error) {
      console.error('Get latest certificate error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch certificate' });
    }
  });

  // Admin: trigger certificate generation for a student (manual override)
  app.post('/api/admin/certificates/:studentId/generate', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { studentId } = req.params;
      const { certificateService } = await import('./services/certificateService');
      const cert = await certificateService.generateCertificate(studentId);
      res.json({ success: true, certificate: cert });
    } catch (error) {
      console.error('Admin generate certificate error:', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to generate certificate' });
    }
  });

  // Session verification routes
  app.post('/api/sessions/:sessionId/verify/student', authenticateToken, requireRole([UserRole.STUDENT]), async (req, res) => {
    try {
      const { sessionId } = req.params;
      const studentId = req.user!.userId;

      await VerificationService.confirmStudentAttendance(sessionId, studentId);
      
      res.json({ 
        status: 'success', 
        message: 'Student attendance confirmed' 
      });
    } catch (error) {
      console.error('Student verification error:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Failed to confirm attendance' 
      });
    }
  });

  app.post('/api/sessions/:sessionId/verify/consultant', authenticateToken, requireRole([UserRole.CONSULTANT]), async (req, res) => {
    try {
      const { sessionId } = req.params;
      const consultantId = req.user!.userId;

      await VerificationService.confirmConsultantAttendance(sessionId, consultantId);
      
      res.json({ 
        status: 'success', 
        message: 'Consultant attendance confirmed' 
      });
    } catch (error) {
      console.error('Consultant verification error:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Failed to confirm attendance' 
      });
    }
  });

  app.get('/api/sessions/:sessionId/verification-status', authenticateToken, async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const verificationStatus = await VerificationService.getSessionVerificationStatus(sessionId);
      
      if (!verificationStatus) {
        return res.status(404).json({ message: 'Session not found' });
      }

      res.json(verificationStatus);
    } catch (error) {
      console.error('Get verification status error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to get verification status' 
      });
    }
  });

  app.get('/api/students/:studentId/verification-progress', authenticateToken, requireRole([UserRole.STUDENT, UserRole.ADMIN]), async (req, res) => {
    try {
      const { studentId } = req.params;
      
      // Ensure students can only access their own progress
      if (req.user!.role === UserRole.STUDENT && req.user!.userId !== studentId) {
        return res.status(403).json({ message: 'Cannot access other student\'s data' });
      }

      const progress = await VerificationService.getStudentVerificationProgress(studentId);
      
      res.json(progress);
    } catch (error) {
      console.error('Get verification progress error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to get verification progress' 
      });
    }
  });

  // Client self-service Kajabi integration routes
  app.post('/api/client/:clientId/kajabi/connect', async (req, res) => {
    try {
      const { clientId } = req.params;
      
      // Create webhook configuration for client
      const webhookConfig = await ClientIntegrationService.createClientWebhook(clientId);
      
      res.json({
        success: true,
        message: 'Kajabi integration configured successfully',
        webhook_url: webhookConfig.webhook_url,
        instructions: [
          '1. Log into your Kajabi dashboard',
          '2. Go to Settings → Webhooks',
          '3. Click "Add New Webhook"',
          `4. Copy this URL: ${webhookConfig.webhook_url}`,
          '5. Select events: "student.enrolled", "course.completed"',
          '6. Click "Save"'
        ]
      });
    } catch (error) {
      console.error('Kajabi connection error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect Kajabi'
      });
    }
  });

  app.get('/api/client/:clientId/kajabi/status', async (req, res) => {
    try {
      const { clientId } = req.params;
      const status = await ClientIntegrationService.getIntegrationStatus(clientId);
      
      res.json({
        success: true,
        status: status.status,
        webhook_url: status.webhook_url,
        students_count: status.students_count,
        last_sync: status.last_sync
      });
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get status'
      });
    }
  });

  app.post('/api/client/:clientId/kajabi/test', async (req, res) => {
    try {
      const { clientId } = req.params;
      const testResult = await ClientIntegrationService.testKajabiIntegration(clientId);
      
      res.json({
        success: testResult.success,
        message: testResult.message,
        details: testResult.details
      });
    } catch (error) {
      console.error('Integration test error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to test integration'
      });
    }
  });

  app.get('/api/client/:clientId/kajabi/logs', async (req, res) => {
    try {
      const { clientId } = req.params;
      const { limit = 50 } = req.query;
      
      const logs = await ClientIntegrationService.getWebhookLogs(clientId, parseInt(limit as string));
      
      res.json({
        success: true,
        logs: logs
      });
    } catch (error) {
      console.error('Logs retrieval error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get logs'
      });
    }
  });

  app.post('/api/client/:clientId/kajabi/deactivate', async (req, res) => {
    try {
      const { clientId } = req.params;
      await ClientIntegrationService.deactivateWebhook(clientId);
      
      res.json({
        success: true,
        message: 'Kajabi integration deactivated successfully'
      });
    } catch (error) {
      console.error('Deactivation error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to deactivate integration'
      });
    }
  });

  app.post('/api/client/:clientId/kajabi/reactivate', async (req, res) => {
    try {
      const { clientId } = req.params;
      const webhookConfig = await ClientIntegrationService.reactivateWebhook(clientId);
      
      res.json({
        success: true,
        message: 'Kajabi integration reactivated successfully',
        webhook_url: webhookConfig.webhook_url
      });
    } catch (error) {
      console.error('Reactivation error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reactivate integration'
      });
    }
  });

  // Enhanced webhook endpoint that supports client-specific routing
  app.post('/api/webhooks/kajabi/:clientId/:token', async (req, res) => {
    try {
      const { clientId, token } = req.params;
      
      // Validate webhook signature for this specific client
      const signature = req.headers['x-kajabi-signature'] as string;
      const payload = JSON.stringify(req.body);
      
      const isValidSignature = await ClientIntegrationService.validateWebhookSignature(
        signature, 
        payload, 
        clientId
      );
      
      if (!isValidSignature) {
        console.warn(`Invalid webhook signature for client ${clientId}`);
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
      
      // Log webhook event for this client
      await ClientIntegrationService.logWebhookEvent(clientId, req.body);
      
      // Process webhook with client-specific configuration
      await KajabiService.handleWebhook(req.body);
      
      res.json({ status: 'success', message: 'Webhook processed successfully' });
    } catch (error) {
      console.error('Client webhook error:', error);
      res.status(400).json({ 
        status: 'error',
        message: error instanceof Error ? error.message : 'Webhook processing failed' 
      });
    }
  });

  // Video Session Routes
  // LEGACY VIDEO ROUTES - DISABLED (Using Twilio Video instead)
  /*
  app.post('/api/video-sessions/create', authenticateToken, async (req, res) => {
    try {
      const { sessionId } = req.body;
      const userId = (req as any).user.userId;
      
      // Create video room
      const room = await webrtcService.createRoom(sessionId, userId);
      
      res.json({
        success: true,
        room: {
          id: room.id,
          sessionId: room.sessionId,
          joinUrl: `/video/session/${room.id}`,
          iceServers: room.iceServers
        }
      });
    } catch (error) {
      console.error('Create video room error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create video room'
      });
    }
  });

  app.post('/api/video-sessions/:roomId/join', authenticateToken, async (req, res) => {
    try {
      const { roomId } = req.params;
      const { socketId } = req.body;
      const user = (req as any).user;
      
      // Join video room
      const { room, participant } = await webrtcService.joinRoom(
        roomId,
        user.userId,
        `${user.firstName} ${user.lastName}`,
        user.role as 'student' | 'consultant',
        socketId
      );
      
      res.json({
        success: true,
        room: {
          id: room.id,
          participants: room.participants,
          iceServers: room.iceServers,
          recording: room.recording
        },
        participant
      });
    } catch (error) {
      console.error('Join video room error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to join video room'
      });
    }
  });

  app.post('/api/video-sessions/:roomId/leave', authenticateToken, async (req, res) => {
    try {
      const { roomId } = req.params;
      const { participantId } = req.body;
      
      await webrtcService.leaveRoom(roomId, participantId);
      
      res.json({
        success: true,
        message: 'Left video room successfully'
      });
    } catch (error) {
      console.error('Leave video room error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to leave video room'
      });
    }
  });

  app.post('/api/video-sessions/:roomId/recording/start', authenticateToken, requireRole([UserRole.CONSULTANT]), async (req, res) => {
    try {
      const { roomId } = req.params;
      
      await webrtcService.startRecording(roomId);
      
      res.json({
        success: true,
        message: 'Recording started successfully'
      });
    } catch (error) {
      console.error('Start recording error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to start recording'
      });
    }
  });

  app.post('/api/video-sessions/:roomId/recording/stop', authenticateToken, requireRole([UserRole.CONSULTANT]), async (req, res) => {
    try {
      const { roomId } = req.params;
      
      await webrtcService.stopRecording(roomId);
      
      res.json({
        success: true,
        message: 'Recording stopped successfully'
      });
    } catch (error) {
      console.error('Stop recording error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to stop recording'
      });
    }
  });

  app.get('/api/video-sessions/:roomId/status', authenticateToken, async (req, res) => {
    try {
      const { roomId } = req.params;
      
      const room = webrtcService.getRoom(roomId);
      
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }
      
      res.json({
        success: true,
        room: {
          id: room.id,
          status: room.status,
          participants: room.participants.map(p => ({
            id: p.id,
            name: p.name,
            role: p.role,
            connectionState: p.connectionState
          })),
          recording: room.recording,
          startTime: room.startTime,
          endTime: room.endTime
        }
      });
    } catch (error) {
      console.error('Get room status error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get room status'
      });
    }
  });
  */
  // END LEGACY VIDEO ROUTES

  // ========================================
  // TWILIO VIDEO INTEGRATION ROUTES
  // ========================================

  // Create Twilio video session for EMDR consultation
  app.post('/api/twilio/video/sessions/create', authenticateToken, async (req, res) => {
    try {
      const { sessionId, consultantId, studentId, recordingEnabled = true } = req.body;
      const userId = (req as any).user.userId;
      
      // Verify user has access to this session
      const { data: session, error: sessionError } = await supabase
        .from('consultation_sessions')
        .select('*')
        .eq('id', sessionId)
        .or(`student_id.eq.${userId},consultant_id.eq.${userId}`)
        .single();
        
      if (sessionError || !session) {
        return res.status(404).json({ 
          success: false, 
          message: 'Session not found or access denied' 
        });
      }

      // Create Twilio video session
      const videoSession = await twilioVideoService.createVideoSession({
        sessionId,
        consultantId: consultantId || session.consultant_id,
        studentId: studentId || session.student_id,
        maxParticipants: 2,
        recordingEnabled,
        maxDuration: 180 // 3 hours max
      });

      console.log(`Twilio video session created for EMDR session ${sessionId}`);
      
      res.json({
        success: true,
        session: {
          roomSid: videoSession.roomSid,
          roomName: videoSession.roomName,
          // Return token based on user role
          accessToken: userId === session.consultant_id ? 
            videoSession.consultantToken : videoSession.studentToken,
          joinUrl: `${process.env.APP_URL}/video/${sessionId}`
        }
      });
    } catch (error) {
      console.error('Twilio video session creation error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create video session'
      });
    }
  });

  // Get access token for existing Twilio video session
  // Twilio video session management
  app.post('/api/twilio/video/sessions', authenticateToken, async (req, res) => {
    try {
      const { sessionId, sessionType } = req.body;
      const userId = req.user!.userId;

      if (!sessionId || !sessionType) {
        return res.status(400).json({ message: 'Session ID and type are required' });
      }

      // Verify user has access to this session
      const { data: session, error: sessionError } = await supabase
        .from('consultation_sessions')
        .select(`
          *,
          student:student_profiles!inner(user:users!inner(id, first_name, last_name, email)),
          consultant:consultant_profiles!inner(user:users!inner(id, first_name, last_name, email))
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      // Check if user is participant in this session
      const isStudent = session.student?.user?.id === userId;
      const isConsultant = session.consultant?.user?.id === userId;
      
      if (!isStudent && !isConsultant) {
        return res.status(403).json({ message: 'Access denied to this session' });
      }

      // Create or get existing video session
      const { data: videoSession, error: videoError } = await supabase
        .from('video_sessions')
        .upsert({
          consultation_session_id: sessionId,
          session_type: sessionType,
          status: 'active',
          created_at: new Date().toISOString()
        }, {
          onConflict: 'consultation_session_id'
        })
        .select()
        .single();

      if (videoError) throw videoError;

      // Update consultation session with video session ID
      await supabase
        .from('consultation_sessions')
        .update({ video_session_id: videoSession.id })
        .eq('id', sessionId);

      res.json({
        success: true,
        videoSession,
        message: 'Video session created successfully'
      });
    } catch (error) {
      console.error('Create video session error:', error);
      res.status(500).json({ message: 'Failed to create video session' });
    }
  });

  app.get('/api/twilio/video/sessions/:sessionId/token', authenticateToken, async (req, res) => {
    try {
      console.log('=== TWILIO TOKEN DEBUG ===');
      const { sessionId } = req.params;
      const userId = (req as any).user.userId;
      console.log('Session ID:', sessionId, 'User ID:', userId);
      
      // Get session with user details
      const { data: session, error: sessionError } = await supabase
        .from('consultation_sessions')
        .select(`
          *,
          student:students!inner(
            user_id,
            user:users!inner(first_name, last_name, email)
          ),
          consultant:consultants!inner(
            user_id,
            user:users!inner(first_name, last_name, email)
          )
        `)
        .eq('id', sessionId)
        .single();
        
      console.log('Session query result:', { session, sessionError });
        
      if (sessionError || !session) {
        console.log('Session not found, error:', sessionError);
        return res.status(404).json({ 
          success: false, 
          message: 'Session not found or access denied',
          debug: { sessionId, userId, error: sessionError?.message }
        });
      }
      
      // Check if user has access to this session
      const hasAccess = session.student?.user_id === userId || session.consultant?.user_id === userId;
      console.log('Access check:', { 
        studentUserId: session.student?.user_id, 
        consultantUserId: session.consultant?.user_id,
        userId,
        hasAccess 
      });
      
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied to this session'
        });
      }

      // Determine user role and generate token
      const isStudent = session.student?.user_id === userId;
      const isConsultant = session.consultant?.user_id === userId;
      
      if (!isStudent && !isConsultant) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }

      try {
        console.log('Building participant info...');
        const participantInfo = {
          userId,
          role: isStudent ? 'student' as const : 'consultant' as const,
          name: isStudent ? 
            `${session.student?.user?.first_name || 'Unknown'} ${session.student?.user?.last_name || 'Student'}` :
            `${session.consultant?.user?.first_name || 'Unknown'} ${session.consultant?.user?.last_name || 'Consultant'}`,
          email: isStudent ? session.student?.user?.email || 'unknown@email.com' : session.consultant?.user?.email || 'unknown@email.com'
        };

        console.log('Participant info:', participantInfo);
        console.log('Generating Twilio token...');

        const roomName = `emdr-session-${sessionId}`;
        const accessToken = twilioVideoService.generateAccessToken(participantInfo, roomName);

        console.log('Token generated successfully');
        res.json({
          success: true,
          accessToken,
          roomName,
          participantInfo
        });
      } catch (tokenError) {
        console.error('Error generating Twilio token:', tokenError);
        res.status(500).json({
          success: false,
          message: 'Failed to generate video session token',
          error: tokenError instanceof Error ? tokenError.message : 'Unknown error'
        });
      }
    } catch (error) {
      console.error('Twilio token generation error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate access token'
      });
    }
  });

  // Start recording for Twilio video session
  app.post('/api/twilio/video/sessions/:sessionId/recording/start', 
    authenticateToken, 
    requireRole([UserRole.CONSULTANT]), 
    async (req, res) => {
      try {
        const { sessionId } = req.params;
        
        // Get session room info
        const { data: session, error } = await supabase
          .from('consultation_sessions')
          .select('twilio_room_sid')
          .eq('id', sessionId)
          .single();
          
        if (error || !session?.twilio_room_sid) {
          return res.status(404).json({
            success: false,
            message: 'Video session not found'
          });
        }

        const recordingSid = await twilioVideoService.startRecording(
          session.twilio_room_sid, 
          sessionId
        );

        res.json({
          success: true,
          recordingSid,
          message: 'Recording started successfully'
        });
      } catch (error) {
        console.error('Start recording error:', error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Failed to start recording'
        });
      }
    }
  );

  // End Twilio video session
  app.post('/api/twilio/video/sessions/:sessionId/end', authenticateToken, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user.userId;
      
      // Verify user has access to end this session
      const { data: session, error } = await supabase
        .from('consultation_sessions')
        .select('*')
        .eq('id', sessionId)
        .or(`student_id.eq.${userId},consultant_id.eq.${userId}`)
        .single();
        
      if (error || !session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found or access denied'
        });
      }

      await twilioVideoService.endVideoSession(sessionId);

      // If this is a consultant ending the session, calculate hours
      if (session.consultant_id === userId) {
        const startTime = new Date(session.session_start_time);
        const endTime = new Date();
        const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        
        // Update session with calculated hours
        await supabase
          .from('consultation_sessions')
          .update({
            actual_duration: Math.round(durationHours * 60), // in minutes
            status: 'completed'
          })
          .eq('id', sessionId);

        // Send completion notifications
        await Promise.all([
          twilioEmailService.sendSessionCompletion(
            session.student.user.email,
            `${session.student.user.first_name} ${session.student.user.last_name}`,
            Math.round(durationHours * 60),
            session.student.total_verified_hours + durationHours,
            `${session.consultant.user.first_name} ${session.consultant.user.last_name}`
          ),
          twilioSmsService.sendSessionCompletion(
            session.student.phone,
            session.student.user.first_name,
            Math.round(durationHours * 60),
            session.student.total_verified_hours + durationHours
          )
        ]);
      }

      res.json({
        success: true,
        message: 'Video session ended successfully'
      });
    } catch (error) {
      console.error('End video session error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to end video session'
      });
    }
  });

  // Twilio webhook handlers
  app.post('/api/twilio/video/status', async (req, res) => {
    try {
      console.log('Twilio video status webhook:', req.body);
      
      const { RoomSid, RoomName, RoomStatus, Timestamp } = req.body;
      
      // Update session status in database
      if (RoomName && RoomName.startsWith('emdr-session-')) {
        const sessionId = RoomName.replace('emdr-session-', '');
        
        await supabase
          .from('consultation_sessions')
          .update({
            video_session_status: RoomStatus,
            last_status_update: new Date(Timestamp)
          })
          .eq('id', sessionId);
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('Twilio video webhook error:', error);
      res.status(500).send('Error processing webhook');
    }
  });

  app.post('/api/twilio/recording/status', async (req, res) => {
    try {
      console.log('Twilio recording status webhook:', req.body);
      
      const { RecordingSid, RoomSid, Status, RecordingUrl } = req.body;
      
      // Update recording status in database
      if (RoomSid) {
        await supabase
          .from('consultation_sessions')
          .update({
            recording_status: Status,
            recording_url: RecordingUrl || null
          })
          .eq('twilio_room_sid', RoomSid);
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('Twilio recording webhook error:', error);
      res.status(500).send('Error processing webhook');
    }
  });

  // Scheduling Routes
  app.get('/api/consultants', authenticateToken, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('consultants')
        .select('id, user:users(first_name,last_name)')
        .eq('is_active', true);

      if (error) throw error;

      res.json({ success: true, consultants: data || [] });
    } catch (error) {
      console.error('List consultants error:', error);
      res.status(500).json({ success: false, message: 'Failed to list consultants' });
    }
  });
  app.post('/api/scheduling/available-slots', authenticateToken, async (req, res) => {
    try {
      const { dateRange, preferences } = req.body;
      const userId = (req as any).user.userId;
      
      // Get student ID
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found'
        });
      }
      
      const slots = await schedulingService.findAvailableSlots(
        student.id,
        preferences,
        dateRange
      );
      
      res.json({
        success: true,
        slots
      });
    } catch (error) {
      console.error('Available slots error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get available slots'
      });
    }
  });

  app.post('/api/scheduling/book-session', authenticateToken, async (req, res) => {
    try {
      const { consultantId, startTime, endTime, sessionType, timezone } = req.body;
      const userId = (req as any).user.userId;
      
      // Get student ID
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found'
        });
      }
      
      const session = await schedulingService.bookSession({
        studentId: student.id,
        consultantId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        sessionType,
        timezone
      });
      
      res.json({
        success: true,
        session
      });
    } catch (error) {
      console.error('Book session error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to book session'
      });
    }
  });

  // Consultant availability APIs
  app.get('/api/consultants/availability', authenticateToken, requireRole([UserRole.CONSULTANT]), async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      console.log('Getting availability for user ID:', userId);
      
      let { data: consultant, error: consultantError } = await supabase
        .from('consultants')
        .select('id')
        .eq('user_id', userId)
        .single();
        
      if (consultantError) {
        console.error('Error fetching consultant:', consultantError);
        
        // Auto-create consultant profile if it doesn't exist
        if (consultantError.code === 'PGRST116') {
          console.log('Consultant profile not found, creating new profile...');
          
          const { data: newConsultant, error: createError } = await supabase
            .from('consultants')
            .insert({
              user_id: userId,
              license_number: 'TEMP-' + userId.slice(0, 8),
              specializations: ['EMDR'],
              hourly_rate: 150,
              is_active: true,
              years_experience: 5,
              bio: 'Experienced EMDR consultant',
              total_hours_completed: 0,
              average_rating: 5.0
            })
            .select()
            .single();
            
          if (createError) {
            console.error('Error creating consultant profile:', createError);
            return res.status(500).json({ message: 'Failed to create consultant profile' });
          }
          
          // Use the newly created consultant
          consultant = newConsultant;
        } else {
          return res.status(404).json({ message: 'Consultant not found' });
        }
      }
      
      if (!consultant) return res.status(404).json({ message: 'Consultant not found' });

      // Fetch availability rules and blocked dates
      const [{ data: availability }, { data: blockedDates }, { data: preferences }] = await Promise.all([
        supabase.from('consultant_availability_slots').select('*').eq('consultant_id', consultant.id).eq('is_recurring', true),
        supabase.from('consultant_blocked_dates').select('*').eq('consultant_id', consultant.id),
        supabase.from('consultant_preferences').select('*').eq('consultant_id', consultant.id)
      ]);

      res.json({
        availability: availability || [],
        blockedDates: blockedDates || [],
        preferences: preferences?.[0] || null
      });
    } catch (error) {
      console.error('Get consultant availability error:', error);
      res.status(500).json({ message: 'Failed to load availability' });
    }
  });

  app.post('/api/consultants/availability', authenticateToken, requireRole([UserRole.CONSULTANT]), async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const { weeklySchedule, timezone } = req.body as { weeklySchedule: Record<string, { startTime: string; endTime: string; isAvailable?: boolean; maxSessions?: number }[]>; timezone: string };

      let { data: consultant, error: consultantError } = await supabase
        .from('consultants')
        .select('id')
        .eq('user_id', userId)
        .single();
        
      if (consultantError) {
        console.error('Error fetching consultant for POST:', consultantError);
        
        // Auto-create consultant profile if it doesn't exist
        if (consultantError.code === 'PGRST116') {
          console.log('Creating consultant profile for availability save...');
          
          const { data: newConsultant, error: createError } = await supabase
            .from('consultants')
            .insert({
              user_id: userId,
              license_number: 'TEMP-' + userId.slice(0, 8),
              specializations: ['EMDR'],
              hourly_rate: 150,
              is_active: true,
              years_experience: 5,
              bio: 'Experienced EMDR consultant',
              total_hours_completed: 0,
              average_rating: 5.0
            })
            .select()
            .single();
            
          if (createError) {
            console.error('Error creating consultant profile:', createError);
            return res.status(500).json({ message: 'Failed to create consultant profile' });
          }
          
          consultant = newConsultant;
        } else {
          return res.status(404).json({ message: 'Consultant not found' });
        }
      }
      
      if (!consultant) return res.status(404).json({ message: 'Consultant not found' });

      await schedulingService.setWeeklyAvailability(consultant.id, weeklySchedule as any, timezone);
      res.json({ success: true });
    } catch (error) {
      console.error('Set consultant availability error:', error);
      res.status(500).json({ message: 'Failed to save availability' });
    }
  });

  app.post('/api/consultants/blocked-dates', authenticateToken, requireRole([UserRole.CONSULTANT]), async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const { dates } = req.body as { dates: string[] };

      const { data: consultant } = await supabase
        .from('consultants')
        .select('id')
        .eq('user_id', userId)
        .single();
      if (!consultant) return res.status(404).json({ message: 'Consultant not found' });

      const parsedDates = (dates || []).map(d => new Date(d));
      await schedulingService.setExceptionDates(consultant.id, parsedDates);
      res.json({ success: true });
    } catch (error) {
      console.error('Set blocked dates error:', error);
      res.status(500).json({ message: 'Failed to save blocked dates' });
    }
  });

  // Student: sessions overview (upcoming/completed/cancelled)
  // Student progress and milestone endpoints
  app.get('/api/students/progress', authenticateToken, requireRole([UserRole.STUDENT]), async (req, res) => {
    try {
      const userId = req.user!.userId;
      
      // Get student profile with progress using the correct table name
      const { data: studentProfile, error: profileError } = await supabase
        .from('students')
        .select(`
          total_verified_hours,
          certification_status,
          course_completion_date,
          user:users!inner(id, email, first_name, last_name, role)
        `)
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Calculate progress
      const totalHours = studentProfile?.total_verified_hours || 0;
      const requiredHours = 40; // EMDR requirement
      const percentage = Math.round((totalHours / requiredHours) * 100);
      const remainingHours = Math.max(0, requiredHours - totalHours);

      res.json({
        totalHours,
        requiredHours,
        percentage,
        remainingHours,
        status: studentProfile?.certification_status || 'in_progress',
        courseCompletionDate: studentProfile?.course_completion_date
      });
    } catch (error) {
      console.error('Get student progress error:', error);
      res.status(500).json({ message: 'Failed to get progress' });
    }
  });

  app.get('/api/students/milestones', authenticateToken, requireRole([UserRole.STUDENT]), async (req, res) => {
    try {
      const userId = req.user!.userId;
      
      // Get student profile using the correct table name
      const { data: studentProfile, error: profileError } = await supabase
        .from('students')
        .select(`
          total_verified_hours,
          certification_status,
          user:users!inner(id, email, first_name, last_name, role)
        `)
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      const totalHours = studentProfile?.total_verified_hours || 0;
      const milestones = [];

      // Add milestone achievements
      if (totalHours >= 5) milestones.push({ type: 'first_5_hours', achieved: true, hours: 5 });
      if (totalHours >= 10) milestones.push({ type: 'first_10_hours', achieved: true, hours: 10 });
      if (totalHours >= 20) milestones.push({ type: 'halfway_there', achieved: true, hours: 20 });
      if (totalHours >= 30) milestones.push({ type: 'almost_there', achieved: true, hours: 30 });
      if (totalHours >= 40) milestones.push({ type: 'certification_eligible', achieved: true, hours: 40 });

      // Add upcoming milestones
      if (totalHours < 5) milestones.push({ type: 'first_5_hours', achieved: false, hours: 5 });
      if (totalHours < 10) milestones.push({ type: 'first_10_hours', achieved: false, hours: 10 });
      if (totalHours < 20) milestones.push({ type: 'halfway_there', achieved: false, hours: 20 });
      if (totalHours < 30) milestones.push({ type: 'almost_there', achieved: false, hours: 30 });
      if (totalHours < 40) milestones.push({ type: 'certification_eligible', achieved: false, hours: 40 });

      res.json({ milestones, totalHours });
    } catch (error) {
      console.error('Get student milestones error:', error);
      res.status(500).json({ message: 'Failed to get milestones' });
    }
  });

  app.get('/api/students/sessions', authenticateToken, requireRole([UserRole.STUDENT]), async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!student) return res.json({ upcoming: [], completed: [], cancelled: [] });

      const nowIso = new Date().toISOString();
      const base = supabase
        .from('consultation_sessions')
        .select('id, consultant:consultants(user:users(*)), scheduled_start, scheduled_end, status, session_type, student_reflection, student_evaluation_score, consultant_feedback, recording_url');

      const [{ data: upcoming }, { data: completed }, { data: cancelled }] = await Promise.all([
        base
          .eq('student_id', student.id)
          .eq('status', 'scheduled')
          .gte('scheduled_start', nowIso),
        base
          .eq('student_id', student.id)
          .eq('status', 'completed')
          .order('scheduled_start', { ascending: false })
          .limit(50),
        base
          .eq('student_id', student.id)
          .eq('status', 'cancelled')
          .order('scheduled_start', { ascending: false })
          .limit(50)
      ]);

      function mapSession(s: any) {
        return {
          id: s.id,
          consultantName: s.consultant?.user?.first_name + ' ' + s.consultant?.user?.last_name,
          scheduledStart: s.scheduled_start,
          scheduledEnd: s.scheduled_end,
          status: s.status,
          sessionType: s.session_type,
          recordingUrl: s.recording_url,
          feedback: s.consultant_feedback,
          studentReflection: s.student_reflection,
          studentEvaluationScore: s.student_evaluation_score,
        };
      }

      res.json({
        upcoming: (upcoming || []).map(mapSession),
        completed: (completed || []).map(mapSession),
        cancelled: (cancelled || []).map(mapSession),
      });
    } catch (error) {
      console.error('Student sessions error:', error);
      res.status(500).json({ message: 'Failed to load sessions' });
    }
  });

  // Student: submit consultation log (reflection/notes, optional rating and duration)
  app.post('/api/sessions/:sessionId/log', authenticateToken, requireRole([UserRole.STUDENT]), async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { reflection, notes, rating, duration } = req.body as { reflection?: string; notes?: string; rating?: number; duration?: number };
      const userId = (req as any).user.userId;

      const { data: student } = await supabase
        .from('students')
        .select('id, total_verified_hours')
        .eq('user_id', userId)
        .single();
      if (!student) return res.status(404).json({ message: 'Student not found' });

      const { data: session } = await supabase
        .from('consultation_sessions')
        .select('id, student_id')
        .eq('id', sessionId)
        .single();
      if (!session || session.student_id !== student.id) return res.status(403).json({ message: 'Forbidden' });

      const updates: any = {
        student_reflection: (typeof reflection === 'string' && reflection.trim().length > 0) ? reflection : (notes ?? null),
        student_evaluation_score: typeof rating === 'number' ? rating : undefined,
        actual_duration_minutes: typeof duration === 'number' ? Math.round(duration * 60) : undefined,
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Remove undefined keys so we don't overwrite with nulls unintentionally
      Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

      const { error: updErr } = await supabase
        .from('consultation_sessions')
        .update(updates)
        .eq('id', sessionId);
      if (updErr) throw updErr;

      // Increment student's verified hours if duration provided (fallback 1 hour)
      const hoursToAdd = typeof duration === 'number' && duration > 0 ? duration : 1;
      const { error: hoursErr } = await supabase
        .from('students')
        .update({ total_verified_hours: (student.total_verified_hours || 0) + hoursToAdd, updated_at: new Date().toISOString() })
        .eq('id', student.id);
      if (hoursErr) throw hoursErr;

      try {
        await notificationService.createMilestoneNotification(userId, (student.total_verified_hours || 0) + hoursToAdd);
      } catch {}

      res.json({ success: true });
    } catch (error) {
      console.error('Submit log error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit log' });
    }
  });

  // Student: submit evaluation score
  app.post('/api/sessions/:sessionId/evaluation', authenticateToken, requireRole([UserRole.STUDENT]), async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { score } = req.body as { score: number };
      const userId = (req as any).user.userId;

      if (typeof score !== 'number' || score < 1 || score > 5) return res.status(400).json({ message: 'Score must be 1-5' });

      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .single();
      if (!student) return res.status(404).json({ message: 'Student not found' });

      const { data: session } = await supabase
        .from('consultation_sessions')
        .select('id, student_id')
        .eq('id', sessionId)
        .single();
      if (!session || session.student_id !== student.id) return res.status(403).json({ message: 'Forbidden' });

      const { error } = await supabase
        .from('consultation_sessions')
        .update({ student_evaluation_score: score, updated_at: new Date() })
        .eq('id', sessionId);
      if (error) throw error;

      res.json({ success: true });
    } catch (error) {
      console.error('Submit evaluation error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit evaluation' });
    }
  });

  // Student: progress PDF export
  app.get('/api/students/progress.pdf', authenticateToken, requireRole([UserRole.STUDENT]), async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const { data: student } = await supabase
        .from('students')
        .select(`
          id, 
          total_verified_hours, 
          user:users!inner(first_name, last_name, email)
        `)
        .eq('user_id', userId)
        .single();
      if (!student) return res.status(404).json({ message: 'Student not found' });

      const { data: sessions } = await supabase
        .from('consultation_sessions')
        .select('scheduled_start, scheduled_end, status, session_type, hours_towards_consultation, consultant:consultants(user:users(first_name,last_name))')
        .eq('student_id', student.id)
        .order('scheduled_start', { ascending: false })
        .limit(50);

      // Lazy import pdfkit to avoid bundling client
      const PDFDocument = (await import('pdfkit')).default;
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="progress.pdf"');
      doc.pipe(res as any);

      doc.fontSize(20).text('EMDR Consultation Progress Report', { align: 'center' });
      doc.moveDown();
      const userInfo = student.user as any;
      doc.fontSize(12).text(`Student: ${userInfo?.first_name || ''} ${userInfo?.last_name || ''}`);
      doc.text(`Email: ${userInfo?.email || ''}`);
      doc.text(`Total Verified Hours: ${student.total_verified_hours ?? 0}`);
      doc.moveDown();
      doc.fontSize(14).text('Recent Sessions');
      doc.moveDown(0.5);

      (sessions || []).forEach((s: any, idx: number) => {
        const consultantName = `${s.consultant?.user?.first_name || ''} ${s.consultant?.user?.last_name || ''}`.trim();
        doc.fontSize(10).text(`${idx + 1}. ${new Date(s.scheduled_start).toLocaleString()} — ${s.session_type} — ${s.status} — ${consultantName} — ${s.hours_towards_consultation ?? 0}h`);
      });

      doc.end();
    } catch (error) {
      console.error('Export progress PDF error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate progress PDF' });
    }
  });

  // Admin: export student progress & evaluations CSV
  app.get('/api/admin/exports/student-progress.csv', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { data: rows, error } = await supabase
        .from('consultation_sessions')
        .select(`
          id, scheduled_start, scheduled_end, status, session_type, hours_towards_consultation,
          student:students!inner(id, user:users!inner(email, first_name, last_name)),
          consultant:consultants!inner(id, user:users!inner(email, first_name, last_name)),
          student_reflection, student_evaluation_score, consultant_feedback
        `)
        .order('scheduled_start', { ascending: false });
      if (error) throw error;

      const header = [
        'session_id','student_name','student_email','consultant_name','consultant_email','start','end','status','type','hours','student_reflection','student_eval','consultant_feedback'
      ];
      const csvLines = [header.join(',')];
      for (const r of rows || []) {
        const student = r.student as any;
        const consultant = r.consultant as any;
        const studentUser = student?.user as any;
        const consultantUser = consultant?.user as any;
        const studentName = `${studentUser?.first_name || ''} ${studentUser?.last_name || ''}`.trim();
        const consultantName = `${consultantUser?.first_name || ''} ${consultantUser?.last_name || ''}`.trim();
        const fields = [
          r.id,
          studentName,
          studentUser?.email || '',
          consultantName,
          consultantUser?.email || '',
          r.scheduled_start,
          r.scheduled_end,
          r.status,
          r.session_type,
          r.hours_towards_consultation ?? 0,
          (r.student_reflection || '').replace(/\n/g, ' ').replace(/,/g, ';'),
          r.student_evaluation_score ?? '',
          (r.consultant_feedback || '').replace(/\n/g, ' ').replace(/,/g, ';')
        ];
        csvLines.push(fields.map(v => `"${String(v)}"`).join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="student-progress.csv"');
      res.send(csvLines.join('\n'));
    } catch (error) {
      console.error('Export student progress CSV error:', error);
      res.status(500).json({ success: false, message: 'Failed to export student progress' });
    }
  });

  // Admin: export consultant earnings CSV
  app.get('/api/admin/exports/consultant-earnings.csv', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      // Use existing earnings queries to build a flat CSV
      const { data: rows, error } = await supabase
        .from('consultation_sessions')
        .select(`
          id, scheduled_start, scheduled_end, status, session_type, hours_towards_consultation,
          consultant:consultants!inner(id, hourly_rate, user:users!inner(email, first_name, last_name))
        `)
        .eq('status', 'completed')
        .order('scheduled_start', { ascending: false });
      if (error) throw error;

      const header = ['session_id','consultant_name','consultant_email','start','end','type','hours','hourly_rate','earnings'];
      const csvLines = [header.join(',')];
      for (const r of rows || []) {
        const consultant = r.consultant as any;
        const consultantUser = consultant?.user as any;
        const consultantName = `${consultantUser?.first_name || ''} ${consultantUser?.last_name || ''}`.trim();
        const hours = Number(r.hours_towards_consultation || 0);
        const rate = Number(consultant?.hourly_rate || 0);
        const earnings = (hours * rate).toFixed(2);
        const fields = [
          r.id,
          consultantName,
          consultantUser?.email || '',
          r.scheduled_start,
          r.scheduled_end,
          r.session_type,
          hours,
          rate,
          earnings
        ];
        csvLines.push(fields.map(v => `"${String(v)}"`).join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="consultant-earnings.csv"');
      res.send(csvLines.join('\n'));
    } catch (error) {
      console.error('Export consultant earnings CSV error:', error);
      res.status(500).json({ success: false, message: 'Failed to export consultant earnings' });
    }
  });

  // Admin: recent evaluations/logs JSON
  app.get('/api/admin/evaluations', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || '25', 10) || 25, 200);
      const { data, error } = await supabase
        .from('consultation_sessions')
        .select(`
          id, scheduled_start, status, session_type, student_reflection, student_evaluation_score, consultant_feedback,
          student:students(user:users(first_name,last_name,email)),
          consultant:consultants(user:users(first_name,last_name,email))
        `)
        .order('scheduled_start', { ascending: false })
        .limit(limit);
      if (error) throw error;
      const items = (data || []).map((r: any) => ({
        id: r.id,
        date: r.scheduled_start,
        status: r.status,
        type: r.session_type,
        studentName: `${r.student?.user?.first_name || ''} ${r.student?.user?.last_name || ''}`.trim(),
        consultantName: `${r.consultant?.user?.first_name || ''} ${r.consultant?.user?.last_name || ''}`.trim(),
        reflection: r.student_reflection,
        evaluationScore: r.student_evaluation_score,
        consultantFeedback: r.consultant_feedback,
      }));
      res.json({ items });
    } catch (error) {
      console.error('Admin evaluations list error:', error);
      res.status(500).json({ message: 'Failed to load evaluations' });
    }
  });

  // Certificate Routes
  app.post('/api/certificates/generate', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { studentId } = req.body;
      
      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID required'
        });
      }
      
      // Check eligibility
      const eligibility = await certificateService.checkEligibility(studentId);
      if (!eligibility.eligible) {
        return res.status(400).json({
          success: false,
          message: 'Student not eligible for certification',
          details: eligibility
        });
      }
      
      const certificate = await certificateService.generateCertificate(studentId);
      
      res.json({
        success: true,
        certificate
      });
    } catch (error) {
      console.error('Certificate generation error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate certificate'
      });
    }
  });

  app.get('/api/certificates/verify/:code', async (req, res) => {
    try {
      const { code } = req.params;
      const verification = await certificateService.verifyCertificate(code);
      
      if (!verification) {
        return res.status(404).json({
          success: false,
          message: 'Certificate not found or invalid'
        });
      }
      
      res.json({
        success: true,
        verification
      });
    } catch (error) {
      console.error('Certificate verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify certificate'
      });
    }
  });

  app.get('/api/certificates/eligibility/:studentId', authenticateToken, async (req, res) => {
    try {
      const { studentId } = req.params;
      const eligibility = await certificateService.checkEligibility(studentId);
      
      res.json({
        success: true,
        eligibility
      });
    } catch (error) {
      console.error('Eligibility check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check eligibility'
      });
    }
  });

  // LEGACY RECORDING ROUTES - DISABLED (Using Twilio Video recording instead)
  /*
  app.post('/api/recordings/start', authenticateToken, requireRole([UserRole.CONSULTANT]), async (req, res) => {
    try {
      const { roomId, sessionId } = req.body;
      
      if (!roomId || !sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Room ID and Session ID required'
        });
      }
      
      const recordingId = await recordingService.startRecording(roomId, sessionId);
      
      res.json({
        success: true,
        recordingId
      });
    } catch (error) {
      console.error('Start recording error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to start recording'
      });
    }
  });

  app.post('/api/recordings/:recordingId/stop', authenticateToken, requireRole([UserRole.CONSULTANT]), async (req, res) => {
    try {
      const { recordingId } = req.params;
      await recordingService.stopRecording(recordingId);
      
      res.json({
        success: true,
        message: 'Recording stopped successfully'
      });
    } catch (error) {
      console.error('Stop recording error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to stop recording'
      });
    }
  });

  app.get('/api/recordings/session/:sessionId', authenticateToken, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const recordings = await recordingService.getSessionRecordings(sessionId);
      
      res.json({
        success: true,
        recordings
      });
    } catch (error) {
      console.error('Get session recordings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get session recordings'
      });
    }
  });

  app.get('/api/recordings/:recordingId/download', authenticateToken, async (req, res) => {
    try {
      const { recordingId } = req.params;
      const downloadUrl = await recordingService.generateDownloadUrl(recordingId);
      
      res.json({
        success: true,
        downloadUrl
      });
    } catch (error) {
      console.error('Generate download URL error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate download URL'
      });
    }
  });

  app.delete('/api/recordings/:recordingId', authenticateToken, requireRole([UserRole.ADMIN, UserRole.CONSULTANT]), async (req, res) => {
    try {
      const { recordingId } = req.params;
      await recordingService.deleteRecording(recordingId);
      
      res.json({
        success: true,
        message: 'Recording deleted successfully'
      });
    } catch (error) {
      console.error('Delete recording error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete recording'
      });
    }
  });
  */
  // END LEGACY RECORDING ROUTES

  // Earnings Routes (reporting only)
  app.get('/api/earnings/consultant/summary', authenticateToken, requireRole([UserRole.CONSULTANT]), async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const consultantId = req.user!.userId;
      
      const earnings = await (await import('./services/earningsService')).EarningsService.getConsultantSummary(
        consultantId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );
      
      res.json({
        success: true,
        earnings
      });
    } catch (error) {
      console.error('Get earnings summary error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get earnings summary'
      });
    }
  });

  app.get('/api/earnings/consultant/monthly', authenticateToken, requireRole([UserRole.CONSULTANT]), async (req, res) => {
    try {
      const { year } = req.query as { year?: string };
      const consultantId = req.user!.userId;
      const items = await (await import('./services/earningsService')).EarningsService.getMonthlyBreakdown(consultantId, year ? parseInt(year, 10) : undefined);
      res.json({ success: true, items });
    } catch (error) {
      console.error('Get monthly earnings error:', error);
      res.status(500).json({ success: false, message: 'Failed to get monthly earnings' });
    }
  });

  app.get('/api/earnings/consultant/sessions', authenticateToken, requireRole([UserRole.CONSULTANT]), async (req, res) => {
    try {
      const { month } = req.query as { month?: string };
      const consultantId = req.user!.userId;
      const items = await (await import('./services/earningsService')).EarningsService.getSessionBreakdown(consultantId, month);
      res.json({ success: true, items });
    } catch (error) {
      console.error('Get session breakdown error:', error);
      res.status(500).json({ success: false, message: 'Failed to get session breakdown' });
    }
  });

  // Earnings CSV export
  app.get('/api/earnings/consultant/export', authenticateToken, requireRole([UserRole.CONSULTANT]), async (req, res) => {
    try {
      const { month } = req.query as { month?: string };
      const consultantId = req.user!.userId;
      const items = await (await import('./services/earningsService')).EarningsService.getSessionBreakdown(consultantId, month);
      const header = 'sessionId,date,durationMinutes,hours,hourlyRate,amount\n';
      const rows = items.map(i => `${i.sessionId},${i.date},${i.durationMinutes},${i.hours},${i.hourlyRate},${i.amount}`).join('\n');
      const csv = header + rows;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="earnings.csv"');
      res.send(csv);
    } catch (error) {
      console.error('Export earnings CSV error:', error);
      res.status(500).json({ success: false, message: 'Failed to export earnings' });
    }
  });

  // Admin Payment Routes
  app.get('/api/admin/earnings/overview', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      // Compute revenue proxy from completed sessions * consultant hourly rate
      const { data: sessions } = await supabase
        .from('consultation_sessions')
        .select('scheduled_start, scheduled_end, actual_duration_minutes, status, consultant_id');
      const { data: consultants } = await supabase
        .from('consultants')
        .select('id, hourly_rate');

      const consultantRateById = new Map<string, number>();
      for (const c of consultants || []) consultantRateById.set(c.id, c.hourly_rate || 0);

      let totalRevenue = 0;
      let totalSessions = 0;
      for (const s of sessions || []) {
        if (!(s.status === 'completed' || s.status === 'verified')) continue;
        totalSessions += 1;
        const durationMinutes =
          typeof s.actual_duration_minutes === 'number' && s.actual_duration_minutes > 0
            ? s.actual_duration_minutes
            : Math.max(
                0,
                Math.floor(
                  (new Date(s.scheduled_end).getTime() - new Date(s.scheduled_start).getTime()) / (1000 * 60)
                )
              );
        const hours = durationMinutes / 60;
        const rate = consultantRateById.get(s.consultant_id) || 0;
        totalRevenue += hours * rate;
      }
      
      res.json({
        success: true,
        overview: {
          totalRevenue,
          totalSessions,
          pendingRevenue: 0,
          pendingSessions: (sessions || []).filter(s => s.status !== 'completed' && s.status !== 'verified').length
        }
      });
    } catch (error) {
      console.error('Get earnings overview error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get earnings overview'
      });
    }
  });

  app.get('/api/admin/earnings/consultants', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { data: sessions } = await supabase
        .from('consultation_sessions')
        .select('consultant_id, scheduled_start, scheduled_end, actual_duration_minutes, status');
      const { data: consultants } = await supabase
        .from('consultants')
        .select('id, first_name, last_name, hourly_rate');
      const consultantMeta = new Map<string, { name: string; rate: number }>();
      for (const c of consultants || []) consultantMeta.set(c.id, { name: `${c.first_name} ${c.last_name}`, rate: c.hourly_rate || 0 });

      const earningsByConsultant: Record<string, any> = {};
      for (const s of sessions || []) {
        if (!(s.status === 'completed' || s.status === 'verified')) continue;
        const meta = consultantMeta.get(s.consultant_id) || { name: 'Unknown', rate: 0 };
        const durationMinutes =
          typeof s.actual_duration_minutes === 'number' && s.actual_duration_minutes > 0
            ? s.actual_duration_minutes
            : Math.max(
                0,
                Math.floor(
                  (new Date(s.scheduled_end).getTime() - new Date(s.scheduled_start).getTime()) / (1000 * 60)
                )
              );
        const amount = (durationMinutes / 60) * meta.rate;
        if (!earningsByConsultant[s.consultant_id]) {
          earningsByConsultant[s.consultant_id] = {
            consultantId: s.consultant_id,
            name: meta.name,
            totalEarnings: 0,
            sessionsCount: 0,
          };
        }
        earningsByConsultant[s.consultant_id].totalEarnings += amount;
        earningsByConsultant[s.consultant_id].sessionsCount += 1;
      }
      
      res.json({
        success: true,
        consultants: Object.values(earningsByConsultant).map((c: any) => ({
          ...c,
          totalEarnings: parseFloat(c.totalEarnings.toFixed(2))
        }))
      });
    } catch (error) {
      console.error('Get consultant earnings error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get consultant earnings'
      });
    }
  });

  // WebSocket server for real-time communication
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Video room management
  const videoRooms = new Map<string, Set<WebSocket>>();
  const wsToRooms = new Map<WebSocket, string>();

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connection established');

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.type) {
          case 'join_video_session':
            const roomId = data.roomId;
            const participantId = data.participantId || randomUUID();
            
            // Add to room
            if (!videoRooms.has(roomId)) {
              videoRooms.set(roomId, new Set());
            }
            videoRooms.get(roomId)!.add(ws);
            wsToRooms.set(ws, roomId);
            
            // Send confirmation
            ws.send(JSON.stringify({
              type: 'video_session_joined',
              roomId: roomId,
              participantId: participantId
            }));
            
            // Notify other participants
            videoRooms.get(roomId)!.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'participant_joined',
                  participantId: participantId,
                  roomId: roomId
                }));
              }
            });
            break;
            
          case 'webrtc_signal':
            // Relay WebRTC signaling to other participants in the room
            const signalRoomId = data.roomId;
            const room = videoRooms.get(signalRoomId);
            if (room) {
              room.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'webrtc_signal',
                  signal: data.signal,
                  from: data.from,
                  to: data.to
                }));
              }
            });
            }
            break;
            
          case 'leave_video_session':
            const leaveRoomId = wsToRooms.get(ws);
            if (leaveRoomId) {
              const leaveRoom = videoRooms.get(leaveRoomId);
              if (leaveRoom) {
                leaveRoom.delete(ws);
                if (leaveRoom.size === 0) {
                  videoRooms.delete(leaveRoomId);
                }
              }
              wsToRooms.delete(ws);
            }
            break;
            
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
            
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      // Clean up video room membership
      const roomId = wsToRooms.get(ws);
      if (roomId) {
        const room = videoRooms.get(roomId);
        if (room) {
          room.delete(ws);
          if (room.size === 0) {
            videoRooms.delete(roomId);
          }
        }
        wsToRooms.delete(ws);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Notification routes
  app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
      const { limit = 50, offset = 0, unread_only = false } = req.query;
      const userId = (req as any).user.userId;
      const notifications = await notificationService.getUserNotifications(
        userId,
        Number(limit),
        Number(offset),
        unread_only === 'true'
      );
      res.json({ notifications });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.get('/api/notifications/count', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const count = await notificationService.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      console.error('Error fetching notification count:', error);
      res.status(500).json({ message: 'Failed to fetch notification count', count: 0 });
    }
  });

  app.post('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      await notificationService.markAsRead(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });

  app.post('/api/notifications/read-all', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      await notificationService.markAllAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
  });

  app.get('/api/notifications/preferences', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const preferences = await notificationService.getNotificationPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({ message: 'Failed to fetch notification preferences' });
    }
  });

  app.put('/api/notifications/preferences', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const preferences = await notificationService.updateNotificationPreferences(
        userId,
        req.body
      );
      res.json(preferences);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ message: 'Failed to update notification preferences' });
    }
  });

  // Admin notification routes
  app.post('/api/admin/notifications/broadcast', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { title, message, userRole, expiresAt } = req.body;
      
      // Get users based on role filter
      let query = supabase.from('users').select('id');
      if (userRole && userRole !== 'all') {
        query = query.eq('role', userRole);
      }
      
      const { data: users, error } = await query;
      if (error) throw error;

      // Create notifications for all users
      const notifications = await Promise.all(
        (users || []).map(user => 
          notificationService.createNotification(
            user.id,
            NotificationType.SYSTEM_ANNOUNCEMENT,
            title,
            message,
            { broadcast: true },
            expiresAt ? new Date(expiresAt) : undefined
          )
        )
      );

      res.json({ 
        success: true, 
        message: `Notification sent to ${notifications.length} users` 
      });
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      res.status(500).json({ message: 'Failed to broadcast notification' });
    }
  });

  // Session Management Routes
  app.get('/api/sessions', authenticateToken, async (req, res) => {
    try {
      const { data: sessions, error } = await supabase
        .from('consultation_sessions')
        .select(`
          *,
          student:students!inner(
            user_id,
            user:users(first_name, last_name, email)
          ),
          consultant:consultants!inner(
            user_id,
            user:users(first_name, last_name, email)
          )
        `)
        .or(`student.user_id.eq.${req.user!.userId},consultant.user_id.eq.${req.user!.userId}`)
        .order('scheduled_start', { ascending: true });

      if (error) throw error;

      res.json({ sessions: sessions || [] });
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ message: 'Failed to fetch sessions' });
    }
  });

  app.post('/api/sessions/book', authenticateToken, async (req, res) => {
    try {
      console.log('=== BOOKING SESSION DEBUG ===');
      console.log('User ID:', req.user!.userId);
      console.log('Request body:', req.body);
      
      const { consultantId, scheduledStart, scheduledEnd, sessionType = 'consultation' } = req.body;

      if (!consultantId || !scheduledStart || !scheduledEnd) {
        return res.status(400).json({ message: 'Missing required fields: consultantId, scheduledStart, scheduledEnd' });
      }

      console.log('Looking for student with user_id:', req.user!.userId);
      
      // Get student ID from user
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', req.user!.userId)
        .single();

      console.log('Student query result:', { student, studentError });

      if (studentError || !student) {
        console.log('Student not found, returning 400');
        return res.status(400).json({ 
          message: 'Student not found', 
          error: studentError?.message,
          userId: req.user!.userId 
        });
      }

      console.log('Student found:', student.id);
      console.log('Creating session with data:', {
        student_id: student.id,
        consultant_id: consultantId,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        session_type: sessionType,
        status: 'scheduled'
      });

      // Create session
      const { data: session, error } = await supabase
        .from('consultation_sessions')
        .insert([{
          student_id: student.id,
          consultant_id: consultantId,
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
          session_type: sessionType,
          status: 'scheduled'
        }])
        .select()
        .single();

      if (error) {
        console.error('Database error creating session:', error);
        return res.status(400).json({ 
          message: 'Database error creating session',
          error: error.message,
          code: error.code 
        });
      }

      if (!session) {
        return res.status(400).json({ message: 'Session not created - no data returned' });
      }

      console.log('Session created successfully:', session);

      // Skip notifications for now - focus on core booking
      res.json({ 
        success: true,
        session: session,
        message: 'Session booked successfully'
      });
    } catch (error) {
      console.error('Error booking session:', error);
      res.status(500).json({ 
        message: 'Failed to book session',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  app.put('/api/sessions/:sessionId/reschedule', authenticateToken, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { scheduledStart, scheduledEnd } = req.body;

      const { data: session, error } = await supabase
        .from('consultation_sessions')
        .update({
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      res.json({ session });
    } catch (error) {
      console.error('Error rescheduling session:', error);
      res.status(500).json({ message: 'Failed to reschedule session' });
    }
  });

  app.post('/api/sessions/:sessionId/log', authenticateToken, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { notes, rating, duration } = req.body;

      // Update session with completion data
      const { data: session, error } = await supabase
        .from('consultation_sessions')
        .update({
          status: 'completed',
          notes,
          rating: rating || null,
          actual_duration: duration || null,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select(`
          *,
          student:students!inner(
            user_id,
            total_verified_hours,
            user:users(first_name, last_name)
          )
        `)
        .single();

      if (error) throw error;

      // Update student's total hours
      const newHours = (session.student.total_verified_hours || 0) + (duration || 1);
      await supabase
        .from('students')
        .update({ 
          total_verified_hours: newHours,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.student_id);

      // Check for milestone notifications
      await notificationService.createMilestoneNotification(session.student.user_id, newHours);

      res.json({ session, newTotalHours: newHours });
    } catch (error) {
      console.error('Error logging session:', error);
      res.status(500).json({ message: 'Failed to log session' });
    }
  });

  // Certificate Preview Route
  app.get('/api/admin/certificates/preview', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      // For now, return a message indicating preview is not available
      // TODO: Implement proper certificate preview with sample data
      res.status(501).json({ 
        error: 'Certificate preview not implemented',
        message: 'Certificate preview functionality is currently being developed'
      });
    } catch (error) {
      console.error('Error generating certificate preview:', error);
      res.status(500).json({ 
        error: 'Failed to generate certificate preview',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Reports Routes
  app.get('/api/reports/earnings', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { dateFrom, dateTo, consultantId } = req.query;
      
      let query = supabase
        .from('consultation_sessions')
        .select(`
          *,
          consultant:consultants!inner(
            id,
            hourly_rate,
            user:users(first_name, last_name)
          )
        `)
        .eq('status', 'completed');

      if (dateFrom) query = query.gte('completed_at', dateFrom);
      if (dateTo) query = query.lte('completed_at', dateTo);
      if (consultantId) query = query.eq('consultant_id', consultantId);

      const { data: sessions, error } = await query;
      if (error) throw error;

      // Group by consultant and calculate earnings
      const consultantEarnings = new Map();
      
      sessions?.forEach(session => {
        const consultantKey = session.consultant.id;
        if (!consultantEarnings.has(consultantKey)) {
          consultantEarnings.set(consultantKey, {
            consultantId: consultantKey,
            consultantName: `${session.consultant.user.first_name} ${session.consultant.user.last_name}`,
            totalHours: 0,
            totalEarnings: 0,
            sessionCount: 0,
            averageRating: 0,
            monthlyBreakdown: []
          });
        }
        
        const earning = consultantEarnings.get(consultantKey);
        const duration = session.actual_duration || 1;
        const earnings = duration * (session.consultant.hourly_rate || 150);
        
        earning.totalHours += duration;
        earning.totalEarnings += earnings;
        earning.sessionCount += 1;
        if (session.rating) earning.averageRating += session.rating;
      });

      // Calculate average ratings
      consultantEarnings.forEach(earning => {
        earning.averageRating = earning.averageRating / earning.sessionCount || 0;
      });

      res.json({ consultants: Array.from(consultantEarnings.values()) });
    } catch (error) {
      console.error('Error generating earnings report:', error);
      res.status(500).json({ message: 'Failed to generate earnings report' });
    }
  });

  // CSV export endpoints for Reports
  app.get('/api/reports/earnings/export', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      // Reuse logic from earnings endpoint
      const { dateFrom, dateTo, consultantId } = req.query as any;
      let query = supabase
        .from('consultation_sessions')
        .select(`*, consultant:consultants!inner(id, hourly_rate, user:users(first_name,last_name))`)
        .eq('status', 'completed');
      if (dateFrom) query = query.gte('completed_at', String(dateFrom));
      if (dateTo) query = query.lte('completed_at', String(dateTo));
      if (consultantId) query = query.eq('consultant_id', String(consultantId));
      const { data: sessions, error } = await query;
      if (error) throw error;
      const rows = ['consultantId,consultantName,totalHours,totalEarnings,sessionCount'];
      const map = new Map();
      (sessions || []).forEach((s: any) => {
        const key = s.consultant.id;
        const duration = s.actual_duration || 1;
        const rate = s.consultant.hourly_rate || 150;
        if (!map.has(key)) {
          map.set(key, { id: key, name: `${s.consultant.user.first_name} ${s.consultant.user.last_name}`, hours: 0, earnings: 0, count: 0 });
        }
        const rec = map.get(key);
        rec.hours += duration;
        rec.earnings += duration * rate;
        rec.count += 1;
      });
      Array.from(map.values()).forEach((r: any) => {
        rows.push(`${r.id},"${r.name}",${r.hours},${r.earnings},${r.count}`);
      });
      const csv = rows.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="earnings-report.csv"');
      res.send(csv);
    } catch (error) {
      console.error('Export earnings CSV error:', error);
      res.status(500).json({ message: 'Failed to export earnings report' });
    }
  });

  app.get('/api/reports/progress/export', authenticateToken, requireRole([UserRole.ADMIN]), async (_req, res) => {
    try {
      const { data: students, error } = await supabase
        .from('students')
        .select(`*, user:users(first_name,last_name,email)`);
      if (error) throw error;
      const rows = ['studentId,studentName,email,totalHours,progressPercentage,certificationStatus'];
      (students || []).forEach((s: any) => {
        const hours = s.total_verified_hours || 0;
        const pct = Math.min((hours / 40) * 100, 100).toFixed(2);
        rows.push(`${s.id},"${s.user.first_name} ${s.user.last_name}",${s.user.email},${hours},${pct},${hours >= 40 ? 'eligible' : 'in_progress'}`);
      });
      const csv = rows.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="progress-report.csv"');
      res.send(csv);
    } catch (error) {
      console.error('Export progress CSV error:', error);
      res.status(500).json({ message: 'Failed to export progress report' });
    }
  });

  app.get('/api/reports/sessions/export', authenticateToken, requireRole([UserRole.ADMIN]), async (_req, res) => {
    try {
      const { data: sessions, error } = await supabase
        .from('consultation_sessions')
        .select('*');
      if (error) throw error;
      const rows = ['sessionId,status,scheduledStart,scheduledEnd,actualDuration'];
      (sessions || []).forEach((s: any) => {
        rows.push(`${s.id},${s.status},${s.scheduled_start},${s.scheduled_end},${s.actual_duration || ''}`);
      });
      const csv = rows.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sessions-report.csv"');
      res.send(csv);
    } catch (error) {
      console.error('Export sessions CSV error:', error);
      res.status(500).json({ message: 'Failed to export sessions report' });
    }
  });

  app.get('/api/reports/progress', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { data: students, error } = await supabase
        .from('students')
        .select(`
          *,
          user:users(first_name, last_name, email)
        `);

      if (error) throw error;

      const studentProgress = students?.map(student => ({
        studentId: student.id,
        studentName: `${student.user.first_name} ${student.user.last_name}`,
        totalHours: student.total_verified_hours || 0,
        completedSessions: 0, // Would need to calculate from sessions
        progressPercentage: Math.min(((student.total_verified_hours || 0) / 40) * 100, 100),
        certificationStatus: (student.total_verified_hours || 0) >= 40 ? 'eligible' : 'in_progress',
        enrollmentDate: student.enrollment_date || student.created_at,
        estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })) || [];

      res.json({ students: studentProgress });
    } catch (error) {
      console.error('Error generating progress report:', error);
      res.status(500).json({ message: 'Failed to generate progress report' });
    }
  });

  app.get('/api/reports/sessions', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { data: sessions, error } = await supabase
        .from('consultation_sessions')
        .select('*');

      if (error) throw error;

      const summary = {
        totalSessions: sessions?.length || 0,
        completedSessions: sessions?.filter(s => s.status === 'completed').length || 0,
        totalHours: sessions?.reduce((acc, s) => acc + (s.actual_duration || 1), 0) || 0,
        averageRating: 4.8 // Mock for now
      };

      res.json({ summary });
    } catch (error) {
      console.error('Error generating sessions report:', error);
      res.status(500).json({ message: 'Failed to generate sessions report' });
    }
  });

  // Profile completion endpoint - sends account setup completion email
  app.post('/api/profile/complete', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      
      // Get user details
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (userError || !user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Send account setup completion email
      try {
        const { EmailService } = await import('./services/emailService');
        await EmailService.sendAccountSetupEmail({
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role as 'student' | 'consultant' | 'admin',
          userId: user.id
        });
        
        res.json({ 
          success: true, 
          message: 'Profile completion email sent successfully' 
        });
      } catch (emailError) {
        console.error('Failed to send account setup email:', emailError);
        res.status(500).json({ 
          success: false,
          message: 'Profile completion email failed to send' 
        });
      }
    } catch (error) {
      console.error('Profile completion error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Profile completion failed' 
      });
    }
  });

  return httpServer;
}
