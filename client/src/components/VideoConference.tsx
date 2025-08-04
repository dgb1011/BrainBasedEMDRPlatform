import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, Phone } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface VideoConferenceProps {
  roomId: string;
  sessionId: string;
  onEndCall?: () => void;
}

export default function VideoConference({ roomId, sessionId, onEndCall }: VideoConferenceProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [participantCount, setParticipantCount] = useState(1);

  const { sendMessage, lastMessage } = useWebSocket();

  useEffect(() => {
    initializeVideo();
    startSessionTimer();
    
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage]);

  const initializeVideo = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true, noiseSuppression: true }
      });

      localStream.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize peer connection
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      };

      peerConnection.current = new RTCPeerConnection(configuration);

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        if (peerConnection.current) {
          peerConnection.current.addTrack(track, stream);
        }
      });

      // Handle remote stream
      peerConnection.current.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setIsConnected(true);
        setParticipantCount(2);
      };

      // Handle ICE candidates
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          sendMessage({
            type: 'webrtc_signal',
            signal: {
              type: 'ice-candidate',
              candidate: event.candidate
            },
            roomId,
            from: 'local',
            to: 'remote'
          });
        }
      };

      // Join the video session
      sendMessage({
        type: 'join_video_session',
        roomId,
        sessionId
      });

    } catch (error) {
      console.error('Error initializing video:', error);
    }
  };

  const handleWebSocketMessage = async (message: any) => {
    if (message.type === 'webrtc_signal' && peerConnection.current) {
      const { signal } = message;

      if (signal.type === 'offer') {
        await peerConnection.current.setRemoteDescription(signal);
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        
        sendMessage({
          type: 'webrtc_signal',
          signal: {
            type: 'answer',
            sdp: answer.sdp
          },
          roomId,
          from: 'local',
          to: 'remote'
        });
      } else if (signal.type === 'answer') {
        await peerConnection.current.setRemoteDescription(signal);
      } else if (signal.type === 'ice-candidate') {
        await peerConnection.current.addIceCandidate(signal.candidate);
      }
    }
  };

  const startSessionTimer = () => {
    const interval = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleAudio = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const shareScreen = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      if (peerConnection.current && localStream.current) {
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnection.current.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );

        if (sender) {
          await sender.replaceTrack(videoTrack);
        }

        videoTrack.onended = () => {
          // Return to camera when screen share ends
          const cameraTrack = localStream.current?.getVideoTracks()[0];
          if (sender && cameraTrack) {
            sender.replaceTrack(cameraTrack);
          }
        };
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const endCall = () => {
    cleanup();
    onEndCall?.();
  };

  const cleanup = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Main video area */}
      <div className="flex-1 flex">
        {/* Remote video (main) */}
        <div className="flex-1 relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Waiting for participant to join...</p>
              </div>
            </div>
          )}
          
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg">
            Dr. Emily Chen
          </div>
        </div>

        {/* Sidebar with local video and session info */}
        <Card className="w-64 bg-gray-800 border-gray-700 rounded-none">
          <CardContent className="p-4 h-full flex flex-col">
            {/* Local video */}
            <div className="mb-4">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-32 object-cover rounded-lg bg-gray-700"
              />
              <p className="text-white text-sm mt-2">You</p>
            </div>

            {/* Session info */}
            <div className="text-white text-sm space-y-2 flex-1">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                <span>Recording</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2">⏱️</span>
                <span>{formatDuration(sessionDuration)}</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2">👥</span>
                <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2">📶</span>
                <span className="text-green-400">Good</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="bg-black bg-opacity-75 p-4">
        <div className="flex justify-center space-x-4">
          <Button
            variant={isAudioEnabled ? "secondary" : "destructive"}
            size="lg"
            className="rounded-full h-12 w-12 p-0"
            onClick={toggleAudio}
          >
            {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
          
          <Button
            variant={isVideoEnabled ? "secondary" : "destructive"}
            size="lg"
            className="rounded-full h-12 w-12 p-0"
            onClick={toggleVideo}
          >
            {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>
          
          <Button
            variant="secondary"
            size="lg"
            className="rounded-full h-12 w-12 p-0"
            onClick={shareScreen}
          >
            <Monitor className="h-5 w-5" />
          </Button>
          
          <Button
            variant="secondary"
            size="lg"
            className="rounded-full h-12 w-12 p-0"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
          
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full h-12 w-12 p-0"
            onClick={endCall}
          >
            <Phone className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
