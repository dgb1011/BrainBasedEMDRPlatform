import { WebSocket } from 'ws';
import { supabase } from '../supabase';
import crypto from 'crypto';

export interface VideoRoom {
  id: string;
  sessionId: string;
  participants: Participant[];
  recording: boolean;
  recordingId?: string;
  startTime: Date;
  endTime?: Date;
  iceServers: IceServer[];
  status: 'waiting' | 'active' | 'ended';
}

export interface Participant {
  id: string;
  userId: string;
  name: string;
  role: 'student' | 'consultant';
  joinedAt: Date;
  leftAt?: Date;
  connectionState: 'connecting' | 'connected' | 'disconnected';
  stream?: MediaStream;
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface SignalMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'recording-start' | 'recording-stop';
  roomId: string;
  from: string;
  to?: string;
  data?: any;
}

export class WebRTCService {
  private rooms: Map<string, VideoRoom> = new Map();
  private connections: Map<string, WebSocket> = new Map();
  private participantSockets: Map<string, string> = new Map(); // participantId -> socketId

  constructor() {
    // Initialize ICE servers configuration
    this.initializeIceServers();
  }

  private initializeIceServers() {
    // In production, these would come from environment variables
    // and include TURN servers for NAT traversal
    this.defaultIceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // TURN servers would be added here in production
      // {
      //   urls: 'turn:turn.brainbasedemdr.com:3478',
      //   username: this.generateTurnUsername(),
      //   credential: this.generateTurnCredential()
      // }
    ];
  }

  private defaultIceServers: IceServer[] = [];

  /**
   * Generate unique room ID
   */
  private generateRoomId(): string {
    return `room_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Generate TURN server credentials (for production)
   */
  private generateTurnCredentials(): { username: string; credential: string } {
    const username = `${Date.now()}:${crypto.randomBytes(8).toString('hex')}`;
    const credential = crypto
      .createHmac('sha1', process.env.TURN_SECRET || 'default-secret')
      .update(username)
      .digest('base64');
    
    return { username, credential };
  }

  /**
   * Create a new video room for a consultation session
   */
  async createRoom(sessionId: string, hostUserId: string): Promise<VideoRoom> {
    // Check if room already exists for this session
    const existingRoom = Array.from(this.rooms.values()).find(
      room => room.sessionId === sessionId
    );
    
    if (existingRoom) {
      return existingRoom;
    }

    // Get session details from database
    const { data: session, error } = await supabase
      .from('consultation_sessions')
      .select('*, student:students(*), consultant:consultants(*)')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      throw new Error('Session not found');
    }

    // Create new room
    const room: VideoRoom = {
      id: this.generateRoomId(),
      sessionId,
      participants: [],
      recording: false,
      startTime: new Date(),
      iceServers: this.defaultIceServers,
      status: 'waiting'
    };

    // Store room
    this.rooms.set(room.id, room);

    // Store room info in database for persistence
    await supabase.from('video_rooms').insert({
      id: room.id,
      session_id: sessionId,
      created_by: hostUserId,
      ice_servers: room.iceServers,
      status: room.status,
      created_at: room.startTime
    });

    return room;
  }

  /**
   * Join a video room
   */
  async joinRoom(
    roomId: string, 
    userId: string, 
    name: string, 
    role: 'student' | 'consultant',
    socketId: string
  ): Promise<{ room: VideoRoom; participant: Participant }> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Check if participant already in room
    const existingParticipant = room.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      existingParticipant.connectionState = 'connecting';
      existingParticipant.joinedAt = new Date();
      this.participantSockets.set(existingParticipant.id, socketId);
      return { room, participant: existingParticipant };
    }

    // Create new participant
    const participant: Participant = {
      id: `participant_${crypto.randomBytes(8).toString('hex')}`,
      userId,
      name,
      role,
      joinedAt: new Date(),
      connectionState: 'connecting'
    };

    // Add to room
    room.participants.push(participant);
    this.participantSockets.set(participant.id, socketId);

    // Update room status if both participants joined
    if (room.participants.length === 2 && room.status === 'waiting') {
      room.status = 'active';
      await this.startAttendanceTracking(room);
    }

    // Notify other participants
    this.broadcastToRoom(room.id, {
      type: 'join',
      roomId: room.id,
      from: participant.id,
      data: {
        participant: {
          id: participant.id,
          name: participant.name,
          role: participant.role
        }
      }
    }, participant.id);

    return { room, participant };
  }

  /**
   * Leave a video room
   */
  async leaveRoom(roomId: string, participantId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.find(p => p.id === participantId);
    if (!participant) return;

    // Update participant status
    participant.leftAt = new Date();
    participant.connectionState = 'disconnected';

    // Remove socket mapping
    this.participantSockets.delete(participantId);

    // Notify other participants
    this.broadcastToRoom(room.id, {
      type: 'leave',
      roomId: room.id,
      from: participantId,
      data: { participantId }
    }, participantId);

    // Check if room should be closed
    const activeParticipants = room.participants.filter(
      p => p.connectionState !== 'disconnected'
    );

    if (activeParticipants.length === 0) {
      await this.endRoom(room.id);
    }
  }

  /**
   * Handle WebRTC signaling
   */
  async handleSignal(message: SignalMessage, socketId: string): Promise<void> {
    const room = this.rooms.get(message.roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    switch (message.type) {
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        // Forward signal to specific participant
        if (message.to) {
          const targetSocketId = this.participantSockets.get(message.to);
          if (targetSocketId) {
            const targetSocket = this.connections.get(targetSocketId);
            if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
              targetSocket.send(JSON.stringify(message));
            }
          }
        }
        break;

      case 'recording-start':
        await this.startRecording(message.roomId);
        break;

      case 'recording-stop':
        await this.stopRecording(message.roomId);
        break;
    }
  }

  /**
   * Start recording a room
   */
  async startRecording(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room || room.recording) return;

    room.recording = true;
    room.recordingId = `recording_${crypto.randomBytes(8).toString('hex')}`;

    // Store recording metadata
    await supabase.from('session_recordings').insert({
      id: room.recordingId,
      room_id: room.id,
      session_id: room.sessionId,
      started_at: new Date(),
      status: 'recording'
    });

    // Notify all participants
    this.broadcastToRoom(roomId, {
      type: 'recording-start',
      roomId,
      from: 'system',
      data: { recordingId: room.recordingId }
    });
  }

  /**
   * Stop recording a room
   */
  async stopRecording(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room || !room.recording) return;

    room.recording = false;

    // Update recording metadata
    if (room.recordingId) {
      await supabase
        .from('session_recordings')
        .update({
          ended_at: new Date(),
          status: 'completed'
        })
        .eq('id', room.recordingId);
    }

    // Notify all participants
    this.broadcastToRoom(roomId, {
      type: 'recording-stop',
      roomId,
      from: 'system',
      data: { recordingId: room.recordingId }
    });
  }

  /**
   * Start automatic attendance tracking
   */
  private async startAttendanceTracking(room: VideoRoom): Promise<void> {
    const { sessionId, participants } = room;

    // Verify we have both student and consultant
    const student = participants.find(p => p.role === 'student');
    const consultant = participants.find(p => p.role === 'consultant');

    if (!student || !consultant) return;

    // Mark attendance in database
    await supabase
      .from('session_attendance')
      .insert({
        session_id: sessionId,
        student_id: student.userId,
        consultant_id: consultant.userId,
        joined_at: new Date(),
        video_room_id: room.id,
        auto_verified: true
      });

    console.log(`Attendance tracking started for session ${sessionId}`);
  }

  /**
   * End a room and calculate duration
   */
  private async endRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.endTime = new Date();
    room.status = 'ended';

    // Calculate session duration
    const durationMinutes = Math.floor(
      (room.endTime.getTime() - room.startTime.getTime()) / (1000 * 60)
    );

    // Update room in database
    await supabase
      .from('video_rooms')
      .update({
        ended_at: room.endTime,
        status: 'ended',
        duration_minutes: durationMinutes
      })
      .eq('id', room.id);

    // Update attendance records
    await supabase
      .from('session_attendance')
      .update({
        left_at: room.endTime,
        duration_minutes: durationMinutes
      })
      .eq('video_room_id', room.id);

    // Auto-verify consultation hours if duration > 30 minutes
    if (durationMinutes >= 30) {
      await this.autoVerifyConsultationHours(room.sessionId, durationMinutes);
    }

    // Clean up
    this.rooms.delete(roomId);
  }

  /**
   * Auto-verify consultation hours
   */
  private async autoVerifyConsultationHours(
    sessionId: string, 
    durationMinutes: number
  ): Promise<void> {
    const hours = durationMinutes / 60;

    // Update session with verified hours
    await supabase
      .from('consultation_sessions')
      .update({
        student_confirmed: true,
        consultant_confirmed: true,
        verification_date: new Date(),
        verification_notes: `Auto-verified from ${durationMinutes} minute video session`,
        actual_duration_minutes: durationMinutes
      })
      .eq('id', sessionId);

    // Get session details to update student hours
    const { data: session } = await supabase
      .from('consultation_sessions')
      .select('student_id')
      .eq('id', sessionId)
      .single();

    if (session) {
      // Update student's total hours
      const { data: student } = await supabase
        .from('students')
        .select('total_consultation_hours')
        .eq('id', session.student_id)
        .single();

      if (student) {
        const newTotal = (student.total_consultation_hours || 0) + hours;
        
        await supabase
          .from('students')
          .update({
            total_consultation_hours: newTotal,
            updated_at: new Date()
          })
          .eq('id', session.student_id);

        // Check for milestone
        if (newTotal >= 40) {
          await this.trigger40HourMilestone(session.student_id);
        } else if (newTotal >= 35 && student.total_consultation_hours < 35) {
          await this.trigger35HourWarning(session.student_id);
        }
      }
    }
  }

  /**
   * Trigger 35-hour warning
   */
  private async trigger35HourWarning(studentId: string): Promise<void> {
    console.log(`35-hour warning triggered for student ${studentId}`);
    // Email service will be implemented separately
  }

  /**
   * Trigger 40-hour milestone completion
   */
  private async trigger40HourMilestone(studentId: string): Promise<void> {
    console.log(`40-hour milestone completed for student ${studentId}`);
    
    // Update student certification status
    await supabase
      .from('students')
      .update({
        certification_status: 'completed',
        certification_completed_at: new Date()
      })
      .eq('id', studentId);

    // Certificate generation will be implemented separately
  }

  /**
   * Register WebSocket connection
   */
  registerConnection(socketId: string, ws: WebSocket): void {
    this.connections.set(socketId, ws);
  }

  /**
   * Unregister WebSocket connection
   */
  unregisterConnection(socketId: string): void {
    this.connections.delete(socketId);
    
    // Clean up any participant mappings
    for (const [participantId, sid] of this.participantSockets) {
      if (sid === socketId) {
        // Find and leave rooms
        for (const [roomId, room] of this.rooms) {
          const participant = room.participants.find(p => p.id === participantId);
          if (participant) {
            this.leaveRoom(roomId, participantId);
          }
        }
      }
    }
  }

  /**
   * Broadcast message to all participants in a room
   */
  private broadcastToRoom(
    roomId: string, 
    message: SignalMessage, 
    excludeParticipantId?: string
  ): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.participants.forEach(participant => {
      if (participant.id === excludeParticipantId) return;
      
      const socketId = this.participantSockets.get(participant.id);
      if (socketId) {
        const ws = this.connections.get(socketId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      }
    });
  }

  /**
   * Get room details
   */
  getRoom(roomId: string): VideoRoom | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get all active rooms
   */
  getActiveRooms(): VideoRoom[] {
    return Array.from(this.rooms.values()).filter(
      room => room.status === 'active'
    );
  }
}

// Export singleton instance
export const webrtcService = new WebRTCService();
