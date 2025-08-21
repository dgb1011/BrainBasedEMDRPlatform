import { supabase } from '../supabase';
import { twilioEmailService } from './twilioEmailService';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import QRCode from 'qrcode';
import { CertificateTemplateService } from './certificateTemplateService';
import fetch from 'node-fetch';

export interface CertificateData {
  studentId: string;
  studentName: string;
  email: string;
  totalHours: number;
  completionDate: Date;
  courseId?: string;
  courseName?: string;
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  studentId: string;
  issuedDate: Date;
  totalHours: number;
  pdfUrl?: string;
  verificationCode: string;
  qrCodeData: string;
  status: 'generating' | 'completed' | 'failed';
}

export class CertificateService {
  constructor() {}

  /**
   * Generate certificate for student who completed 40 hours
   */
  async generateCertificate(studentId: string): Promise<Certificate> {
    try {
      // Get student details with verification hours
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          *,
          user:users(*),
          sessions:consultation_sessions(*)
        `)
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        throw new Error('Student not found');
      }

      // Verify student has 40+ hours (either total_consultation_hours or total_verified_hours)
      const completedHours = Math.max(
        Number(student.total_consultation_hours || 0),
        Number(student.total_verified_hours || 0)
      );
      if (completedHours < 40) {
        throw new Error('Student has not completed required 40 hours');
      }

      // Generate certificate data
      const certificateNumber = this.generateCertificateNumber();
      const verificationCode = this.generateVerificationCode();
      const qrCodeData = this.generateQRCodeData(certificateNumber, verificationCode);

      const certificateData: CertificateData = {
        studentId,
        studentName: `${student.user.first_name} ${student.user.last_name}`,
        email: student.user.email,
        totalHours: completedHours,
        completionDate: new Date(),
        courseName: 'EMDR Basic Training'
      };

      // Create certificate record
      const { data: certificate, error: certError } = await supabase
        .from('certifications')
        .insert({
          student_id: studentId,
          certificate_number: certificateNumber,
          issued_date: new Date(),
          total_hours_completed: certificateData.totalHours,
          verification_code: verificationCode,
          qr_code_data: qrCodeData,
          status: 'generating'
        })
        .select()
        .single();

      if (certError) {
        throw new Error('Failed to create certificate record');
      }

      // Generate PDF using in-house renderer
      const pdfUrl = await this.generatePdf(certificateData, certificateNumber, verificationCode);

      // Update certificate with PDF URL
      await supabase
        .from('certifications')
        .update({
          certificate_url: pdfUrl,
          status: 'completed'
        })
        .eq('id', certificate.id);

      // Send certificate email
      await this.sendCertificateEmail(certificateData, {
        certificateNumber,
        verificationCode,
        pdfUrl,
        issueDate: new Date().toLocaleDateString()
      });

      // Record notification for the student
      await supabase
        .from('notifications')
        .insert({
          user_id: student.user.id,
          title: 'Your EMDR Certificate is Ready',
          message: `Congratulations! Your certificate (${certificateNumber}) has been issued.`,
          type: 'success',
          related_entity_type: 'certificate',
          related_entity_id: certificate.id
        });

      // Update student status
      await supabase
        .from('students')
        .update({
          certification_status: 'completed',
          certification_completed_at: new Date()
        })
        .eq('id', studentId);

      // Add to professional directory
      await this.addToProfessionalDirectory(studentId, certificateNumber);

      return {
        id: certificate.id,
        certificateNumber,
        studentId,
        issuedDate: new Date(),
        totalHours: certificateData.totalHours,
        pdfUrl,
        verificationCode,
        qrCodeData,
        status: 'completed'
      };

    } catch (error) {
      console.error('Certificate generation error:', error);
      
      // Update status to failed
      await supabase
        .from('certifications')
        .update({ status: 'failed' })
        .eq('student_id', studentId)
        .eq('status', 'generating');
      
      throw error;
    }
  }

  /**
   * Render preview PDF without mutating DB records
   */
  async renderPreview(studentId: string): Promise<{ url: string }> {
    // Fetch minimal student info
    const { data: student } = await supabase
      .from('students')
      .select(`*, user:users(*)`)
      .eq('id', studentId)
      .single();
    if (!student) throw new Error('Student not found');

    const certificateNumber = `PREVIEW-${Date.now()}`;
    const certificateData: CertificateData = {
      studentId,
      studentName: `${student.user.first_name} ${student.user.last_name}`,
      email: student.user.email,
      totalHours: student.total_consultation_hours || 40,
      completionDate: new Date(),
      courseName: 'EMDR Basic Training'
    };
    const bufferUrl = await this.generatePdf(certificateData, certificateNumber, 'PREVIEW');
    return { url: bufferUrl };
  }

  /**
   * Generate PDF certificate using in-house renderer (PDFKit)
   */
  private async generatePdf(
    data: CertificateData,
    certificateNumber: string,
    verificationCode: string
  ): Promise<string> {
    const template = await CertificateTemplateService.getTemplate();
    const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 48 });
    const chunks: Buffer[] = [];
    const stream = doc as unknown as Readable;
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));

    const primary = template.primaryColor || '#2563eb';
    const accent = template.accentColor || '#7e22ce';
    const textColor = template.textColor || '#1e293b';

    // Optional font
    if (template.fontUrl) {
      try {
        const resp = await fetch(template.fontUrl);
        const buf = Buffer.from(await resp.arrayBuffer());
        doc.registerFont('BrandFont', buf);
        doc.font('BrandFont');
      } catch {}
    }

    // Background
    doc.rect(0, 0, doc.page.width, doc.page.height)
       .fill('#ffffff');
    doc.save();
    doc.rect(0, 0, 20, doc.page.height).fill(primary);
    doc.rect(doc.page.width - 20, 0, 20, doc.page.height).fill(accent);
    doc.restore();

    // Header
    doc.fill(primary).fontSize(36).text(template.title || 'Certificate of Completion', { align: 'center' });
    doc.moveDown(0.2);
    doc.fill(textColor).fontSize(16).text(template.subtitle || 'EMDR Basic Training Certification', { align: 'center' });

    // Optional logo
    if (template.logoUrl) {
      try {
        const resp = await fetch(template.logoUrl);
        const buf = Buffer.from(await resp.arrayBuffer());
        doc.image(buf, 48, 40, { height: 48 });
      } catch {}
    }

    // Student name
    doc.moveDown(1.2);
    doc.fill(textColor).fontSize(22).text('This is to certify that', { align: 'center' });
    doc.moveDown(0.5);
    doc.fill(textColor).fontSize(48).text(data.studentName, { align: 'center' });

    // Body
    doc.moveDown(0.6);
    const bodyText = (template.body || 'has successfully completed [TOTAL_HOURS] hours of EMDR Consultation.').replace('[TOTAL_HOURS]', String(data.totalHours));
    doc.fontSize(16)
       .fill(textColor)
       .text(bodyText, { align: 'center', width: doc.page.width - 160 });

    // Details
    doc.moveDown(1);
    doc.fontSize(14).fill(textColor);
    const left = 160; const mid = doc.page.width / 2; const right = doc.page.width - 320;
    doc.text(`Certificate Number: ${certificateNumber}`, left, doc.y);
    doc.text(`Completion Date: ${data.completionDate.toLocaleDateString()}`, right, doc.y, { align: 'right' });

    // QR code
    const verifyUrl = `${process.env.APP_URL || ''}/verify/${verificationCode}`;
    const qrPng = await QRCode.toDataURL(verifyUrl, { margin: 0, scale: 3 });
    const qrBase64 = qrPng.replace(/^data:image\/(png|gif|jpeg);base64,/, '');
    const qrBuffer = Buffer.from(qrBase64, 'base64');
    const qrSize = 96;
    doc.image(qrBuffer, doc.page.width - qrSize - 64, doc.page.height - qrSize - 64, { width: qrSize, height: qrSize });

    // Footer bar
    doc.moveTo(64, doc.page.height - 96).lineTo(doc.page.width - 64, doc.page.height - 96).strokeColor('#e5e7eb').stroke();
    doc.fill(textColor).fontSize(12).text('BrainBased EMDR Training Institute', 64, doc.page.height - 84, { align: 'left' });
    doc.fill(textColor).fontSize(12).text(`Issued on ${new Date().toLocaleDateString()}`, 64, doc.page.height - 64, { align: 'left' });
    doc.fillColor('#64748b').fontSize(10).text('Scan to verify', doc.page.width - qrSize - 64, doc.page.height - 64, { width: qrSize, align: 'center' });

    // Optional signature
    if (template.signatureUrl) {
      try {
        const resp = await fetch(template.signatureUrl);
        const buf = Buffer.from(await resp.arrayBuffer());
        const sigWidth = 160;
        const sigY = doc.page.height - 120;
        doc.image(buf, doc.page.width/2 - sigWidth/2, sigY, { width: sigWidth });
        doc.fillColor(textColor).fontSize(10).text('Authorized Signature', doc.page.width/2 - sigWidth/2, sigY + 50, { width: sigWidth, align: 'center' });
      } catch {}
    }

    doc.end();
    await new Promise<void>((resolve) => stream.on('end', () => resolve()));
    const pdfBuffer = Buffer.concat(chunks);

    // Upload to Supabase Storage
    const fileName = `users/${data.studentId}/certificates/certificate-${certificateNumber}.pdf`;
    const { error } = await supabase.storage
      .from('certificates')
      .upload(fileName, pdfBuffer, { contentType: 'application/pdf' });
    if (error) throw error;
    const { data: publicData } = supabase.storage.from('certificates').getPublicUrl(fileName);
    return publicData.publicUrl;
  }

  /**
   * Update text elements in Canva design (deprecated - using in-house PDF renderer)
   */
  private async updateCanvaText(_designId: string, _replacements: Record<string, string>): Promise<void> {
    // This method is deprecated since we moved to in-house PDF rendering
    // Kept for compatibility but not used
    console.warn('updateCanvaText is deprecated - using in-house PDF renderer');
  }

  /**
   * Generate simple PDF certificate (fallback)
   */
  private async generateSimplePDF(
    data: CertificateData, 
    certificateNumber: string
  ): Promise<string> {
    // For now, return a placeholder URL
    // In production, you'd use a PDF generation library like PDFKit
    const html = this.generateCertificateHTML(data, certificateNumber);
    
    // This would use a service like Puppeteer to generate PDF from HTML
    // For now, we'll store the HTML and return a placeholder
    const fileName = `certificate-${certificateNumber}.html`;
    
    // Upload HTML to storage as placeholder
    const { data: uploadData, error } = await supabase.storage
      .from('certificates')
      .upload(fileName, html, {
        contentType: 'text/html'
      });

    if (error) {
      throw new Error('Failed to upload certificate');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('certificates')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  /**
   * Generate certificate HTML template
   */
  private generateCertificateHTML(data: CertificateData, certificateNumber: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>EMDR Certification - ${data.studentName}</title>
    <style>
        body {
            font-family: 'Georgia', serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .certificate {
            background: white;
            width: 800px;
            padding: 60px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            border: 8px solid #2563eb;
        }
        
        .header {
            color: #2563eb;
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 3px;
        }
        
        .subheader {
            color: #666;
            font-size: 18px;
            margin-bottom: 40px;
        }
        
        .student-name {
            font-size: 48px;
            color: #1e293b;
            font-weight: bold;
            margin: 30px 0;
            text-decoration: underline;
            text-decoration-color: #2563eb;
        }
        
        .achievement {
            font-size: 20px;
            color: #374151;
            margin: 30px 0;
            line-height: 1.6;
        }
        
        .hours {
            font-size: 32px;
            color: #dc2626;
            font-weight: bold;
            margin: 20px 0;
        }
        
        .details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 50px;
            text-align: left;
        }
        
        .detail-item {
            text-align: center;
        }
        
        .detail-label {
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .detail-value {
            font-size: 18px;
            color: #1e293b;
            font-weight: bold;
            margin-top: 5px;
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px solid #e5e7eb;
            color: #666;
            font-size: 14px;
        }
        
        .verification {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 10px;
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="header">Certificate of Completion</div>
        <div class="subheader">EMDR Basic Training Certification</div>
        
        <div class="achievement">
            This is to certify that
        </div>
        
        <div class="student-name">${data.studentName}</div>
        
        <div class="achievement">
            has successfully completed the required consultation hours for 
            <strong>Eye Movement Desensitization and Reprocessing (EMDR) Basic Training</strong>
            and has demonstrated competency in the principles and practices of EMDR therapy.
        </div>
        
        <div class="hours">${data.totalHours} Hours Completed</div>
        
        <div class="details">
            <div class="detail-item">
                <div class="detail-label">Certificate Number</div>
                <div class="detail-value">${certificateNumber}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Date of Completion</div>
                <div class="detail-value">${data.completionDate.toLocaleDateString()}</div>
            </div>
        </div>
        
        <div class="verification">
            <div class="detail-label">Verification Code</div>
            <div class="detail-value">${this.generateVerificationCode()}</div>
            <div style="margin-top: 10px; font-size: 12px; color: #666;">
                Verify this certificate at: ${process.env.APP_URL}/verify
            </div>
        </div>
        
        <div class="footer">
            <strong>BrainBased EMDR Training Institute</strong><br>
            Authorized by the International EMDR Association<br>
            <em>Issued on ${new Date().toLocaleDateString()}</em>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Upload PDF to Supabase Storage
   */
  private async uploadPDFToStorage(_pdfUrl: string, _certificateNumber: string): Promise<string> {
    // Deprecated with the in-house renderer; retained for compatibility
    throw new Error('uploadPDFToStorage is not used in the in-house renderer path');
  }

  /**
   * Send certificate email
   */
  private async sendCertificateEmail(
    data: CertificateData,
    certificate: {
      certificateNumber: string;
      verificationCode: string;
      pdfUrl: string;
      issueDate: string;
    }
  ): Promise<void> {
    await twilioEmailService.sendCertificateAvailable(
      data.email,
      data.studentName,
      certificate.pdfUrl
    );
  }

  /**
   * Add to professional directory
   */
  private async addToProfessionalDirectory(
    studentId: string, 
    certificateNumber: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('professional_directory')
        .insert({
          student_id: studentId,
          certificate_number: certificateNumber,
          is_public: true,
          listing_status: 'active',
          created_at: new Date()
        });

      if (error) {
        console.error('Error adding to professional directory:', error);
      }
    } catch (error) {
      console.error('Error adding to professional directory:', error);
    }
  }

  /**
   * Verify certificate
   */
  async verifyCertificate(verificationCode: string): Promise<any> {
    const { data, error } = await supabase
      .from('certifications')
      .select(`
        *,
        student:students(user:users(*))
      `)
      .eq('verification_code', verificationCode)
      .eq('status', 'completed')
      .single();

    if (error || !data) {
      return null;
    }

    return {
      isValid: true,
      certificateNumber: data.certificate_number,
      studentName: `${data.student.user.first_name} ${data.student.user.last_name}`,
      issueDate: data.issued_date,
      totalHours: data.total_hours_completed,
      status: data.status
    };
  }

  /**
   * Generate unique certificate number
   */
  private generateCertificateNumber(): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `EMDR-${year}${month}-${random}`;
  }

  /**
   * Generate verification code
   */
  private generateVerificationCode(): string {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }

  /**
   * Generate QR code data
   */
  private generateQRCodeData(certificateNumber: string, verificationCode: string): string {
    return JSON.stringify({
      certificateNumber,
      verificationCode,
      verifyUrl: `${process.env.APP_URL}/verify/${verificationCode}`,
      issuer: 'BrainBased EMDR Training Institute'
    });
  }

  /**
   * Check if student is eligible for certification
   */
  async checkEligibility(studentId: string): Promise<{
    eligible: boolean;
    currentHours: number;
    requiredHours: number;
    missingRequirements: string[];
  }> {
    const { data: student } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (!student) {
      return {
        eligible: false,
        currentHours: 0,
        requiredHours: 40,
        missingRequirements: ['Student profile not found']
      };
    }

    const currentHours = student.total_consultation_hours || 0;
    const missingRequirements = [];

    if (currentHours < 40) {
      missingRequirements.push(`${40 - currentHours} more hours needed`);
    }

    if (student.certification_status === 'completed') {
      missingRequirements.push('Certificate already issued');
    }

    return {
      eligible: missingRequirements.length === 0,
      currentHours,
      requiredHours: 40,
      missingRequirements
    };
  }
}

// Export singleton instance
export const certificateService = new CertificateService();
