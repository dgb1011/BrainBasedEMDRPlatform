import { supabase } from './supabase';
import { UserRole } from './auth';

export interface FileUpload {
  file: File;
  bucket: 'documents' | 'recordings' | 'certificates';
  path: string;
  metadata?: Record<string, any>;
}

export interface FileInfo {
  id: string;
  name: string;
  bucket: string;
  path: string;
  size: number;
  mimeType: string;
  url: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export class StorageService {
  // Upload file to storage
  static async uploadFile(upload: FileUpload): Promise<FileInfo> {
    const { data, error } = await supabase.storage
      .from(upload.bucket)
      .upload(upload.path, upload.file, {
        cacheControl: '3600',
        upsert: false,
        metadata: upload.metadata
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(upload.bucket)
      .getPublicUrl(upload.path);

    return {
      id: data.path,
      name: upload.file.name,
      bucket: upload.bucket,
      path: upload.path,
      size: upload.file.size,
      mimeType: upload.file.type,
      url: urlData.publicUrl,
      createdAt: new Date(),
      metadata: upload.metadata
    };
  }

  // Get file URL
  static getFileUrl(bucket: string, path: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }

  // Download file
  static async downloadFile(bucket: string, path: string): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) {
      throw new Error(`Download failed: ${error.message}`);
    }

    return data;
  }

  // List files in bucket
  static async listFiles(bucket: string, path?: string): Promise<FileInfo[]> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path || '');

    if (error) {
      throw new Error(`List files failed: ${error.message}`);
    }

    return data.map(file => ({
      id: file.id,
      name: file.name,
      bucket,
      path: path ? `${path}/${file.name}` : file.name,
      size: file.metadata?.size || 0,
      mimeType: file.metadata?.mimetype || '',
      url: this.getFileUrl(bucket, path ? `${path}/${file.name}` : file.name),
      createdAt: new Date(file.created_at),
      metadata: file.metadata
    }));
  }

  // Delete file
  static async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  // Student document management
  static async uploadStudentDocument(
    userId: string,
    file: File,
    documentType: 'case_study' | 'reflection' | 'certification_request' | 'other',
    metadata?: Record<string, any>
  ): Promise<FileInfo> {
    const path = `${userId}/documents/${documentType}/${Date.now()}-${file.name}`;
    
    return this.uploadFile({
      file,
      bucket: 'documents',
      path,
      metadata: {
        ...metadata,
        documentType,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString()
      }
    });
  }

  // Session recording management
  static async uploadSessionRecording(
    sessionId: string,
    file: File,
    metadata?: Record<string, any>
  ): Promise<FileInfo> {
    const path = `sessions/${sessionId}/recordings/${Date.now()}-${file.name}`;
    
    return this.uploadFile({
      file,
      bucket: 'recordings',
      path,
      metadata: {
        ...metadata,
        sessionId,
        uploadedAt: new Date().toISOString()
      }
    });
  }

  // Certificate management
  static async uploadCertificate(
    userId: string,
    file: File,
    metadata?: Record<string, any>
  ): Promise<FileInfo> {
    const path = `users/${userId}/certificates/${Date.now()}-${file.name}`;
    
    return this.uploadFile({
      file,
      bucket: 'certificates',
      path,
      metadata: {
        ...metadata,
        userId,
        uploadedAt: new Date().toISOString()
      }
    });
  }

  // Get student documents
  static async getStudentDocuments(userId: string): Promise<FileInfo[]> {
    return this.listFiles('documents', userId);
  }

  // Get session recordings
  static async getSessionRecordings(sessionId: string): Promise<FileInfo[]> {
    return this.listFiles('recordings', `sessions/${sessionId}/recordings`);
  }

  // Get user certificates
  static async getUserCertificates(userId: string): Promise<FileInfo[]> {
    return this.listFiles('certificates', `users/${userId}/certificates`);
  }

  // Validate file type
  static validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type);
  }

  // Validate file size
  static validateFileSize(file: File, maxSize: number): boolean {
    return file.size <= maxSize;
  }

  // Get allowed file types by bucket
  static getAllowedFileTypes(bucket: string): string[] {
    switch (bucket) {
      case 'documents':
        return [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png'
        ];
      case 'recordings':
        return [
          'video/mp4',
          'video/webm',
          'video/quicktime'
        ];
      case 'certificates':
        return [
          'application/pdf',
          'image/png',
          'image/jpeg'
        ];
      default:
        return [];
    }
  }

  // Get max file size by bucket
  static getMaxFileSize(bucket: string): number {
    switch (bucket) {
      case 'documents':
        return 10 * 1024 * 1024; // 10MB
      case 'recordings':
        return 100 * 1024 * 1024; // 100MB
      case 'certificates':
        return 5 * 1024 * 1024; // 5MB
      default:
        return 10 * 1024 * 1024; // 10MB default
    }
  }

  // Clean up old files (for maintenance)
  static async cleanupOldFiles(bucket: string, daysOld: number = 365): Promise<void> {
    const files = await this.listFiles(bucket);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    for (const file of files) {
      if (file.createdAt < cutoffDate) {
        await this.deleteFile(bucket, file.path);
      }
    }
  }
} 