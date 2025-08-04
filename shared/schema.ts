import { sql } from 'drizzle-orm';
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enums
export const userTypeEnum = pgEnum('user_type', ['student', 'consultant', 'admin']);
export const sessionStatusEnum = pgEnum('session_status', ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']);
export const certificationStatusEnum = pgEnum('certification_status', ['in_progress', 'completed', 'expired']);
export const documentTypeEnum = pgEnum('document_type', ['consultation_log', 'evaluation_form', 'reflection_paper', 'case_study']);
export const reviewStatusEnum = pgEnum('review_status', ['pending', 'approved', 'rejected', 'needs_revision']);

// Students table
export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  kajabiUserId: varchar("kajabi_user_id").unique(),
  phone: varchar("phone"),
  timezone: varchar("timezone").default('UTC'),
  courseCompletionDate: timestamp("course_completion_date").notNull(),
  totalVerifiedHours: decimal("total_verified_hours", { precision: 5, scale: 2 }).default('0'),
  certificationStatus: certificationStatusEnum("certification_status").default('in_progress'),
  preferredSessionLength: integer("preferred_session_length").default(60),
  consultationPreferences: jsonb("consultation_preferences").default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Consultants table
export const consultants = pgTable("consultants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  licenseNumber: varchar("license_number"),
  specializations: text("specializations").array(),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }),
  isActive: boolean("is_active").default(true),
  bio: text("bio"),
  yearsExperience: integer("years_experience"),
  totalHoursCompleted: decimal("total_hours_completed", { precision: 8, scale: 2 }).default('0'),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Consultant availability
export const consultantAvailability = pgTable("consultant_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  consultantId: varchar("consultant_id").references(() => consultants.id).notNull(),
  dayOfWeek: integer("day_of_week"), // 0-6 for Sunday-Saturday
  startTime: varchar("start_time"), // HH:MM format
  endTime: varchar("end_time"), // HH:MM format
  isRecurring: boolean("is_recurring").default(true),
  specificDate: timestamp("specific_date"),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Video sessions
export const videoSessions = pgTable("video_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").unique().notNull(),
  recordingEnabled: boolean("recording_enabled").default(true),
  recordingUrl: varchar("recording_url"),
  recordingDurationSeconds: integer("recording_duration_seconds"),
  videoQuality: varchar("video_quality").default('720p'),
  connectionQualityAvg: decimal("connection_quality_avg", { precision: 3, scale: 2 }),
  technicalIssues: jsonb("technical_issues").default('[]'),
  sessionMetadata: jsonb("session_metadata").default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Video participants
export const videoParticipants = pgTable("video_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoSessionId: varchar("video_session_id").references(() => videoSessions.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  userType: userTypeEnum("user_type").notNull(),
  joinTime: timestamp("join_time").notNull(),
  leaveTime: timestamp("leave_time"),
  totalDurationSeconds: integer("total_duration_seconds"),
  audioQualityAvg: decimal("audio_quality_avg", { precision: 3, scale: 2 }),
  videoQualityAvg: decimal("video_quality_avg", { precision: 3, scale: 2 }),
  connectionInterruptions: integer("connection_interruptions").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Consultation sessions
export const consultationSessions = pgTable("consultation_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => students.id).notNull(),
  consultantId: varchar("consultant_id").references(() => consultants.id).notNull(),
  videoSessionId: varchar("video_session_id").references(() => videoSessions.id),
  scheduledStart: timestamp("scheduled_start").notNull(),
  scheduledEnd: timestamp("scheduled_end").notNull(),
  actualStart: timestamp("actual_start"),
  actualEnd: timestamp("actual_end"),
  status: sessionStatusEnum("status").default('scheduled'),
  sessionType: varchar("session_type").default('video_consultation'),
  studentVerifiedAt: timestamp("student_verified_at"),
  consultantVerifiedAt: timestamp("consultant_verified_at"),
  studentNotes: text("student_notes"),
  consultantNotes: text("consultant_notes"),
  sessionRating: integer("session_rating"),
  technicalIssuesReported: boolean("technical_issues_reported").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Student documents
export const studentDocuments = pgTable("student_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => students.id).notNull(),
  documentType: documentTypeEnum("document_type").notNull(),
  fileName: varchar("file_name").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  filePath: varchar("file_path").notNull(),
  mimeType: varchar("mime_type").notNull(),
  uploadTimestamp: timestamp("upload_timestamp").defaultNow(),
  reviewStatus: reviewStatusEnum("review_status").default('pending'),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConsultantSchema = createInsertSchema(consultants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConsultationSessionSchema = createInsertSchema(consultationSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVideoSessionSchema = createInsertSchema(videoSessions).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;
export type InsertConsultant = z.infer<typeof insertConsultantSchema>;
export type Consultant = typeof consultants.$inferSelect;
export type InsertConsultationSession = z.infer<typeof insertConsultationSessionSchema>;
export type ConsultationSession = typeof consultationSessions.$inferSelect;
export type InsertVideoSession = z.infer<typeof insertVideoSessionSchema>;
export type VideoSession = typeof videoSessions.$inferSelect;
export type ConsultantAvailability = typeof consultantAvailability.$inferSelect;
export type StudentDocument = typeof studentDocuments.$inferSelect;
export type VideoParticipant = typeof videoParticipants.$inferSelect;