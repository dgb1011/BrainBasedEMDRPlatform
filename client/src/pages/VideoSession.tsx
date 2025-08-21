import { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import TwilioVideoConference from '@/components/TwilioVideoConference';

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
    <TwilioVideoConference 
      roomId={`session-${sessionId}`}
      onLeave={handleLeaveSession}
    />
  );
}