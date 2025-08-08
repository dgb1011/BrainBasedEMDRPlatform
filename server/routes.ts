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
import { webrtcService } from "./services/webrtcService";
import { schedulingService } from "./services/schedulingService";
import { certificateService } from "./services/certificateService";
import { recordingService } from "./services/recordingService";
import { PaymentService } from "./services/paymentService";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

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

  // Scheduling Routes
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

  app.get('/api/sessions/upcoming', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      
      // Get user's sessions based on role
      let sessions;
      if ((req as any).user.role === 'student') {
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', userId)
          .single();
        
        if (student) {
          const { data } = await supabase
            .from('consultation_sessions')
            .select(`
              *,
              consultant:consultants(user:users(*))
            `)
            .eq('student_id', student.id)
            .gte('scheduled_start', new Date().toISOString())
            .order('scheduled_start', { ascending: true });
          
          sessions = data;
        }
      } else if ((req as any).user.role === 'consultant') {
        const { data: consultant } = await supabase
          .from('consultants')
          .select('id')
          .eq('user_id', userId)
          .single();
        
        if (consultant) {
          const { data } = await supabase
            .from('consultation_sessions')
            .select(`
              *,
              student:students(user:users(*))
            `)
            .eq('consultant_id', consultant.id)
            .gte('scheduled_start', new Date().toISOString())
            .order('scheduled_start', { ascending: true });
          
          sessions = data;
        }
      }
      
      res.json({
        success: true,
        sessions: sessions || []
      });
    } catch (error) {
      console.error('Get upcoming sessions error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get upcoming sessions'
      });
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

  // Recording Routes
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

  // Payment Routes
  app.post('/api/payments/create-intent', authenticateToken, async (req, res) => {
    try {
      const { sessionId, consultantId, amount, currency = 'usd' } = req.body;
      
      const paymentIntent = await PaymentService.createSessionPayment(
        sessionId,
        consultantId,
        amount,
        currency
      );
      
      res.json({
        success: true,
        paymentIntent
      });
    } catch (error) {
      console.error('Create payment intent error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create payment intent'
      });
    }
  });

  app.post('/api/payments/confirm', authenticateToken, async (req, res) => {
    try {
      const { sessionId, paymentIntentId } = req.body;
      
      const payment = await PaymentService.confirmSessionPayment(sessionId, paymentIntentId);
      
      res.json({
        success: true,
        payment
      });
    } catch (error) {
      console.error('Confirm payment error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to confirm payment'
      });
    }
  });

  app.get('/api/payments/consultant-earnings', authenticateToken, requireRole([UserRole.CONSULTANT]), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const consultantId = req.user!.userId;
      
      const earnings = await PaymentService.getConsultantEarnings(
        consultantId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json({
        success: true,
        earnings
      });
    } catch (error) {
      console.error('Get earnings error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get earnings'
      });
    }
  });

  app.post('/api/payments/refund', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { sessionId, amount, reason = 'customer_request' } = req.body;
      
      const refund = await PaymentService.processRefund(sessionId, amount, reason);
      
      res.json({
        success: true,
        refund: {
          id: refund.id,
          amount: refund.amount / 100,
          status: refund.status,
          reason: refund.reason
        }
      });
    } catch (error) {
      console.error('Process refund error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process refund'
      });
    }
  });

  app.get('/api/payments/subscription-plans', async (req, res) => {
    try {
      const plans = await PaymentService.getSubscriptionPlans();
      
      res.json({
        success: true,
        plans
      });
    } catch (error) {
      console.error('Get subscription plans error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get subscription plans'
      });
    }
  });

  app.post('/api/payments/create-subscription', authenticateToken, async (req, res) => {
    try {
      const { planId, paymentMethodId } = req.body;
      const userId = req.user!.userId;
      
      // Get user details
      const { data: user } = await supabase
        .from('users')
        .select('email, first_name, last_name, stripe_customer_id')
        .eq('id', userId)
        .single();
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Create or get Stripe customer
      let customer;
      if (user.stripe_customer_id) {
        customer = await PaymentService.createCustomer(user.email, `${user.first_name} ${user.last_name}`);
      } else {
        customer = await PaymentService.createCustomer(user.email, `${user.first_name} ${user.last_name}`);
        
        // Update user with Stripe customer ID
        await supabase
          .from('users')
          .update({ stripe_customer_id: customer.id })
          .eq('id', userId);
      }
      
      // Get plan details
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('stripe_price_id')
        .eq('id', planId)
        .single();
      
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }
      
      // Create subscription
      const subscription = await PaymentService.createSubscription(
        customer.id,
        plan.stripe_price_id,
        { userId, planId }
      );
      
      res.json({
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          client_secret: (subscription.latest_invoice as any)?.payment_intent?.client_secret
        }
      });
    } catch (error) {
      console.error('Create subscription error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create subscription'
      });
    }
  });

  // Stripe Webhook Handler
  app.post('/api/webhooks/stripe', async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'] as string;
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!endpointSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
      }
      
      let event: Stripe.Event;
      
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).json({ error: 'Invalid signature' });
      }
      
      // Handle the event
      await PaymentService.handleWebhook(event);
      
      res.json({ received: true });
    } catch (error) {
      console.error('Stripe webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Admin Payment Routes
  app.get('/api/admin/payments/overview', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { data: totalPayments } = await supabase
        .from('consultant_payments')
        .select('amount, status')
        .eq('status', 'completed');
      
      const totalRevenue = totalPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const totalSessions = totalPayments?.length || 0;
      
      const { data: pendingPayments } = await supabase
        .from('consultant_payments')
        .select('amount')
        .eq('status', 'pending');
      
      const pendingRevenue = pendingPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      
      res.json({
        success: true,
        overview: {
          totalRevenue,
          totalSessions,
          pendingRevenue,
          pendingSessions: pendingPayments?.length || 0
        }
      });
    } catch (error) {
      console.error('Get payment overview error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get payment overview'
      });
    }
  });

  app.get('/api/admin/payments/consultants', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { data: consultantEarnings } = await supabase
        .from('consultant_payments')
        .select(`
          consultant_id,
          amount,
          status,
          consultants!inner(first_name, last_name)
        `)
        .eq('status', 'completed');
      
      const earningsByConsultant = consultantEarnings?.reduce((acc: Record<string, any>, payment: any) => {
        const consultantId = payment.consultant_id;
        if (!acc[consultantId]) {
          acc[consultantId] = {
            consultantId,
            name: `${(payment as any).consultants.first_name} ${(payment as any).consultants.last_name}`,
            totalEarnings: 0,
            sessionsCount: 0
          };
        }
        acc[consultantId].totalEarnings += payment.amount;
        acc[consultantId].sessionsCount += 1;
        return acc;
      }, {} as Record<string, any>) || {};
      
      res.json({
        success: true,
        consultants: Object.values(earningsByConsultant)
      });
    } catch (error) {
      console.error('Get consultant payments error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get consultant payments'
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

  return httpServer;
}
