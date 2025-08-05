import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Settings,
  Monitor,
  Users
} from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface VideoConferenceProps {
  roomId: string;
  onLeave?: () => void;
}

export default function VideoConference({ roomId, onLeave }: VideoConferenceProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const { sendMessage, lastMessage } = useWebSocket('/ws');

  useEffect(() => {
    initializeMedia();
    setupWebRTC();
    
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setIsConnected(true);
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const setupWebRTC = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };

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
        setParticipantCount(2);
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
          from: 'local'
        });
      }
    };

    // Handle connection state changes
    peerConnectionRef.current.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnectionRef.current?.connectionState);
    };

    // Handle ICE connection state changes
    peerConnectionRef.current.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnectionRef.current?.iceConnectionState);
    };

    // Join the room
    sendMessage({
      type: 'join_video_session',
      roomId,
      participantId: `participant_${Date.now()}`
    });
  };

  const handleWebSocketMessage = (message: any) => {
    const data = JSON.parse(message.data);
    
    switch (data.type) {
      case 'video_session_joined':
        console.log('Joined video session:', data.roomId);
        break;
        
      case 'webrtc_signal':
        handleWebRTCSignal(data.signal);
        break;
    }
  };

  const handleWebRTCSignal = async (signal: any) => {
    if (!peerConnectionRef.current) return;

    switch (signal.type) {
      case 'offer':
        await peerConnectionRef.current.setRemoteDescription(signal);
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        sendMessage({
          type: 'webrtc_signal',
          signal: answer,
          roomId
        });
        break;

      case 'answer':
        await peerConnectionRef.current.setRemoteDescription(signal);
        break;

      case 'ice-candidate':
        await peerConnectionRef.current.addIceCandidate(signal.candidate);
        break;
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const shareScreen = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      
      // Replace video track with screen share
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          await sender.replaceTrack(screenStream.getVideoTracks()[0]);
        }
      }
      
      // Update local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const leaveSession = () => {
    cleanup();
    onLeave?.();
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">EMDR Consultation Session</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <Users className="h-4 w-4" />
              <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs ${
              isConnected ? 'bg-green-600' : 'bg-red-600'
            }`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* Remote Video */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-0 h-full">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover rounded-lg"
                poster="/api/placeholder/640/480"
              />
              {!remoteVideoRef.current?.srcObject && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-700 rounded-lg">
                  <div className="text-center">
                    <Video className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-300">Waiting for participant...</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Local Video */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-0 h-full relative">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
                You
              </div>
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-700 rounded-lg">
                  <VideoOff className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={toggleAudio}
            className={`rounded-full p-3 ${
              isAudioEnabled 
                ? 'bg-gray-600 hover:bg-gray-500' 
                : 'bg-red-600 hover:bg-red-500'
            }`}
          >
            {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <Button
            onClick={toggleVideo}
            className={`rounded-full p-3 ${
              isVideoEnabled 
                ? 'bg-gray-600 hover:bg-gray-500' 
                : 'bg-red-600 hover:bg-red-500'
            }`}
          >
            {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <Button
            onClick={shareScreen}
            className="rounded-full p-3 bg-blue-600 hover:bg-blue-500"
          >
            <Monitor className="h-5 w-5" />
          </Button>

          <Button
            onClick={leaveSession}
            className="rounded-full p-3 bg-red-600 hover:bg-red-500"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>

          <Button
            className="rounded-full p-3 bg-gray-600 hover:bg-gray-500"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}