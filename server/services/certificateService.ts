import { supabase } from '../supabase';
import { emailService } from './emailService';
import crypto from 'crypto';
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
  private canvaApiKey: string;
  private templateId: string;

  constructor() {
    this.canvaApiKey = process.env.CANVA_API_KEY || '';
    this.templateId = process.env.CANVA_TEMPLATE_ID || '';
  }

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

      // Verify student has 40+ hours
      if ((student.total_consultation_hours || 0) < 40) {
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
        totalHours: student.total_consultation_hours,
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

      // Generate PDF using Canva API
      const pdfUrl = await this.generatePDFWithCanva(certificateData, certificateNumber);

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
   * Generate PDF certificate using Canva API
   */
  private async generatePDFWithCanva(
    data: CertificateData, 
    certificateNumber: string
  ): Promise<string> {
    try {
      if (!this.canvaApiKey || !this.templateId) {
        // Fallback: Generate simple PDF without Canva
        return await this.generateSimplePDF(data, certificateNumber);
      }

      // Create design from template
      const createResponse = await fetch('https://api.canva.com/rest/v1/designs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.canvaApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          design_type: 'Certificate',
          template_id: this.templateId,
          title: `EMDR Certificate - ${data.studentName}`
        })
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create design from template');
      }

      const { design } = await createResponse.json() as any;

      // Update text elements with certificate data
      await this.updateCanvaText(design.id, {
        '[STUDENT_NAME]': data.studentName,
        '[COMPLETION_DATE]': data.completionDate.toLocaleDateString(),
        '[TOTAL_HOURS]': data.totalHours.toString(),
        '[CERTIFICATE_NUMBER]': certificateNumber,
        '[ISSUE_DATE]': new Date().toLocaleDateString()
      });

      // Export as PDF
      const exportResponse = await fetch(`https://api.canva.com/rest/v1/designs/${design.id}/exports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.canvaApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: 'PDF',
          quality: 'high'
        })
      });

      if (!exportResponse.ok) {
        throw new Error('Failed to export PDF');
      }

      const { export: exportData } = await exportResponse.json() as any;

      // Wait for export to complete
      let pdfUrl = '';
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        const statusResponse = await fetch(`https://api.canva.com/rest/v1/exports/${exportData.id}`, {
          headers: {
            'Authorization': `Bearer ${this.canvaApiKey}`
          }
        });

        const status = await statusResponse.json() as any;

        if (status.status === 'success') {
          pdfUrl = status.url;
          break;
        } else if (status.status === 'failed') {
          throw new Error('PDF export failed');
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }

      if (!pdfUrl) {
        throw new Error('PDF export timeout');
      }

      // Upload to Supabase Storage
      const uploadedUrl = await this.uploadPDFToStorage(pdfUrl, certificateNumber);
      
      return uploadedUrl;

    } catch (error) {
      console.error('Canva PDF generation error:', error);
      // Fallback to simple PDF
      return await this.generateSimplePDF(data, certificateNumber);
    }
  }

  /**
   * Update text elements in Canva design
   */
  private async updateCanvaText(designId: string, replacements: Record<string, string>): Promise<void> {
    try {
      // Get design elements
      const elementsResponse = await fetch(`https://api.canva.com/rest/v1/designs/${designId}/elements`, {
        headers: {
          'Authorization': `Bearer ${this.canvaApiKey}`
        }
      });

      const { elements } = await elementsResponse.json() as any;

      // Update text elements
      for (const element of elements) {
        if (element.type === 'text' && element.text) {
          let updatedText = element.text;
          
          for (const [placeholder, value] of Object.entries(replacements)) {
            updatedText = updatedText.replace(new RegExp(placeholder, 'g'), value);
          }

          if (updatedText !== element.text) {
            await fetch(`https://api.canva.com/rest/v1/designs/${designId}/elements/${element.id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${this.canvaApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                text: updatedText
              })
            });
          }
        }
      }
    } catch (error) {
      console.error('Error updating Canva text:', error);
    }
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
  private async uploadPDFToStorage(pdfUrl: string, certificateNumber: string): Promise<string> {
    try {
      // Download PDF from Canva
      const response = await fetch(pdfUrl);
      const pdfBuffer = await response.buffer();

      // Upload to Supabase Storage
      const fileName = `certificate-${certificateNumber}.pdf`;
      const { data, error } = await supabase.storage
        .from('certificates')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf'
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading PDF to storage:', error);
      return pdfUrl; // Return original URL as fallback
    }
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
    await emailService.sendCertificateEmail({
      to: data.email,
      firstName: data.studentName.split(' ')[0],
      lastName: data.studentName.split(' ').slice(1).join(' '),
      certificateNumber: certificate.certificateNumber,
      verificationCode: certificate.verificationCode,
      issueDate: certificate.issueDate,
      totalHours: data.totalHours,
      attachments: [
        {
          filename: `EMDR-Certificate-${certificate.certificateNumber}.pdf`,
          path: certificate.pdfUrl
        }
      ]
    });
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
