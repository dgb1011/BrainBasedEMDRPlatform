import {
  users,
  students,
  consultants,
  consultationSessions,
  videoSessions,
  consultantAvailability,
  studentDocuments,
  videoParticipants,
  type User,
  type UpsertUser,
  type Student,
  type InsertStudent,
  type Consultant,
  type InsertConsultant,
  type ConsultationSession,
  type InsertConsultationSession,
  type VideoSession,
  type InsertVideoSession,
  type ConsultantAvailability,
  type StudentDocument,
  type VideoParticipant,
} from "@shared/schema";
import { randomUUID } from "crypto";

// Interface for storage operations
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Student operations
  getStudent(id: string): Promise<Student | undefined>;
  getStudentByUserId(userId: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, student: Partial<Student>): Promise<Student>;
  getAllStudents(): Promise<Student[]>;
  
  // Consultant operations
  getConsultant(id: string): Promise<Consultant | undefined>;
  getConsultantByUserId(userId: string): Promise<Consultant | undefined>;
  createConsultant(consultant: InsertConsultant): Promise<Consultant>;
  updateConsultant(id: string, consultant: Partial<Consultant>): Promise<Consultant>;
  getAllConsultants(): Promise<Consultant[]>;
  
  // Session operations
  getConsultationSession(id: string): Promise<ConsultationSession | undefined>;
  createConsultationSession(session: InsertConsultationSession): Promise<ConsultationSession>;
  updateConsultationSession(id: string, session: Partial<ConsultationSession>): Promise<ConsultationSession>;
  getSessionsForStudent(studentId: string): Promise<ConsultationSession[]>;
  getSessionsForConsultant(consultantId: string): Promise<ConsultationSession[]>;
  getUpcomingSessionsForStudent(studentId: string): Promise<ConsultationSession[]>;
  
  // Video session operations
  createVideoSession(session: InsertVideoSession): Promise<VideoSession>;
  getVideoSession(id: string): Promise<VideoSession | undefined>;
  updateVideoSession(id: string, session: Partial<VideoSession>): Promise<VideoSession>;
  
  // Availability operations
  getConsultantAvailability(consultantId: string): Promise<ConsultantAvailability[]>;
  createAvailability(availability: Omit<ConsultantAvailability, 'id' | 'createdAt'>): Promise<ConsultantAvailability>;
  
  // Document operations
  getStudentDocuments(studentId: string): Promise<StudentDocument[]>;
  createStudentDocument(document: Omit<StudentDocument, 'id' | 'createdAt'>): Promise<StudentDocument>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private students: Map<string, Student> = new Map();
  private consultants: Map<string, Consultant> = new Map();
  private consultationSessions: Map<string, ConsultationSession> = new Map();
  private videoSessions: Map<string, VideoSession> = new Map();
  private consultantAvailability: Map<string, ConsultantAvailability> = new Map();
  private studentDocuments: Map<string, StudentDocument> = new Map();
  private videoParticipants: Map<string, VideoParticipant> = new Map();

  constructor() {
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create sample user
    const sampleUser: User = {
      id: 'user-1',
      email: 'sarah.student@example.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      profileImageUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(sampleUser.id, sampleUser);

    // Create sample student
    const sampleStudent: Student = {
      id: 'student-1',
      userId: 'user-1',
      kajabiUserId: 'kajabi-123',
      phone: '+1-555-0123',
      timezone: 'America/New_York',
      courseCompletionDate: new Date('2024-01-01'),
      totalVerifiedHours: '27.00',
      certificationStatus: 'in_progress',
      preferredSessionLength: 90,
      consultationPreferences: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.students.set(sampleStudent.id, sampleStudent);

    // Create sample consultants
    const consultants = [
      {
        id: 'consultant-1',
        userId: this.createConsultantUser('Dr. Emily Chen', 'emily.chen@example.com', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150'),
        licenseNumber: 'EMDR-12345',
        specializations: ['Trauma Therapy', 'PTSD Treatment'],
        hourlyRate: '150.00',
        isActive: true,
        bio: 'Experienced EMDR therapist with 10+ years of practice.',
        yearsExperience: 10,
        totalHoursCompleted: '2500.00',
        averageRating: '4.8',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'consultant-2',
        userId: this.createConsultantUser('Dr. Michael Torres', 'michael.torres@example.com', 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150'),
        licenseNumber: 'EMDR-67890',
        specializations: ['Anxiety Disorders', 'Depression'],
        hourlyRate: '140.00',
        isActive: true,
        bio: 'Specialist in anxiety and mood disorders with EMDR expertise.',
        yearsExperience: 8,
        totalHoursCompleted: '1800.00',
        averageRating: '4.7',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'consultant-3',
        userId: this.createConsultantUser('Dr. Sarah Kim', 'sarah.kim@example.com', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300'),
        licenseNumber: 'EMDR-11111',
        specializations: ['Child Therapy', 'Family Counseling'],
        hourlyRate: '160.00',
        isActive: true,
        bio: 'Child and family specialist with extensive EMDR training.',
        yearsExperience: 12,
        totalHoursCompleted: '3200.00',
        averageRating: '4.9',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    consultants.forEach(consultant => {
      this.consultants.set(consultant.id, consultant);
    });

    // Create sample sessions
    const sessions = [
      {
        id: 'session-1',
        studentId: 'student-1',
        consultantId: 'consultant-1',
        videoSessionId: 'video-1',
        scheduledStart: new Date('2024-01-15T14:00:00Z'),
        scheduledEnd: new Date('2024-01-15T15:30:00Z'),
        actualStart: null,
        actualEnd: null,
        status: 'scheduled' as const,
        sessionType: 'video_consultation',
        studentVerifiedAt: null,
        consultantVerifiedAt: null,
        studentNotes: null,
        consultantNotes: null,
        sessionRating: null,
        technicalIssuesReported: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'session-2',
        studentId: 'student-1',
        consultantId: 'consultant-2',
        videoSessionId: 'video-2',
        scheduledStart: new Date('2024-01-18T15:00:00Z'),
        scheduledEnd: new Date('2024-01-18T16:00:00Z'),
        actualStart: null,
        actualEnd: null,
        status: 'scheduled' as const,
        sessionType: 'video_consultation',
        studentVerifiedAt: null,
        consultantVerifiedAt: null,
        studentNotes: null,
        consultantNotes: null,
        sessionRating: null,
        technicalIssuesReported: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    sessions.forEach(session => {
      this.consultationSessions.set(session.id, session);
    });
  }

  private createConsultantUser(name: string, email: string, profileImage: string): string {
    const [firstName, lastName] = name.split(' ');
    const userId = randomUUID();
    const user: User = {
      id: userId,
      email,
      firstName,
      lastName,
      profileImageUrl: profileImage,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(userId, user);
    return userId;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const id = userData.id || randomUUID();
    const user: User = {
      ...userData,
      id,
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
      ...studentData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.students.set(id, student);
    return student;
  }

  async updateStudent(id: string, studentData: Partial<Student>): Promise<Student> {
    const existing = this.students.get(id);
    if (!existing) throw new Error('Student not found');
    
    const updated: Student = {
      ...existing,
      ...studentData,
      id,
      updatedAt: new Date(),
    };
    this.students.set(id, updated);
    return updated;
  }

  async getAllStudents(): Promise<Student[]> {
    return Array.from(this.students.values());
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
      ...consultantData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.consultants.set(id, consultant);
    return consultant;
  }

  async updateConsultant(id: string, consultantData: Partial<Consultant>): Promise<Consultant> {
    const existing = this.consultants.get(id);
    if (!existing) throw new Error('Consultant not found');
    
    const updated: Consultant = {
      ...existing,
      ...consultantData,
      id,
      updatedAt: new Date(),
    };
    this.consultants.set(id, updated);
    return updated;
  }

  async getAllConsultants(): Promise<Consultant[]> {
    return Array.from(this.consultants.values());
  }

  // Session operations
  async getConsultationSession(id: string): Promise<ConsultationSession | undefined> {
    return this.consultationSessions.get(id);
  }

  async createConsultationSession(sessionData: InsertConsultationSession): Promise<ConsultationSession> {
    const id = randomUUID();
    const session: ConsultationSession = {
      ...sessionData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.consultationSessions.set(id, session);
    return session;
  }

  async updateConsultationSession(id: string, sessionData: Partial<ConsultationSession>): Promise<ConsultationSession> {
    const existing = this.consultationSessions.get(id);
    if (!existing) throw new Error('Session not found');
    
    const updated: ConsultationSession = {
      ...existing,
      ...sessionData,
      id,
      updatedAt: new Date(),
    };
    this.consultationSessions.set(id, updated);
    return updated;
  }

  async getSessionsForStudent(studentId: string): Promise<ConsultationSession[]> {
    return Array.from(this.consultationSessions.values())
      .filter(session => session.studentId === studentId)
      .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());
  }

  async getSessionsForConsultant(consultantId: string): Promise<ConsultationSession[]> {
    return Array.from(this.consultationSessions.values())
      .filter(session => session.consultantId === consultantId)
      .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());
  }

  async getUpcomingSessionsForStudent(studentId: string): Promise<ConsultationSession[]> {
    const now = new Date();
    return Array.from(this.consultationSessions.values())
      .filter(session => 
        session.studentId === studentId && 
        new Date(session.scheduledStart) > now &&
        session.status !== 'cancelled'
      )
      .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
  }

  // Video session operations
  async createVideoSession(sessionData: InsertVideoSession): Promise<VideoSession> {
    const id = randomUUID();
    const session: VideoSession = {
      ...sessionData,
      id,
      createdAt: new Date(),
    };
    this.videoSessions.set(id, session);
    return session;
  }

  async getVideoSession(id: string): Promise<VideoSession | undefined> {
    return this.videoSessions.get(id);
  }

  async updateVideoSession(id: string, sessionData: Partial<VideoSession>): Promise<VideoSession> {
    const existing = this.videoSessions.get(id);
    if (!existing) throw new Error('Video session not found');
    
    const updated: VideoSession = {
      ...existing,
      ...sessionData,
      id,
    };
    this.videoSessions.set(id, updated);
    return updated;
  }

  // Availability operations
  async getConsultantAvailability(consultantId: string): Promise<ConsultantAvailability[]> {
    return Array.from(this.consultantAvailability.values())
      .filter(availability => availability.consultantId === consultantId);
  }

  async createAvailability(availabilityData: Omit<ConsultantAvailability, 'id' | 'createdAt'>): Promise<ConsultantAvailability> {
    const id = randomUUID();
    const availability: ConsultantAvailability = {
      ...availabilityData,
      id,
      createdAt: new Date(),
    };
    this.consultantAvailability.set(id, availability);
    return availability;
  }

  // Document operations
  async getStudentDocuments(studentId: string): Promise<StudentDocument[]> {
    return Array.from(this.studentDocuments.values())
      .filter(doc => doc.studentId === studentId);
  }

  async createStudentDocument(documentData: Omit<StudentDocument, 'id' | 'createdAt'>): Promise<StudentDocument> {
    const id = randomUUID();
    const document: StudentDocument = {
      ...documentData,
      id,
      createdAt: new Date(),
    };
    this.studentDocuments.set(id, document);
    return document;
  }
}

export const storage = new MemStorage();
