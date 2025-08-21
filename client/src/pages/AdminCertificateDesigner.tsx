import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/utils';

interface Template {
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

export default function AdminCertificateDesigner() {
  const [template, setTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest('/api/admin/certificates/template', 'GET');
        const json = await res.json();
        setTemplate(json.template);
      } catch {
        toast({ title: 'Failed to load template', variant: 'destructive' });
      }
    })();
  }, []);

  const handleChange = (field: keyof Template, value: string) => {
    if (!template) return;
    setTemplate({ ...template, [field]: value });
  };

  const save = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const res = await apiRequest('/api/admin/certificates/template', 'PUT', template);
      const json = await res.json();
      setTemplate(json.template);
      toast({ title: 'Template saved' });
    } catch {
      toast({ title: 'Failed to save template', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const uploadAsset = async (file: File, field: 'logoUrl' | 'signatureUrl') => {
    try {
      const array = await file.arrayBuffer();
      const uint8Array = new Uint8Array(array);
      const base64 = btoa(Array.from(uint8Array, byte => String.fromCharCode(byte)).join(''));
      const dataUrl = `data:${file.type};base64,${base64}`;
      const res = await apiRequest('/api/admin/certificates/assets', 'POST', { dataUrl, filename: file.name });
      const json = await res.json();
      handleChange(field, json.url);
      toast({ title: 'Asset uploaded' });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message || '', variant: 'destructive' });
    }
  };

  const preview = async () => {
    // Preview triggers generation for a sample eligible student on backend; in real
    // flow, admin will preview per student from the approvals screen.
    toast({ title: 'Preview requested. Use an eligible student in the approvals screen.' });
  };

  if (!template) {
    return <div className="p-6">Loading…</div>;
  }

  return (
    <div className="p-6 grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Certificate Designer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={template.name} onChange={(e) => handleChange('name', e.target.value)} />
            </div>
            <div>
              <Label>Title</Label>
              <Input value={template.title} onChange={(e) => handleChange('title', e.target.value)} />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input value={template.subtitle} onChange={(e) => handleChange('subtitle', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Primary Color</Label>
              <Input type="color" value={template.primaryColor} onChange={(e) => handleChange('primaryColor', e.target.value)} />
            </div>
            <div>
              <Label>Accent Color</Label>
              <Input type="color" value={template.accentColor} onChange={(e) => handleChange('accentColor', e.target.value)} />
            </div>
            <div>
              <Label>Text Color</Label>
              <Input type="color" value={template.textColor} onChange={(e) => handleChange('textColor', e.target.value)} />
            </div>
            <div>
              <Label>Background Start</Label>
              <Input type="color" value={template.backgroundGradientStart} onChange={(e) => handleChange('backgroundGradientStart', e.target.value)} />
            </div>
            <div>
              <Label>Background End</Label>
              <Input type="color" value={template.backgroundGradientEnd} onChange={(e) => handleChange('backgroundGradientEnd', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Logo URL</Label>
              <Input value={template.logoUrl || ''} onChange={(e) => handleChange('logoUrl', e.target.value)} placeholder="https://..." />
              <div className="mt-2"><input type="file" accept="image/*" onChange={(e)=> e.target.files?.[0] && uploadAsset(e.target.files[0], 'logoUrl')} /></div>
            </div>
            <div>
              <Label>Signature URL</Label>
              <Input value={template.signatureUrl || ''} onChange={(e) => handleChange('signatureUrl', e.target.value)} placeholder="https://..." />
              <div className="mt-2"><input type="file" accept="image/*" onChange={(e)=> e.target.files?.[0] && uploadAsset(e.target.files[0], 'signatureUrl')} /></div>
            </div>
          </div>

          <div>
            <Label>Font URL (TTF/OTF)</Label>
            <Input value={template.fontUrl || ''} onChange={(e) => handleChange('fontUrl', e.target.value)} placeholder="https://..." />
          </div>

          <div>
            <Label>Body</Label>
            <Textarea rows={4} value={template.body} onChange={(e) => handleChange('body', e.target.value)} />
          </div>

          <div className="flex gap-3">
            <Button onClick={save} disabled={saving}>Save</Button>
            <Button variant="secondary" onClick={preview}>Preview</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Preview (Static)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-8 relative overflow-hidden" style={{
            background: `linear-gradient(135deg, ${template.backgroundGradientStart} 0%, ${template.backgroundGradientEnd} 100%)`
          }}>
            <div className="bg-white rounded-lg p-10 shadow-xl">
              <div className="text-center">
                {template.logoUrl ? (
                  <div className="flex justify-start mb-2">
                    <img src={template.logoUrl} alt="Logo" className="h-10" />
                  </div>
                ) : null}
                <div className="text-3xl font-bold" style={{ color: template.primaryColor }}>{template.title}</div>
                <div className="text-sm mt-1" style={{ color: template.textColor }}>{template.subtitle}</div>
                <div className="mt-6 text-lg" style={{ color: template.textColor }}>This is to certify that</div>
                <div className="mt-2 text-4xl font-bold" style={{ color: template.textColor }}>Student Name</div>
                <div className="mt-4" style={{ color: template.textColor }}>
                  {template.body.replace('[TOTAL_HOURS]', '40')}
                </div>
                <div className="mt-6 grid grid-cols-2 text-sm" style={{ color: template.textColor }}>
                  <div>Certificate Number: EMDR-202501-XXXX</div>
                  <div className="text-right">Date of Completion: 01/10/2025</div>
                </div>
                {template.signatureUrl ? (
                  <div className="mt-8">
                    <div className="flex justify-center">
                      <img src={template.signatureUrl} alt="Signature" className="h-12" />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Authorized Signature</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


