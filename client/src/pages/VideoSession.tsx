import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import VideoConference from '@/components/VideoConference';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function VideoSession() {
  const [match, params] = useRoute('/video/:sessionId');
  const [roomId, setRoomId] = useState<string>();

  const { data: session, isLoading, error } = useQuery({
    queryKey: ['/api/sessions', params?.sessionId],
    enabled: !!params?.sessionId,
    retry: false,
  });

  useEffect(() => {
    if (session?.videoSession?.roomId) {
      setRoomId(session.videoSession.roomId);
    }
  }, [session]);

  const handleEndCall = () => {
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">Session Not Found</h1>
            </div>
            <p className="mt-4 text-sm text-gray-600 mb-4">
              The session you're trying to join could not be found or may have ended.
            </p>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!roomId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-semibold mb-2">Video Session Not Available</h2>
          <p className="text-gray-400 mb-4">This session doesn't have video conferencing enabled.</p>
          <Button onClick={() => window.location.href = '/'} variant="secondary">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <VideoConference
      roomId={roomId}
      sessionId={params?.sessionId || ''}
      onEndCall={handleEndCall}
    />
  );
}
