import { storage } from './storage';
import { randomUUID } from 'crypto';

export async function seedDatabase() {
  console.log('Seeding database with sample data...');

  // Create sample users
  const user1 = await storage.upsertUser({
    id: 'user-1',
    email: 'student1@example.com',
    firstName: 'Alex',
    lastName: 'Johnson',
    profileImageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150'
  });

  const user2 = await storage.upsertUser({
    id: 'user-2',
    email: 'consultant1@example.com',
    firstName: 'Dr. Emily',
    lastName: 'Chen',
    profileImageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150'
  });

  const user3 = await storage.upsertUser({
    id: 'user-3',
    email: 'consultant2@example.com',
    firstName: 'Michael',
    lastName: 'Torres',
    profileImageUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150'
  });

  const user4 = await storage.upsertUser({
    id: 'user-4',
    email: 'consultant3@example.com',
    firstName: 'Sarah',
    lastName: 'Kim',
    profileImageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150'
  });

  const user5 = await storage.upsertUser({
    id: 'user-5',
    email: 'student2@example.com',
    firstName: 'Maria',
    lastName: 'Rodriguez',
    profileImageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150'
  });

  // Create sample student
  const student = await storage.createStudent({
    userId: user1.id,
    kajabiUserId: 'kajabi_12345',
    phone: '+1-555-0123',
    timezone: 'America/New_York',
    courseCompletionDate: new Date('2024-01-15'),
    totalVerifiedHours: '15.5',
    certificationStatus: 'in_progress',
    preferredSessionLength: 90,
    consultationPreferences: {
      preferredDays: ['Monday', 'Wednesday', 'Friday'],
      preferredTimes: ['morning', 'afternoon'],
      specialAreas: ['trauma', 'anxiety']
    }
  });

  // Create another student
  const student2 = await storage.createStudent({
    userId: user5.id,
    kajabiUserId: 'kajabi_67890',
    phone: '+1-555-0124',
    timezone: 'America/Los_Angeles',
    courseCompletionDate: new Date('2024-01-10'),
    totalVerifiedHours: '42.0',
    certificationStatus: 'in_progress',
    preferredSessionLength: 60,
    consultationPreferences: {
      preferredDays: ['Tuesday', 'Thursday'],
      preferredTimes: ['evening'],
      specialAreas: ['depression', 'ptsd']
    }
  });

  // Create sample consultants
  const consultant1 = await storage.createConsultant({
    userId: user2.id,
    licenseNumber: 'LCSW-12345',
    specializations: ['Trauma Therapy', 'PTSD Treatment', 'Anxiety Disorders'],
    hourlyRate: '150.00',
    isActive: true,
    bio: 'Dr. Emily Chen is a licensed clinical social worker with over 15 years of experience in trauma therapy and EMDR. She specializes in working with adults who have experienced complex trauma.',
    yearsExperience: 15,
    totalHoursCompleted: '240.5',
    averageRating: '4.9'
  });

  const consultant2 = await storage.createConsultant({
    userId: user3.id,
    licenseNumber: 'LPC-67890',
    specializations: ['Anxiety Disorders', 'Depression', 'Couples Therapy'],
    hourlyRate: '125.00',
    isActive: true,
    bio: 'Michael Torres is a licensed professional counselor specializing in anxiety and depression treatment using EMDR techniques.',
    yearsExperience: 8,
    totalHoursCompleted: '180.0',
    averageRating: '4.8'
  });

  const consultant3 = await storage.createConsultant({
    userId: user4.id,
    licenseNumber: 'LMFT-13579',
    specializations: ['Child Therapy', 'Family Counseling', 'ADHD'],
    hourlyRate: '140.00',
    isActive: true,
    bio: 'Sarah Kim is a licensed marriage and family therapist with expertise in child and adolescent EMDR therapy.',
    yearsExperience: 12,
    totalHoursCompleted: '320.0',
    averageRating: '4.95'
  });

  // Create sample consultation sessions
  const session1 = await storage.createConsultationSession({
    studentId: student.id,
    consultantId: consultant1.id,
    videoSessionId: randomUUID(),
    scheduledStart: new Date('2024-01-25T14:00:00Z'),
    scheduledEnd: new Date('2024-01-25T15:30:00Z'),
    actualStart: null,
    actualEnd: null,
    status: 'scheduled',
    sessionType: 'video_consultation',
    studentVerifiedAt: null,
    consultantVerifiedAt: null,
    studentNotes: null,
    consultantNotes: null,
    sessionRating: null,
    technicalIssuesReported: false
  });

  const session2 = await storage.createConsultationSession({
    studentId: student.id,
    consultantId: consultant2.id,
    videoSessionId: randomUUID(),
    scheduledStart: new Date('2024-01-20T10:00:00Z'),
    scheduledEnd: new Date('2024-01-20T11:00:00Z'),
    actualStart: new Date('2024-01-20T10:05:00Z'),
    actualEnd: new Date('2024-01-20T11:15:00Z'),
    status: 'completed',
    sessionType: 'video_consultation',
    studentVerifiedAt: new Date('2024-01-20T11:16:00Z'),
    consultantVerifiedAt: new Date('2024-01-20T11:18:00Z'),
    studentNotes: 'Great session, learned a lot about resource installation techniques.',
    consultantNotes: 'Student demonstrates good understanding of EMDR protocols. Ready for more complex cases.',
    sessionRating: 5,
    technicalIssuesReported: false
  });

  const session3 = await storage.createConsultationSession({
    studentId: student2.id,
    consultantId: consultant3.id,
    videoSessionId: randomUUID(),
    scheduledStart: new Date('2024-01-22T16:00:00Z'),
    scheduledEnd: new Date('2024-01-22T17:30:00Z'),
    actualStart: new Date('2024-01-22T16:00:00Z'),
    actualEnd: new Date('2024-01-22T17:25:00Z'),
    status: 'completed',
    sessionType: 'video_consultation',
    studentVerifiedAt: new Date('2024-01-22T17:26:00Z'),
    consultantVerifiedAt: new Date('2024-01-22T17:30:00Z'),
    studentNotes: 'Excellent guidance on working with adolescent clients.',
    consultantNotes: 'Student shows mastery of EMDR techniques. Recommend certification approval.',
    sessionRating: 5,
    technicalIssuesReported: false
  });

  // Create sample video sessions
  await storage.createVideoSession({
    roomId: `room-${session1.id}`,
    recordingEnabled: true,
    recordingUrl: null,
    recordingDurationSeconds: null,
    videoQuality: '1080p',
    connectionQualityAvg: null,
    technicalIssues: [],
    sessionMetadata: {
      participants: 2,
      maxConcurrentUsers: 2
    }
  });

  await storage.createVideoSession({
    roomId: `room-${session2.id}`,
    recordingEnabled: true,
    recordingUrl: 'https://example.com/recordings/session2.mp4',
    recordingDurationSeconds: 4260, // 71 minutes
    videoQuality: '1080p',
    connectionQualityAvg: '95%',
    technicalIssues: [],
    sessionMetadata: {
      participants: 2,
      maxConcurrentUsers: 2,
      recordingSize: '850MB'
    }
  });

  console.log('Database seeded successfully!');
  console.log('Sample data created for development environment');
}