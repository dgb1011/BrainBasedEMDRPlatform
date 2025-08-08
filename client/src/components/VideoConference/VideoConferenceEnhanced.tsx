import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from '../ui/use-toast';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Record, 
  StopCircle,
  Users,
  Clock,
  Maximize2,
  Settings
} from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';

interface VideoConferenceEnhancedProps {
  sessionId: string;
  roomId?: string;
  onLeave?: () => void;
}

interface Participant {
  id: string;
  name: string;
  role: 'student' | 'consultant';
  connectionState: 'connecting' | 'connected' | 'disconnected';
}

interface VideoRoom {
  id: string;
  participants: Participant[];
  iceServers: RTCIceServer[];
  recording: boolean;
  status: 'waiting' | 'active' | 'ended';
}

export function VideoConferenceEnhanced({ 
  sessionId, 
  roomId: initialRoomId, 
  onLeave 
}: VideoConferenceEnhancedProps) {
  // State management
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [room, setRoom] = useState<VideoRoom | null>(null);
  const [roomId, setRoomId] = useState(initialRoomId);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor'>('good');
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection
  const { sendMessage, lastMessage, readyState } = useWebSocket('/ws');
  const [socketId, setSocketId] = useState<string | null>(null);

  // Initialize room
  useEffect(() => {
    if (!roomId) {
      createRoom();
    } else {
      joinRoom(roomId);
    }

    return () => {
      cleanup();
    };
  }, []);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage]);

  // Session timer
  useEffect(() => {
    if (room?.status === 'active') {
      sessionTimerRef.current = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    }

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [room?.status]);

  // Create a new room
  const createRoom = async () => {
    try {
      const response = await fetch('/api/video-sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ sessionId })
      });

      const data = await response.json();
      if (data.success) {
        setRoomId(data.room.id);
        await joinRoom(data.room.id);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create video room',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Create room error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create video room',
        variant: 'destructive'
      });
    }
  };

  // Join existing room
  const joinRoom = async (roomId: string) => {
    try {
      // Wait for socket ID
      if (!socketId) {
        setTimeout(() => joinRoom(roomId), 500);
        return;
      }

      const response = await fetch(`/api/video-sessions/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ socketId })
      });

      const data = await response.json();
      if (data.success) {
        setRoom(data.room);
        setParticipant(data.participant);
        await initializeMedia();
        await setupWebRTC(data.room.iceServers);
        setIsConnected(true);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to join video room',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Join room error:', error);
      toast({
        title: 'Error',
        description: 'Failed to join video room',
        variant: 'destructive'
      });
    }
  };

  // Initialize media devices
  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Apply initial mute states
      stream.getVideoTracks().forEach(track => {
        track.enabled = isVideoEnabled;
      });
      stream.getAudioTracks().forEach(track => {
        track.enabled = isAudioEnabled;
      });
    } catch (error) {
      console.error('Media initialization error:', error);
      toast({
        title: 'Error',
        description: 'Failed to access camera or microphone',
        variant: 'destructive'
      });
    }
  };

  // Setup WebRTC connection
  const setupWebRTC = async (iceServers: RTCIceServer[]) => {
    const configuration = { iceServers };
    
    peerConnectionRef.current = new RTCPeerConnection(configuration);
    
    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        if (peerConnectionRef.current && localStreamRef.current) {
          peerConnectionRef.current.addTrack(track, localStreamRef.current);
        }
      });
    }

    // Handle remote stream
    peerConnectionRef.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage({
          type: 'webrtc_signal',
          signal: {
            type: 'ice-candidate',
            candidate: event.candidate
          },
          roomId,
          from: participant?.id,
          to: getOtherParticipantId()
        });
      }
    };

    // Monitor connection state
    peerConnectionRef.current.onconnectionstatechange = () => {
      const state = peerConnectionRef.current?.connectionState;
      console.log('Connection state:', state);
      updateConnectionQuality(state);
    };

    // Check if we should create offer
    if (room && room.participants.length === 2 && isFirstParticipant()) {
      await createAndSendOffer();
    }
  };

  // Create and send offer
  const createAndSendOffer = async () => {
    if (!peerConnectionRef.current) return;

    try {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      
      sendMessage({
        type: 'webrtc_signal',
        signal: {
          type: 'offer',
          offer: offer
        },
        roomId,
        from: participant?.id,
        to: getOtherParticipantId()
      });
    } catch (error) {
      console.error('Create offer error:', error);
    }
  };

  // Handle WebSocket messages
  const handleWebSocketMessage = async (message: any) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'socket_id':
        setSocketId(data.socketId);
        break;

      case 'webrtc_signal':
        await handleWebRTCSignal(data);
        break;

      case 'join':
        // Update room participants
        if (room) {
          setRoom({
            ...room,
            participants: [...room.participants, data.data.participant]
          });
        }
        // If we're the first participant and someone joined, create offer
        if (isFirstParticipant()) {
          await createAndSendOffer();
        }
        break;

      case 'leave':
        // Update room participants
        if (room) {
          setRoom({
            ...room,
            participants: room.participants.filter(p => p.id !== data.data.participantId)
          });
        }
        break;

      case 'recording-start':
        setIsRecording(true);
        toast({
          title: 'Recording Started',
          description: 'The session is now being recorded'
        });
        break;

      case 'recording-stop':
        setIsRecording(false);
        toast({
          title: 'Recording Stopped',
          description: 'The session recording has ended'
        });
        break;
    }
  };

  // Handle WebRTC signaling
  const handleWebRTCSignal = async (data: any) => {
    if (!peerConnectionRef.current) return;

    const { signal } = data;

    try {
      switch (signal.type) {
        case 'offer':
          await peerConnectionRef.current.setRemoteDescription(signal.offer);
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          
          sendMessage({
            type: 'webrtc_signal',
            signal: {
              type: 'answer',
              answer: answer
            },
            roomId,
            from: participant?.id,
            to: data.from
          });
          break;

        case 'answer':
          await peerConnectionRef.current.setRemoteDescription(signal.answer);
          break;

        case 'ice-candidate':
          await peerConnectionRef.current.addIceCandidate(signal.candidate);
          break;
      }
    } catch (error) {
      console.error('WebRTC signal handling error:', error);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  // Toggle recording
  const toggleRecording = async () => {
    if (!roomId) return;

    try {
      const endpoint = isRecording 
        ? `/api/video-sessions/${roomId}/recording/stop`
        : `/api/video-sessions/${roomId}/recording/start`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      const data = await response.json();
      if (!data.success) {
        toast({
          title: 'Error',
          description: `Failed to ${isRecording ? 'stop' : 'start'} recording`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Recording toggle error:', error);
    }
  };

  // Leave room
  const handleLeave = async () => {
    if (roomId && participant) {
      try {
        await fetch(`/api/video-sessions/${roomId}/leave`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({ participantId: participant.id })
        });
      } catch (error) {
        console.error('Leave room error:', error);
      }
    }
    
    cleanup();
    onLeave?.();
  };

  // Cleanup
  const cleanup = () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    // Clear timer
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }
  };

  // Helper functions
  const isFirstParticipant = () => {
    return room && participant && room.participants[0]?.id === participant.id;
  };

  const getOtherParticipantId = () => {
    return room?.participants.find(p => p.id !== participant?.id)?.id;
  };

  const getOtherParticipant = () => {
    return room?.participants.find(p => p.id !== participant?.id);
  };

  const updateConnectionQuality = (state?: string) => {
    if (state === 'connected') {
      setConnectionQuality('good');
    } else if (state === 'connecting') {
      setConnectionQuality('fair');
    } else {
      setConnectionQuality('poor');
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isConsultant = participant?.role === 'consultant';

  return (
    <div className="video-conference-container h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-gray-900 to-transparent">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">Consultation Session</h3>
            <Badge variant={room?.status === 'active' ? 'default' : 'secondary'}>
              {room?.status || 'Connecting...'}
            </Badge>
            {isRecording && (
              <Badge variant="destructive" className="animate-pulse">
                <Record className="w-3 h-3 mr-1" />
                Recording
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatDuration(sessionDuration)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{room?.participants.length || 0}/2</span>
            </div>
            
            <Badge 
              variant={connectionQuality === 'good' ? 'default' : connectionQuality === 'fair' ? 'secondary' : 'destructive'}
            >
              {connectionQuality}
            </Badge>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex h-full">
        {/* Remote Video (Main) */}
        <div className="flex-1 relative bg-gray-800">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {getOtherParticipant() && (
            <div className="absolute bottom-4 left-4 bg-gray-900/80 px-3 py-1 rounded">
              {getOtherParticipant()?.name} ({getOtherParticipant()?.role})
            </div>
          )}
          {!getOtherParticipant() && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">Waiting for participant to join...</p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (PiP) */}
        <div className="absolute bottom-24 right-4 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-gray-900/80 px-2 py-1 rounded text-sm">
            You ({participant?.role})
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur p-4">
        <div className="flex justify-center items-center gap-4">
          <Button
            variant={isAudioEnabled ? 'secondary' : 'destructive'}
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={toggleAudio}
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          <Button
            variant={isVideoEnabled ? 'secondary' : 'destructive'}
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={toggleVideo}
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          {isConsultant && (
            <Button
              variant={isRecording ? 'destructive' : 'secondary'}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={toggleRecording}
            >
              {isRecording ? <StopCircle className="w-5 h-5" /> : <Record className="w-5 h-5" />}
            </Button>
          )}

          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={handleLeave}
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
