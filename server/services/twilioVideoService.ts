import twilio from 'twilio';
const { AccessToken } = twilio.jwt;
const { VideoGrant } = twilio.jwt.AccessToken;
import { supabase } from '../supabase';

export interface VideoSessionConfig {
  sessionId: string;
  consultantId: string;
  studentId: string;
  maxParticipants?: number;
  recordingEnabled?: boolean;
  maxDuration?: number; // in minutes
}

export interface ParticipantInfo {
  userId: string;
  role: 'student' | 'consultant';
  name: string;
  email: string;
}

export class TwilioVideoService {
  private client: twilio.Twilio;
  private apiKey: string;
  private apiSecret: string;
  private accountSid: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID!;
    this.apiKey = process.env.TWILIO_API_KEY!;
    this.apiSecret = process.env.TWILIO_API_SECRET!;
    
    if (!this.accountSid || !this.apiKey || !this.apiSecret) {
      throw new Error('Missing Twilio credentials. Please check your environment variables.');
    }

    this.client = twilio(this.accountSid, process.env.TWILIO_AUTH_TOKEN!);
  }

  /**
   * Generate access token for video session
   */
  generateAccessToken(participantInfo: ParticipantInfo, roomName: string): string {
    try {
      const token = new AccessToken(
        this.accountSid,
        this.apiKey,
        this.apiSecret,
        { 
          identity: `${participantInfo.role}-${participantInfo.userId}`,
          ttl: 3600 // 1 hour
        }
      );

      // Add video grant
      const videoGrant = new VideoGrant({
        room: roomName
      });
      
      token.addGrant(videoGrant);

      console.log(`Generated access token for ${participantInfo.role} ${participantInfo.name} in room ${roomName}`);
      return token.toJwt();
    } catch (error) {
      console.error('Error generating access token:', error);
      throw new Error('Failed to generate video access token');
    }
  }

  /**
   * Create or get video room for EMDR session
   */
  async createVideoSession(config: VideoSessionConfig): Promise<{
    roomSid: string;
    roomName: string;
    studentToken: string;
    consultantToken: string;
  }> {
    try {
      const roomName = `emdr-session-${config.sessionId}`;
      
      // Get participant information
      const [studentInfo, consultantInfo] = await Promise.all([
        this.getParticipantInfo(config.studentId, 'student'),
        this.getParticipantInfo(config.consultantId, 'consultant')
      ]);

      // Create or connect to room
      let room;
      try {
        // Try to get existing room
        room = await this.client.video.rooms(roomName).fetch();
        console.log(`Connected to existing room: ${roomName}`);
      } catch (error) {
        // Room doesn't exist, create new one
        room = await this.client.video.rooms.create({
          uniqueName: roomName,
          type: 'group',
          maxParticipants: config.maxParticipants || 2,
          recordParticipantsOnConnect: config.recordingEnabled || false,
          statusCallback: `${process.env.API_BASE_URL}/api/twilio/video/status`,
          statusCallbackMethod: 'POST'
        });
        console.log(`Created new room: ${roomName}`);
      }

      // Generate access tokens for both participants
      const studentToken = this.generateAccessToken(studentInfo, roomName);
      const consultantToken = this.generateAccessToken(consultantInfo, roomName);

      // Update session in database
      await this.updateSessionInDatabase(config.sessionId, {
        twilio_room_sid: room.sid,
        twilio_room_name: roomName,
        video_session_status: 'created',
        session_start_time: new Date()
      });

      return {
        roomSid: room.sid,
        roomName,
        studentToken,
        consultantToken
      };
    } catch (error) {
      console.error('Error creating video session:', error);
      throw new Error('Failed to create video session');
    }
  }

  /**
   * Start recording for session
   */
  async startRecording(roomSid: string, sessionId: string): Promise<string> {
    try {
      const recording = await this.client.video.recordings.create({
        roomSid,
        statusCallback: `${process.env.API_BASE_URL}/api/twilio/recording/status`,
        statusCallbackMethod: 'POST'
      });

      // Update session with recording info
      await this.updateSessionInDatabase(sessionId, {
        recording_sid: recording.sid,
        recording_status: 'recording'
      });

      console.log(`Started recording for session ${sessionId}: ${recording.sid}`);
      return recording.sid;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Failed to start session recording');
    }
  }

  /**
   * Stop recording and get download URL
   */
  async stopRecording(recordingSid: string, sessionId: string): Promise<string | null> {
    try {
      const recording = await this.client.video.recordings(recordingSid).fetch();
      
      // Update session with recording completion
      await this.updateSessionInDatabase(sessionId, {
        recording_status: 'completed',
        recording_url: recording.url,
        session_end_time: new Date()
      });

      console.log(`Recording completed for session ${sessionId}`);
      return recording.url;
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw new Error('Failed to stop recording');
    }
  }

  /**
   * End video session and cleanup
   */
  async endVideoSession(sessionId: string): Promise<void> {
    try {
      // Get session info
      const { data: session } = await supabase
        .from('consultation_sessions')
        .select('twilio_room_sid, recording_sid')
        .eq('id', sessionId)
        .single();

      if (!session) {
        throw new Error('Session not found');
      }

      // Complete room
      if (session.twilio_room_sid) {
        await this.client.video.rooms(session.twilio_room_sid).update({
          status: 'completed'
        });
      }

      // Calculate session duration and update database
      const endTime = new Date();
      await this.updateSessionInDatabase(sessionId, {
        session_end_time: endTime,
        video_session_status: 'completed'
      });

      console.log(`Video session ${sessionId} ended successfully`);
    } catch (error) {
      console.error('Error ending video session:', error);
      throw new Error('Failed to end video session');
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId: string): Promise<any> {
    try {
      const { data: session } = await supabase
        .from('consultation_sessions')
        .select('twilio_room_sid, session_start_time, session_end_time')
        .eq('id', sessionId)
        .single();

      if (!session?.twilio_room_sid) {
        return null;
      }

      // Get room statistics from Twilio
      const room = await this.client.video.rooms(session.twilio_room_sid).fetch();
      
      return {
        roomSid: room.sid,
        status: room.status,
        duration: room.duration,
        participants: room.maxParticipants,
        startTime: session.session_start_time,
        endTime: session.session_end_time
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return null;
    }
  }

  /**
   * Private helper methods
   */
  private async getParticipantInfo(userId: string, role: 'student' | 'consultant'): Promise<ParticipantInfo> {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error(`User not found: ${userId}`);
    }

    return {
      userId: user.id,
      role,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email
    };
  }

  private async updateSessionInDatabase(sessionId: string, updates: any): Promise<void> {
    const { error } = await supabase
      .from('consultation_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating session in database:', error);
      throw new Error('Failed to update session');
    }
  }
}

// Export singleton instance
export const twilioVideoService = new TwilioVideoService();
