import React, { useEffect, useRef, useState } from 'react';
import { connect, Room, RemoteParticipant, LocalParticipant, RemoteTrack } from 'twilio-video';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Settings,
  Monitor,
  Users,
  Play,
  Square,
  Clock,
  User
} from 'lucide-react';

interface TwilioVideoConferenceProps {
  sessionId: string;
  onLeave?: () => void;
  onSessionEnd?: (duration: number) => void;
  userRole: 'student' | 'consultant';
  participantName?: string;
}

export default function TwilioVideoConference({ 
  sessionId, 
  onLeave, 
  onSessionEnd,
  userRole,
  participantName 
}: TwilioVideoConferenceProps) {
  // Connection state
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Media controls
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // Participants
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
  
  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  
  // Refs
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const screenShareRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();

  // Initialize video session
  useEffect(() => {
    connectToSession();
    
    return () => {
      disconnectFromSession();
    };
  }, [sessionId]);

  // Session timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isConnected && sessionStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
        setSessionDuration(duration);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected, sessionStartTime]);

  const connectToSession = async () => {
    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      // Get access token from backend
      const response = await fetch(`/api/twilio/video/sessions/${sessionId}/token`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to get access token');
      }
      
      const { accessToken, roomName } = await response.json();
      
      // Connect to Twilio room
      const twilioRoom = await connect(accessToken, {
        name: roomName,
        audio: isAudioEnabled,
        video: isVideoEnabled,
        bandwidthProfile: {
          video: {
            mode: 'collaboration',
            dominantSpeakerPriority: 'standard',
            renderDimensions: {
              high: { width: 1280, height: 720 },
              standard: { width: 640, height: 480 },
              low: { width: 320, height: 240 }
            }
          }
        },
        networkQuality: {
          local: 1,
          remote: 1
        },
        preferredVideoCodecs: ['VP8'],
        maxAudioBitrate: 16000,
        maxVideoBitrate: 2500000
      });
      
      setRoom(twilioRoom);
      setLocalParticipant(twilioRoom.localParticipant);
      setIsConnected(true);
      setSessionStartTime(new Date());
      
      // Handle existing participants
      twilioRoom.participants.forEach(addParticipant);
      
      // Set up event listeners
      twilioRoom.on('participantConnected', addParticipant);
      twilioRoom.on('participantDisconnected', removeParticipant);
      twilioRoom.on('trackSubscribed', handleTrackSubscribed);
      twilioRoom.on('trackUnsubscribed', handleTrackUnsubscribed);
      twilioRoom.on('disconnected', handleDisconnected);
      
      // Attach local participant video
      attachParticipantTracks(twilioRoom.localParticipant, localVideoRef.current);
      
      // Start recording if consultant
      if (userRole === 'consultant') {
        await startRecording();
      }
      
      toast({
        title: 'Connected',
        description: 'Successfully joined the EMDR consultation session',
        duration: 3000
      });
      
    } catch (error) {
      console.error('Error connecting to session:', error);
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect');
      toast({
        title: 'Connection Failed',
        description: 'Failed to join the video session. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectFromSession = () => {
    if (room) {
      room.disconnect();
    }
  };

  const addParticipant = (participant: RemoteParticipant) => {
    setParticipants(prev => [...prev, participant]);
    
    // Attach existing tracks
    participant.tracks.forEach(publication => {
      if (publication.isSubscribed && publication.track) {
        attachTrack(publication.track);
      }
    });
    
    // Listen for new tracks
    participant.on('trackSubscribed', handleTrackSubscribed);
    participant.on('trackUnsubscribed', handleTrackUnsubscribed);
    
    toast({
      title: 'Participant Joined',
      description: `${participant.identity} joined the session`,
      duration: 2000
    });
  };

  const removeParticipant = (participant: RemoteParticipant) => {
    setParticipants(prev => prev.filter(p => p.sid !== participant.sid));
    
    toast({
      title: 'Participant Left',
      description: `${participant.identity} left the session`,
      duration: 2000
    });
  };

  const handleTrackSubscribed = (track: RemoteTrack) => {
    attachTrack(track);
  };

  const handleTrackUnsubscribed = (track: RemoteTrack) => {
    detachTrack(track);
  };

  const attachTrack = (track: RemoteTrack) => {
    const element = track.attach();
    
    if (track.kind === 'video') {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.appendChild(element);
      }
    } else if (track.kind === 'audio') {
      document.body.appendChild(element);
    }
  };

  const detachTrack = (track: RemoteTrack) => {
    track.detach().forEach(element => {
      element.remove();
    });
  };

  const attachParticipantTracks = (participant: LocalParticipant | RemoteParticipant, container: HTMLElement | null) => {
    if (!container) return;
    
    participant.tracks.forEach(publication => {
      if (publication.track && publication.kind === 'video') {
        const videoElement = publication.track.attach();
        container.appendChild(videoElement);
      }
    });
  };

  const handleDisconnected = () => {
    setRoom(null);
    setLocalParticipant(null);
    setParticipants([]);
    setIsConnected(false);
    
    const duration = sessionDuration;
    if (onSessionEnd && duration > 0) {
      onSessionEnd(duration);
    }
  };

  const toggleVideo = () => {
    if (localParticipant) {
      localParticipant.videoTracks.forEach(publication => {
        if (publication.track) {
          if (isVideoEnabled) {
            publication.track.disable();
          } else {
            publication.track.enable();
          }
        }
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    if (localParticipant) {
      localParticipant.audioTracks.forEach(publication => {
        if (publication.track) {
          if (isAudioEnabled) {
            publication.track.disable();
          } else {
            publication.track.enable();
          }
        }
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleScreenShare = async () => {
    if (!localParticipant) return;
    
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        
        const screenTrack = screenStream.getVideoTracks()[0];
        await localParticipant.publishTrack(screenTrack);
        
        setIsScreenSharing(true);
        
        screenTrack.onended = () => {
          setIsScreenSharing(false);
        };
      } else {
        // Stop screen sharing
        localParticipant.videoTracks.forEach(publication => {
          if (publication.trackName === 'screen') {
            localParticipant.unpublishTrack(publication.track!);
          }
        });
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Screen sharing error:', error);
      toast({
        title: 'Screen Share Failed',
        description: 'Unable to start screen sharing',
        variant: 'destructive'
      });
    }
  };

  const startRecording = async () => {
    try {
      const response = await fetch(`/api/twilio/video/sessions/${sessionId}/recording/start`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        setIsRecording(true);
        toast({
          title: 'Recording Started',
          description: 'Session recording has begun',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('Recording start error:', error);
    }
  };

  const endSession = async () => {
    try {
      // End session on backend
      await fetch(`/api/twilio/video/sessions/${sessionId}/end`, {
        method: 'POST',
        credentials: 'include'
      });
      
      // Disconnect from room
      disconnectFromSession();
      
      toast({
        title: 'Session Ended',
        description: 'EMDR consultation session has been completed',
        duration: 3000
      });
      
      if (onLeave) {
        onLeave();
      }
    } catch (error) {
      console.error('End session error:', error);
      toast({
        title: 'Error',
        description: 'Failed to end session properly',
        variant: 'destructive'
      });
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Connecting to Session</h3>
            <p className="text-gray-600">Initializing video conference...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <PhoneOff className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connection Failed</h3>
            <p className="text-gray-600 mb-4">{connectionError}</p>
            <Button onClick={connectToSession} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-white">EMDR Consultation Session</h1>
            {isRecording && (
              <div className="flex items-center space-x-2 bg-red-600 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-medium">Recording</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4 text-white">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{formatDuration(sessionDuration)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>{participants.length + 1}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative">
        {/* Remote Video (Main) */}
        <div 
          ref={remoteVideoRef}
          className="w-full h-full bg-gray-800 flex items-center justify-center"
        >
          {participants.length === 0 && (
            <div className="text-center text-gray-400">
              <User className="h-24 w-24 mx-auto mb-4" />
              <p className="text-lg">Waiting for other participant...</p>
            </div>
          )}
        </div>

        {/* Local Video (Picture in Picture) */}
        <div className="absolute top-4 right-4 w-64 h-48 bg-gray-700 rounded-lg overflow-hidden border-2 border-gray-600">
          <div 
            ref={localVideoRef}
            className="w-full h-full"
          >
            {!isVideoEnabled && (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                <VideoOff className="h-12 w-12 text-gray-400" />
              </div>
            )}
          </div>
          <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
            You ({userRole})
          </div>
        </div>

        {/* Screen Share Area */}
        {isScreenSharing && (
          <div 
            ref={screenShareRef}
            className="absolute bottom-4 left-4 w-64 h-48 bg-gray-700 rounded-lg overflow-hidden border-2 border-blue-500"
          >
            <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
              Screen Share
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={toggleAudio}
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            className="rounded-full w-12 h-12"
          >
            {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <Button
            onClick={toggleVideo}
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            className="rounded-full w-12 h-12"
          >
            {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <Button
            onClick={toggleScreenShare}
            variant={isScreenSharing ? "secondary" : "outline"}
            size="lg"
            className="rounded-full w-12 h-12"
          >
            <Monitor className="h-5 w-5" />
          </Button>

          <Button
            onClick={endSession}
            variant="destructive"
            size="lg"
            className="rounded-full w-12 h-12"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="text-center mt-2 text-gray-400 text-sm">
          {userRole === 'consultant' ? 'You are the session supervisor' : 'You are the student participant'}
        </div>
      </div>
    </div>
  );
}
