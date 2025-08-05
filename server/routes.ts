import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { AuthService, authenticateToken, requireRole, UserRole } from "./auth";
import { supabase } from "./supabase";
import { z } from "zod";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
      await AuthService.logout(req.user.userId);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Logout failed' });
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
      const user = await AuthService.getUserById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get role-specific profile
      let profile = null;
      if (user.role === UserRole.STUDENT) {
        profile = await AuthService.getStudentProfile(req.user.userId);
      } else if (user.role === UserRole.CONSULTANT) {
        profile = await AuthService.getConsultantProfile(req.user.userId);
      }

      res.json({ user, profile });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Failed to get user' });
    }
  });

  // Student routes
  app.get('/api/students/dashboard', authenticateToken, requireRole([UserRole.STUDENT]), async (req, res) => {
    try {
      const student = await AuthService.getStudentProfile(req.user.userId);
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
      const updatedStudent = await AuthService.updateStudentProfile(req.user.userId, req.body);
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
      const consultant = await AuthService.getConsultantProfile(req.user.userId);
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
      const updatedConsultant = await AuthService.updateConsultantProfile(req.user.userId, req.body);
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
