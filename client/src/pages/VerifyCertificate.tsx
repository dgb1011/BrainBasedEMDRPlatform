import { useEffect, useState } from 'react';
import { RouteComponentProps } from 'wouter';

type Params = { code: string };

export default function VerifyCertificate({ params }: RouteComponentProps<Params>) {
  const { code } = params as Params;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/verify/${code}`);
        const json = await res.json();
        if (!res.ok || json?.isValid === false) {
          setError('Certificate not found');
        } else {
          setData(json);
        }
      } catch (e: any) {
        setError(e?.message || 'Verification failed');
      }
    })();
  }, [code]);

  const download = async () => {
    const res = await fetch(`/api/certificates/${code}/download`);
    const json = await res.json();
    if (json?.url) window.location.href = json.url;
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#667eea] via-white to-[#764ba2] p-6">
      <div className="bg-white/95 backdrop-blur border rounded-2xl shadow-xl w-full max-w-3xl p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Certificate Verification</h1>
          <button className="text-sm px-3 py-1 rounded border hover:bg-gray-50" onClick={copyLink}>Copy link</button>
        </div>
        <p className="text-gray-600 mt-1 mb-6">Code: {code}</p>
        {error && <div className="p-3 rounded bg-red-50 text-red-700">{error}</div>}
        {data && (
          <div className="grid gap-4">
            <div className="text-green-700 bg-green-50 p-3 rounded font-medium">Valid certificate</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Certificate Number</div>
                <div className="font-medium">{data.certificateNumber}</div>
              </div>
              <div>
                <div className="text-gray-500">Student</div>
                <div className="font-medium">{data.studentName}</div>
              </div>
              <div>
                <div className="text-gray-500">Issued</div>
                <div className="font-medium">{new Date(data.issueDate).toLocaleDateString?.() || String(data.issueDate)}</div>
              </div>
              <div>
                <div className="text-gray-500">Hours</div>
                <div className="font-medium">{data.totalHours}</div>
              </div>
            </div>
          </div>
        )}
        {data && (
          <div className="mt-6 flex gap-3">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded" onClick={download}>Download PDF</button>
            <a className="px-4 py-2 border rounded hover:bg-gray-50" href="/" >Back to site</a>
          </div>
        )}
      </div>
    </div>
  );
}


