import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertConsultationSessionSchema, insertVideoSessionSchema } from "@shared/schema";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is a student or consultant
      let student = await storage.getStudentByUserId(userId);
      let consultant = await storage.getConsultantByUserId(userId);
      let userType = 'admin'; // Default to admin if no profile exists

      // Check if this is a new user and we have a role in session
      if (!student && !consultant && req.session.pendingRole) {
        const role = req.session.pendingRole;
        delete req.session.pendingRole; // Clear the pending role

        if (role === 'student') {
          student = await storage.createStudent({
            userId: userId,
            kajabiUserId: null,
            phone: null,
            timezone: 'UTC',
            courseCompletionDate: new Date(),
            totalVerifiedHours: '0',
            certificationStatus: 'in_progress',
            preferredSessionLength: 60,
            consultationPreferences: {}
          });
          userType = 'student';
        } else if (role === 'consultant') {
          consultant = await storage.createConsultant({
            userId: userId,
            licenseNumber: 'TEMP-' + userId.slice(0, 8),
            specializations: ['General EMDR'],
            hourlyRate: '150.00',
            isActive: true,
            bio: 'New consultant profile',
            yearsExperience: 5,
            totalHoursCompleted: '0',
            averageRating: '5.0'
          });
          userType = 'consultant';
        } else if (role === 'admin') {
          userType = 'admin';
        }
      } else {
        // Determine user type based on existing profiles
        if (student) {
          userType = 'student';
        } else if (consultant) {
          userType = 'consultant';
        }
      }

      res.json({
        ...user,
        userType: userType,
        profile: student || consultant || null
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Student dashboard route
  app.get('/api/students/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get or create student profile
      let student = await storage.getStudentByUserId(userId);
      if (!student) {
        student = await storage.createStudent({
          userId,
          kajabiUserId: null,
          phone: null,
          timezone: 'UTC',
          courseCompletionDate: new Date(),
          totalVerifiedHours: '0',
          certificationStatus: 'in_progress',
          preferredSessionLength: 60,
          consultationPreferences: {}
        });
      }

      const upcomingSessions = await storage.getUpcomingSessionsForStudent(student.id);
      const allSessions = await storage.getSessionsForStudent(student.id);
      
      const totalHours = parseFloat(student.totalVerifiedHours || '0');
      const progress = Math.min((totalHours / 40) * 100, 100);

      // Get session data with consultant info
      const sessionsWithConsultants = await Promise.all(
        upcomingSessions.slice(0, 3).map(async (session) => {
          const consultant = await storage.getConsultant(session.consultantId);
          const consultantUser = consultant ? await storage.getUser(consultant.userId) : null;
          return {
            ...session,
            consultantName: consultantUser ? `${consultantUser.firstName} ${consultantUser.lastName}` : 'Unknown Consultant'
          };
        })
      );

      res.json({
        student,
        upcomingSessions: sessionsWithConsultants,
        progress: {
          totalHours,
          percentage: progress,
          remainingHours: Math.max(40 - totalHours, 0),
          completedSessions: allSessions.filter(s => s.status === 'completed').length
        }
      });
    } catch (error) {
      console.error("Error fetching student dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });



  // Consultant routes
  app.get('/api/consultants/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const consultant = await storage.getConsultantByUserId(userId);
      
      if (!consultant) {
        return res.status(404).json({ message: "Consultant not found" });
      }

      // Get consultant's sessions
      const allSessions = Array.from((storage as any).consultationSessions.values());
      const consultantSessions = allSessions.filter((session: any) => session.consultantId === consultant.id);
      
      // Calculate stats
      const totalSessions = consultantSessions.length;
      const completedSessions = consultantSessions.filter((session: any) => session.status === 'completed');
      
      // Get this week's sessions
      const now = new Date();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const sessionsThisWeek = consultantSessions.filter((session: any) => {
        const sessionDate = new Date(session.scheduledStart);
        return sessionDate >= weekStart && sessionDate < weekEnd;
      });

      // Get this month's sessions for hours calculation
      const thisMonth = consultantSessions.filter((session: any) => {
        const sessionDate = new Date(session.scheduledStart);
        return sessionDate.getMonth() === now.getMonth() && 
               sessionDate.getFullYear() === now.getFullYear() &&
               session.status === 'completed';
      });

      const hoursThisMonth = thisMonth.reduce((total: number, session: any) => {
        return total + (session.duration || 60) / 60; // Convert minutes to hours
      }, 0);

      // Get unique students
      const uniqueStudents = new Set(consultantSessions.map((session: any) => session.studentId));

      res.json({
        consultant,
        totalSessions,
        sessionsThisWeek: sessionsThisWeek.length,
        activeStudents: uniqueStudents.size,
        hoursThisMonth: Math.round(hoursThisMonth),
        upcomingSessions: consultantSessions.filter((session: any) => {
          const sessionDate = new Date(session.scheduledStart);
          return sessionDate > now && session.status === 'scheduled';
        }).slice(0, 5)
      });
    } catch (error) {
      console.error("Error fetching consultant dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  app.get('/api/consultants', async (req, res) => {
    try {
      const consultants = await storage.getAllConsultants();
      const consultantsWithUsers = await Promise.all(
        consultants.map(async (consultant) => {
          const user = await storage.getUser(consultant.userId);
          return {
            ...consultant,
            user
          };
        })
      );
      res.json(consultantsWithUsers);
    } catch (error) {
      console.error("Error fetching consultants:", error);
      res.status(500).json({ message: "Failed to fetch consultants" });
    }
  });

  app.get('/api/consultants/:id/availability', async (req, res) => {
    try {
      const { id } = req.params;
      const availability = await storage.getConsultantAvailability(id);
      res.json(availability);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // Session routes
  app.post('/api/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const student = await storage.getStudentByUserId(userId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const sessionData = insertConsultationSessionSchema.parse({
        ...req.body,
        studentId: student.id
      });

      // Create video session
      const videoSession = await storage.createVideoSession({
        roomId: `room_${randomUUID()}`,
        recordingEnabled: true,
        videoQuality: '720p',
        technicalIssues: [],
        sessionMetadata: {}
      });

      // Create consultation session
      const session = await storage.createConsultationSession({
        ...sessionData,
        videoSessionId: videoSession.id
      });

      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  app.get('/api/sessions/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const session = await storage.getConsultationSession(id);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Get related data
      const student = await storage.getStudent(session.studentId);
      const consultant = await storage.getConsultant(session.consultantId);
      const videoSession = session.videoSessionId ? 
        await storage.getVideoSession(session.videoSessionId) : null;

      const studentUser = student ? await storage.getUser(student.userId) : null;
      const consultantUser = consultant ? await storage.getUser(consultant.userId) : null;

      res.json({
        ...session,
        student: student ? { ...student, user: studentUser } : null,
        consultant: consultant ? { ...consultant, user: consultantUser } : null,
        videoSession
      });
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  app.patch('/api/sessions/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const session = await storage.updateConsultationSession(id, updates);
      res.json(session);
    } catch (error) {
      console.error("Error updating session:", error);
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  // Video session routes
  app.get('/api/video-sessions/:roomId', isAuthenticated, async (req, res) => {
    try {
      const { roomId } = req.params;
      const videoSessions = Array.from((storage as any).videoSessions.values());
      const videoSession = videoSessions.find((vs: any) => vs.roomId === roomId);
      
      if (!videoSession) {
        return res.status(404).json({ message: "Video session not found" });
      }

      res.json(videoSession);
    } catch (error) {
      console.error("Error fetching video session:", error);
      res.status(500).json({ message: "Failed to fetch video session" });
    }
  });

  // Admin routes
  app.get('/api/admin/dashboard', isAuthenticated, async (req, res) => {
    try {
      const students = await storage.getAllStudents();
      const consultants = await storage.getAllConsultants();
      
      // Calculate stats
      const activeStudents = students.filter(s => s.certificationStatus === 'in_progress').length;
      const completedCertifications = students.filter(s => s.certificationStatus === 'completed').length;
      
      // Get this week's sessions
      const now = new Date();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const allSessions = Array.from((storage as any).consultationSessions.values());
      const sessionsThisWeek = allSessions.filter((session: any) => {
        const sessionDate = new Date(session.scheduledStart);
        return sessionDate >= weekStart && sessionDate < weekEnd;
      }).length;

      res.json({
        activeStudents,
        consultants: consultants.length,
        sessionsThisWeek,
        completedCertifications,
        systemUptime: 99.8
      });
    } catch (error) {
      console.error("Error fetching admin dashboard:", error);
      res.status(500).json({ message: "Failed to fetch admin dashboard" });
    }
  });

  app.get('/api/admin/students', isAuthenticated, async (req, res) => {
    try {
      const students = await storage.getAllStudents();
      const studentsWithUsers = await Promise.all(
        students.map(async (student) => {
          const user = await storage.getUser(student.userId);
          return { ...student, user };
        })
      );
      res.json(studentsWithUsers);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.get('/api/admin/consultants', isAuthenticated, async (req, res) => {
    try {
      const consultants = await storage.getAllConsultants();
      const consultantsWithUsers = await Promise.all(
        consultants.map(async (consultant) => {
          const user = await storage.getUser(consultant.userId);
          return { ...consultant, user };
        })
      );
      res.json(consultantsWithUsers);
    } catch (error) {
      console.error("Error fetching consultants:", error);
      res.status(500).json({ message: "Failed to fetch consultants" });
    }
  });

  app.get('/api/admin/sessions', isAuthenticated, async (req, res) => {
    try {
      const sessions = await storage.getAllConsultationSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.post('/api/admin/certifications/:studentId/approve', isAuthenticated, async (req, res) => {
    try {
      const { studentId } = req.params;
      
      // Update student certification status
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // In a real implementation, this would:
      // 1. Generate PDF certificate
      // 2. Send email with certificate
      // 3. Update student record
      // 4. Log the certification event

      // Mock implementation - just update status
      await storage.updateStudent(studentId, {
        certificationStatus: 'completed',
        updatedAt: new Date()
      });

      res.json({ message: "Certification approved and sent" });
    } catch (error) {
      console.error("Error approving certification:", error);
      res.status(500).json({ message: "Failed to approve certification" });
    }
  });

  app.post('/api/admin/payments/consultants/:consultantId', isAuthenticated, async (req, res) => {
    try {
      const { consultantId } = req.params;
      const { amount } = req.body;

      // In a real implementation, this would integrate with Stripe/PayPal
      // For now, we'll mock the payment process
      
      // Mock payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Log payment (in real implementation, store in payments table)
      console.log(`Processing payment of $${amount} to consultant ${consultantId}`);

      res.json({ 
        message: "Payment processed successfully",
        transactionId: `txn_${Date.now()}`,
        amount: amount
      });
    } catch (error) {
      console.error("Error processing payment:", error);
      res.status(500).json({ message: "Failed to process payment" });
    }
  });

  // Mock Kajabi webhook
  app.post('/api/webhooks/kajabi', async (req, res) => {
    try {
      const { user_id, email, first_name, last_name, course_completed } = req.body;
      
      if (course_completed) {
        // Create user if not exists
        const user = await storage.upsertUser({
          id: `kajabi_${user_id}`,
          email,
          firstName: first_name,
          lastName: last_name,
          profileImageUrl: null
        });

        // Create student profile
        await storage.createStudent({
          userId: user.id,
          kajabiUserId: user_id,
          phone: null,
          timezone: 'UTC',
          courseCompletionDate: new Date(),
          totalVerifiedHours: '0',
          certificationStatus: 'in_progress',
          preferredSessionLength: 60,
          consultationPreferences: {}
        });

        res.json({ message: "Student created successfully" });
      } else {
        res.json({ message: "Course not completed yet" });
      }
    } catch (error) {
      console.error("Error processing Kajabi webhook:", error);
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connection established');

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        
        // Handle different message types
        switch (data.type) {
          case 'join_video_session':
            // Handle joining video session
            ws.send(JSON.stringify({
              type: 'video_session_joined',
              roomId: data.roomId,
              participantId: randomUUID()
            }));
            break;
            
          case 'webrtc_signal':
            // Relay WebRTC signaling messages
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'webrtc_signal',
                  signal: data.signal,
                  from: data.from,
                  to: data.to
                }));
              }
            });
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
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return httpServer;
}
