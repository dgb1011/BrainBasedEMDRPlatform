import { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import VideoConference from '@/components/VideoConference';

export default function VideoSession() {
  const { sessionId } = useParams();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!sessionId) {
      setLocation('/');
      return;
    }
  }, [sessionId, setLocation]);

  const handleLeaveSession = () => {
    setLocation('/');
  };

  if (!sessionId) {
    return null;
  }

  return (
    <VideoConference 
      roomId={`session-${sessionId}`}
      onLeave={handleLeaveSession}
    />
  );
}