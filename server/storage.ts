import {
  users,
  students,
  consultants,
  consultationSessions,
  videoSessions,
  type User,
  type Student,
  type Consultant,
  type ConsultationSession,
  type VideoSession,
  type UpsertUser,
  type InsertStudent,
  type InsertConsultant,
  type InsertConsultationSession,
  type InsertVideoSession,
} from "@shared/schema";
import { randomUUID } from "crypto";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Student operations
  getStudent(id: string): Promise<Student | undefined>;
  getStudentByUserId(userId: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  getUpcomingSessionsForStudent(studentId: string): Promise<ConsultationSession[]>;
  getSessionsForStudent(studentId: string): Promise<ConsultationSession[]>;
  
  // Consultant operations
  getConsultant(id: string): Promise<Consultant | undefined>;
  getConsultantByUserId(userId: string): Promise<Consultant | undefined>;
  createConsultant(consultant: InsertConsultant): Promise<Consultant>;
  
  // Session operations
  createConsultationSession(session: InsertConsultationSession): Promise<ConsultationSession>;
  getConsultationSession(id: string): Promise<ConsultationSession | undefined>;
  updateConsultationSession(id: string, updates: Partial<ConsultationSession>): Promise<ConsultationSession | undefined>;
  
  // Video session operations
  createVideoSession(session: InsertVideoSession): Promise<VideoSession>;
  getVideoSession(id: string): Promise<VideoSession | undefined>;
}

export class MemoryStorage implements IStorage {
  private users = new Map<string, User>();
  private students = new Map<string, Student>();
  private consultants = new Map<string, Consultant>();
  private consultationSessions = new Map<string, ConsultationSession>();
  private videoSessions = new Map<string, VideoSession>();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Create admin user
    const adminUser: User = {
      id: 'admin-user-1',
      email: 'admin@brainbasedemdr.com',
      firstName: 'Admin',
      lastName: 'User',
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

    // Create sample consultant users
    const consultantUser1: User = {
      id: 'consultant-user-1',
      email: 'dr.chen@brainbasedemdr.com',
      firstName: 'Emily',
      lastName: 'Chen',
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(consultantUser1.id, consultantUser1);

    const consultantUser2: User = {
      id: 'consultant-user-2',
      email: 'dr.torres@brainbasedemdr.com',
      firstName: 'Michael',
      lastName: 'Torres',
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(consultantUser2.id, consultantUser2);

    // Create sample consultants
    const consultant1: Consultant = {
      id: 'consultant-1',
      userId: 'consultant-user-1',
      licenseNumber: 'EMDR-12345',
      specializations: ['Trauma', 'PTSD', 'Anxiety'],
      hourlyRate: '150.00',
      isActive: true,
      bio: 'Dr. Chen is a licensed clinical psychologist with over 10 years of experience in trauma therapy.',
      yearsExperience: 10,
      totalHoursCompleted: '500.50',
      averageRating: '4.9',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.consultants.set(consultant1.id, consultant1);

    const consultant2: Consultant = {
      id: 'consultant-2',
      userId: 'consultant-user-2',
      licenseNumber: 'EMDR-67890',
      specializations: ['Depression', 'EMDR', 'Family Therapy'],
      hourlyRate: '175.00',
      isActive: true,
      bio: 'Dr. Torres specializes in EMDR therapy for adults and adolescents.',
      yearsExperience: 8,
      totalHoursCompleted: '320.75',
      averageRating: '4.8',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.consultants.set(consultant2.id, consultant2);

    // Create sample student user
    const studentUser: User = {
      id: 'student-user-1',
      email: 'student@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(studentUser.id, studentUser);

    // Create sample student
    const student: Student = {
      id: 'student-1',
      userId: 'student-user-1',
      kajabiUserId: null,
      phone: '+1-555-0123',
      timezone: 'America/New_York',
      courseCompletionDate: new Date('2024-01-15'),
      totalVerifiedHours: '15.5',
      certificationStatus: 'in_progress',
      preferredSessionLength: 60,
      consultationPreferences: {
        preferredTimes: ['morning', 'afternoon'],
        communicationStyle: 'direct'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.students.set(student.id, student);

    // Create sample consultation sessions
    const session1: ConsultationSession = {
      id: 'session-1',
      studentId: 'student-1',
      consultantId: 'consultant-1',
      videoSessionId: null,
      scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      scheduledEnd: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // Tomorrow + 1 hour
      status: 'scheduled',
      sessionType: 'consultation',
      notes: 'Initial consultation session',
      hoursTowardsConsultation: '1.0',
      consultantFeedback: null,
      studentReflection: null,
      studentEvaluationScore: null,
      consultantEvaluationScore: null,
      isVerified: false,
      recordingUrl: null,
      technicalIssuesReported: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.consultationSessions.set(session1.id, session1);

    const session2: ConsultationSession = {
      id: 'session-2',
      studentId: 'student-1',
      consultantId: 'consultant-2',
      videoSessionId: null,
      scheduledStart: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      scheduledEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 3 days + 1 hour
      status: 'scheduled',
      sessionType: 'practice',
      notes: 'Practice session with case review',
      hoursTowardsConsultation: '1.0',
      consultantFeedback: null,
      studentReflection: null,
      studentEvaluationScore: null,
      consultantEvaluationScore: null,
      isVerified: false,
      recordingUrl: null,
      technicalIssuesReported: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.consultationSessions.set(session2.id, session2);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const id = userData.id || randomUUID();
    const user: User = {
      id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      createdAt: userData.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  // Student operations
  async getStudent(id: string): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async getStudentByUserId(userId: string): Promise<Student | undefined> {
    return Array.from(this.students.values()).find(student => student.userId === userId);
  }

  async createStudent(studentData: InsertStudent): Promise<Student> {
    const id = randomUUID();
    const student: Student = {
      id,
      userId: studentData.userId,
      kajabiUserId: studentData.kajabiUserId || null,
      phone: studentData.phone || null,
      timezone: studentData.timezone || null,
      courseCompletionDate: studentData.courseCompletionDate,
      totalVerifiedHours: studentData.totalVerifiedHours || null,
      certificationStatus: studentData.certificationStatus || null,
      preferredSessionLength: studentData.preferredSessionLength || null,
      consultationPreferences: studentData.consultationPreferences || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.students.set(id, student);
    return student;
  }

  async getUpcomingSessionsForStudent(studentId: string): Promise<ConsultationSession[]> {
    const now = new Date();
    return Array.from(this.consultationSessions.values())
      .filter(session => 
        session.studentId === studentId && 
        new Date(session.scheduledStart) > now &&
        session.status === 'scheduled'
      )
      .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
  }

  async getSessionsForStudent(studentId: string): Promise<ConsultationSession[]> {
    return Array.from(this.consultationSessions.values())
      .filter(session => session.studentId === studentId);
  }

  // Consultant operations
  async getConsultant(id: string): Promise<Consultant | undefined> {
    return this.consultants.get(id);
  }

  async getConsultantByUserId(userId: string): Promise<Consultant | undefined> {
    return Array.from(this.consultants.values()).find(consultant => consultant.userId === userId);
  }

  async createConsultant(consultantData: InsertConsultant): Promise<Consultant> {
    const id = randomUUID();
    const consultant: Consultant = {
      id,
      userId: consultantData.userId,
      licenseNumber: consultantData.licenseNumber || null,
      specializations: consultantData.specializations || null,
      hourlyRate: consultantData.hourlyRate || null,
      isActive: consultantData.isActive || null,
      bio: consultantData.bio || null,
      yearsExperience: consultantData.yearsExperience || null,
      totalHoursCompleted: consultantData.totalHoursCompleted || null,
      averageRating: consultantData.averageRating || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.consultants.set(id, consultant);
    return consultant;
  }

  // Session operations
  async createConsultationSession(sessionData: InsertConsultationSession): Promise<ConsultationSession> {
    const id = randomUUID();
    const session: ConsultationSession = {
      id,
      studentId: sessionData.studentId,
      consultantId: sessionData.consultantId,
      videoSessionId: sessionData.videoSessionId || null,
      scheduledStart: sessionData.scheduledStart,
      scheduledEnd: sessionData.scheduledEnd,
      status: sessionData.status || null,
      sessionType: sessionData.sessionType || null,
      notes: sessionData.notes || null,
      hoursTowardsConsultation: sessionData.hoursTowardsConsultation || null,
      consultantFeedback: sessionData.consultantFeedback || null,
      studentReflection: sessionData.studentReflection || null,
      studentEvaluationScore: sessionData.studentEvaluationScore || null,
      consultantEvaluationScore: sessionData.consultantEvaluationScore || null,
      isVerified: sessionData.isVerified || null,
      recordingUrl: sessionData.recordingUrl || null,
      technicalIssuesReported: sessionData.technicalIssuesReported || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.consultationSessions.set(id, session);
    return session;
  }

  async getConsultationSession(id: string): Promise<ConsultationSession | undefined> {
    return this.consultationSessions.get(id);
  }

  async updateConsultationSession(id: string, updates: Partial<ConsultationSession>): Promise<ConsultationSession | undefined> {
    const session = this.consultationSessions.get(id);
    if (!session) return undefined;

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date(),
    };
    this.consultationSessions.set(id, updatedSession);
    return updatedSession;
  }

  // Video session operations
  async createVideoSession(sessionData: InsertVideoSession): Promise<VideoSession> {
    const id = randomUUID();
    const session: VideoSession = {
      id,
      roomId: sessionData.roomId,
      recordingEnabled: sessionData.recordingEnabled || null,
      recordingUrl: sessionData.recordingUrl || null,
      recordingDurationSeconds: sessionData.recordingDurationSeconds || null,
      videoQuality: sessionData.videoQuality || null,
      connectionQualityAvg: sessionData.connectionQualityAvg || null,
      technicalIssues: sessionData.technicalIssues || null,
      sessionMetadata: sessionData.sessionMetadata || null,
      createdAt: new Date(),
    };
    this.videoSessions.set(id, session);
    return session;
  }

  async getVideoSession(id: string): Promise<VideoSession | undefined> {
    return this.videoSessions.get(id);
  }
}

export const storage = new MemoryStorage();