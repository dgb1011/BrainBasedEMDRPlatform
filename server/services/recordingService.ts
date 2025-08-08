import { supabase } from '../supabase';
import { WebSocket } from 'ws';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface RecordingMetadata {
  id: string;
  roomId: string;
  sessionId: string;
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
  fileSize?: number;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  chunks: RecordingChunk[];
}

export interface RecordingChunk {
  id: string;
  sequence: number;
  size: number;
  timestamp: Date;
  uploadUrl?: string;
}

export interface RecordingSession {
  recordingId: string;
  roomId: string;
  sessionId: string;
  chunks: Map<number, Buffer>;
  metadata: RecordingMetadata;
  isActive: boolean;
}

export class RecordingService {
  private activeRecordings: Map<string, RecordingSession> = new Map();
  private chunkUploadQueue: Map<string, Buffer[]> = new Map();

  /**
   * Start recording a video session
   */
  async startRecording(roomId: string, sessionId: string): Promise<string> {
    try {
      const recordingId = this.generateRecordingId();
      
      // Create recording metadata
      const metadata: RecordingMetadata = {
        id: recordingId,
        roomId,
        sessionId,
        startedAt: new Date(),
        status: 'recording',
        chunks: []
      };

      // Store in database
      const { error } = await supabase
        .from('session_recordings')
        .insert({
          id: recordingId,
          room_id: roomId,
          session_id: sessionId,
          started_at: metadata.startedAt,
          status: 'recording',
          metadata: metadata
        });

      if (error) {
        throw new Error('Failed to create recording record');
      }

      // Initialize recording session
      const recordingSession: RecordingSession = {
        recordingId,
        roomId,
        sessionId,
        chunks: new Map(),
        metadata,
        isActive: true
      };

      this.activeRecordings.set(recordingId, recordingSession);
      this.chunkUploadQueue.set(recordingId, []);

      console.log(`Recording started: ${recordingId} for session ${sessionId}`);
      return recordingId;

    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording and process the final file
   */
  async stopRecording(recordingId: string): Promise<void> {
    try {
      const recording = this.activeRecordings.get(recordingId);
      if (!recording) {
        throw new Error('Recording not found');
      }

      recording.isActive = false;
      recording.metadata.endedAt = new Date();
      recording.metadata.status = 'processing';

      // Calculate duration
      const duration = recording.metadata.endedAt.getTime() - recording.metadata.startedAt.getTime();
      recording.metadata.duration = Math.floor(duration / 1000); // seconds

      // Process and upload final recording
      const fileUrl = await this.processRecording(recording);

      // Update database
      await supabase
        .from('session_recordings')
        .update({
          ended_at: recording.metadata.endedAt,
          duration_seconds: recording.metadata.duration,
          file_url: fileUrl,
          file_size_bytes: recording.metadata.fileSize,
          status: 'completed'
        })
        .eq('id', recordingId);

      // Clean up
      this.activeRecordings.delete(recordingId);
      this.chunkUploadQueue.delete(recordingId);

      console.log(`Recording completed: ${recordingId}`);

    } catch (error) {
      console.error('Error stopping recording:', error);
      
      // Mark as failed
      await supabase
        .from('session_recordings')
        .update({ status: 'failed' })
        .eq('id', recordingId);
      
      throw error;
    }
  }

  /**
   * Handle incoming recording chunk
   */
  async handleRecordingChunk(
    recordingId: string,
    chunkData: Buffer,
    sequence: number
  ): Promise<void> {
    try {
      const recording = this.activeRecordings.get(recordingId);
      if (!recording || !recording.isActive) {
        return;
      }

      // Store chunk
      recording.chunks.set(sequence, chunkData);

      // Create chunk metadata
      const chunk: RecordingChunk = {
        id: crypto.randomBytes(8).toString('hex'),
        sequence,
        size: chunkData.length,
        timestamp: new Date()
      };

      recording.metadata.chunks.push(chunk);

      // Add to upload queue
      const queue = this.chunkUploadQueue.get(recordingId) || [];
      queue.push(chunkData);
      this.chunkUploadQueue.set(recordingId, queue);

      // Process chunk queue (upload in batches)
      if (queue.length >= 10) { // Upload every 10 chunks
        await this.uploadChunkBatch(recordingId);
      }

    } catch (error) {
      console.error('Error handling recording chunk:', error);
    }
  }

  /**
   * Upload batch of chunks to storage
   */
  private async uploadChunkBatch(recordingId: string): Promise<void> {
    try {
      const queue = this.chunkUploadQueue.get(recordingId);
      if (!queue || queue.length === 0) return;

      // Combine chunks into a single buffer
      const combinedBuffer = Buffer.concat(queue);
      
      // Upload to Supabase Storage
      const fileName = `recordings/${recordingId}/chunk-${Date.now()}.webm`;
      const { error } = await supabase.storage
        .from('session-recordings')
        .upload(fileName, combinedBuffer, {
          contentType: 'video/webm'
        });

      if (error) {
        console.error('Error uploading chunk batch:', error);
        return;
      }

      // Clear the queue
      this.chunkUploadQueue.set(recordingId, []);
      
      console.log(`Uploaded chunk batch for recording ${recordingId}`);

    } catch (error) {
      console.error('Error uploading chunk batch:', error);
    }
  }

  /**
   * Process recording and create final file
   */
  private async processRecording(recording: RecordingSession): Promise<string> {
    try {
      // Upload any remaining chunks
      await this.uploadChunkBatch(recording.recordingId);

      // For now, we'll create a simple concatenated file
      // In production, you might want to use FFmpeg for proper video processing
      
      const chunks = Array.from(recording.chunks.entries())
        .sort(([a], [b]) => a - b)
        .map(([, buffer]) => buffer);

      if (chunks.length === 0) {
        throw new Error('No recording chunks found');
      }

      // Combine all chunks
      const finalBuffer = Buffer.concat(chunks);
      recording.metadata.fileSize = finalBuffer.length;

      // Upload final recording
      const fileName = `recordings/${recording.recordingId}/final-recording.webm`;
      const { error } = await supabase.storage
        .from('session-recordings')
        .upload(fileName, finalBuffer, {
          contentType: 'video/webm'
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('session-recordings')
        .getPublicUrl(fileName);

      return publicUrl;

    } catch (error) {
      console.error('Error processing recording:', error);
      throw error;
    }
  }

  /**
   * Get recording details
   */
  async getRecording(recordingId: string): Promise<any> {
    const { data, error } = await supabase
      .from('session_recordings')
      .select(`
        *,
        session:consultation_sessions(*)
      `)
      .eq('id', recordingId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Get recordings for a session
   */
  async getSessionRecordings(sessionId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('session_recordings')
      .select('*')
      .eq('session_id', sessionId)
      .order('started_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Get recordings for a student
   */
  async getStudentRecordings(studentId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('session_recordings')
      .select(`
        *,
        session:consultation_sessions!inner(student_id)
      `)
      .eq('session.student_id', studentId)
      .eq('status', 'completed')
      .order('started_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Delete recording
   */
  async deleteRecording(recordingId: string): Promise<void> {
    try {
      // Get recording details
      const recording = await this.getRecording(recordingId);
      if (!recording) {
        throw new Error('Recording not found');
      }

      // Delete file from storage
      if (recording.file_url) {
        const fileName = recording.file_url.split('/').pop();
        await supabase.storage
          .from('session-recordings')
          .remove([`recordings/${recordingId}/${fileName}`]);
      }

      // Delete chunks directory
      const { data: files } = await supabase.storage
        .from('session-recordings')
        .list(`recordings/${recordingId}`);

      if (files && files.length > 0) {
        const filePaths = files.map(file => `recordings/${recordingId}/${file.name}`);
        await supabase.storage
          .from('session-recordings')
          .remove(filePaths);
      }

      // Delete database record
      await supabase
        .from('session_recordings')
        .delete()
        .eq('id', recordingId);

      console.log(`Recording deleted: ${recordingId}`);

    } catch (error) {
      console.error('Error deleting recording:', error);
      throw error;
    }
  }

  /**
   * Generate presigned URL for recording download
   */
  async generateDownloadUrl(recordingId: string, expiresIn: number = 3600): Promise<string> {
    const recording = await this.getRecording(recordingId);
    if (!recording || !recording.file_url) {
      throw new Error('Recording not found or not available');
    }

    // Extract file path from URL
    const urlParts = recording.file_url.split('/');
    const fileName = urlParts.slice(-2).join('/'); // recordings/id/file.webm

    const { data, error } = await supabase.storage
      .from('session-recordings')
      .createSignedUrl(fileName, expiresIn);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  }

  /**
   * Handle WebSocket connection for real-time recording
   */
  handleWebSocketRecording(ws: WebSocket, recordingId: string): void {
    const recording = this.activeRecordings.get(recordingId);
    if (!recording) {
      ws.send(JSON.stringify({
        type: 'recording_error',
        message: 'Recording session not found'
      }));
      return;
    }

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'recording_chunk':
            await this.handleRecordingChunk(
              recordingId,
              Buffer.from(data.chunk, 'base64'),
              data.sequence
            );
            break;

          case 'recording_stop':
            await this.stopRecording(recordingId);
            ws.send(JSON.stringify({
              type: 'recording_stopped',
              recordingId
            }));
            break;
        }
      } catch (error) {
        console.error('WebSocket recording error:', error);
        ws.send(JSON.stringify({
          type: 'recording_error',
          message: 'Failed to process recording data'
        }));
      }
    });

    ws.on('close', () => {
      console.log(`Recording WebSocket closed for ${recordingId}`);
    });

    // Send initial confirmation
    ws.send(JSON.stringify({
      type: 'recording_ready',
      recordingId
    }));
  }

  /**
   * Get recording statistics
   */
  async getRecordingStats(): Promise<{
    totalRecordings: number;
    totalSize: number;
    avgDuration: number;
    completedRecordings: number;
  }> {
    const { data: stats } = await supabase
      .from('session_recordings')
      .select('status, duration_seconds, file_size_bytes');

    if (!stats) {
      return {
        totalRecordings: 0,
        totalSize: 0,
        avgDuration: 0,
        completedRecordings: 0
      };
    }

    const totalRecordings = stats.length;
    const completedRecordings = stats.filter(s => s.status === 'completed').length;
    const totalSize = stats.reduce((sum, s) => sum + (s.file_size_bytes || 0), 0);
    const totalDuration = stats.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const avgDuration = totalRecordings > 0 ? totalDuration / totalRecordings : 0;

    return {
      totalRecordings,
      totalSize,
      avgDuration,
      completedRecordings
    };
  }

  /**
   * Cleanup old recordings (called by cron job)
   */
  async cleanupOldRecordings(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data: oldRecordings } = await supabase
        .from('session_recordings')
        .select('id')
        .lt('started_at', cutoffDate.toISOString());

      if (oldRecordings && oldRecordings.length > 0) {
        for (const recording of oldRecordings) {
          await this.deleteRecording(recording.id);
        }
        
        console.log(`Cleaned up ${oldRecordings.length} old recordings`);
      }
    } catch (error) {
      console.error('Error cleaning up old recordings:', error);
    }
  }

  /**
   * Generate unique recording ID
   */
  private generateRecordingId(): string {
    return `rec_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Get active recording for room
   */
  getActiveRecording(roomId: string): RecordingSession | undefined {
    return Array.from(this.activeRecordings.values()).find(
      recording => recording.roomId === roomId && recording.isActive
    );
  }

  /**
   * Check if room is being recorded
   */
  isRoomRecording(roomId: string): boolean {
    return !!this.getActiveRecording(roomId);
  }
}

// Export singleton instance
export const recordingService = new RecordingService();
