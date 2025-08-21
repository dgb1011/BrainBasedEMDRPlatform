import fs from 'fs/promises';
import path from 'path';

export interface CertificateTemplate {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  backgroundGradientStart: string;
  backgroundGradientEnd: string;
  logoUrl?: string;
  signatureUrl?: string;
  fontUrl?: string;
  title: string;
  subtitle: string;
  body: string;
}

const TEMPLATE_FILE = path.resolve(process.cwd(), 'server', 'certificate-template.json');

export class CertificateTemplateService {
  static async ensureFile(): Promise<void> {
    try {
      await fs.access(TEMPLATE_FILE);
    } catch {
      const template: CertificateTemplate = {
        id: 'default',
        name: 'BrainBased Default',
        primaryColor: process.env.CERT_DEFAULT_PRIMARY_COLOR || '#2563eb',
        accentColor: process.env.CERT_DEFAULT_ACCENT_COLOR || '#7e22ce',
        textColor: process.env.CERT_DEFAULT_TEXT_COLOR || '#1e293b',
        backgroundGradientStart: process.env.CERT_DEFAULT_BG_GRADIENT_START || '#667eea',
        backgroundGradientEnd: process.env.CERT_DEFAULT_BG_GRADIENT_END || '#764ba2',
        logoUrl: '',
        signatureUrl: '',
        fontUrl: '',
        title: 'Certificate of Completion',
        subtitle: 'EMDR Basic Training Certification',
        body: 'has successfully completed [TOTAL_HOURS] hours of EMDR Consultation and met all requirements of the BrainBased EMDR Training Institute.'
      };
      await fs.writeFile(TEMPLATE_FILE, JSON.stringify(template, null, 2), 'utf8');
    }
  }

  static async getTemplate(): Promise<CertificateTemplate> {
    await this.ensureFile();
    const raw = await fs.readFile(TEMPLATE_FILE, 'utf8');
    return JSON.parse(raw) as CertificateTemplate;
  }

  static async saveTemplate(input: Partial<CertificateTemplate>): Promise<CertificateTemplate> {
    const current = await this.getTemplate();
    const updated = { ...current, ...input, id: 'default' } as CertificateTemplate;
    await fs.writeFile(TEMPLATE_FILE, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  }
}

export const certificateTemplateService = CertificateTemplateService;


