import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Slider } from '../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { 
  Eye, 
  Volume2, 
  Vibrate, 
  Play, 
  Pause, 
  RotateCcw,
  Settings,
  FileText,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface EMDRToolsProps {
  sessionId: string;
  isConsultant: boolean;
  onToolStateChange?: (state: any) => void;
}

interface BilateralSettings {
  type: 'visual' | 'auditory' | 'tactile';
  speed: number; // 0.5 to 3 seconds per cycle
  intensity: number; // 0 to 100
  pattern: 'horizontal' | 'diagonal' | 'figure8' | 'random';
  duration: number; // minutes
}

export function EMDRTools({ sessionId, isConsultant, onToolStateChange }: EMDRToolsProps) {
  // State for bilateral stimulation
  const [isActive, setIsActive] = useState(false);
  const [settings, setSettings] = useState<BilateralSettings>({
    type: 'visual',
    speed: 1,
    intensity: 50,
    pattern: 'horizontal',
    duration: 2
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // State for session notes
  const [sessionNotes, setSessionNotes] = useState('');
  const [sul, setSul] = useState(0); // Subjective Units of Disturbance
  const [voc, setVoc] = useState(0); // Validity of Cognition
  
  // Refs for animation
  const animationRef = useRef<number | null>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Timer for session duration
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1;
          if (newTime >= settings.duration * 60) {
            handleStop();
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, settings.duration]);

  // Visual bilateral stimulation animation
  const animateVisual = (timestamp: number) => {
    if (!ballRef.current || !isActive) return;

    const cycleTime = settings.speed * 1000; // Convert to milliseconds
    const progress = (timestamp % cycleTime) / cycleTime;
    
    let x = 0;
    let y = 0;

    switch (settings.pattern) {
      case 'horizontal':
        x = Math.sin(progress * Math.PI * 2) * 200;
        break;
      case 'diagonal':
        x = Math.sin(progress * Math.PI * 2) * 200;
        y = Math.sin(progress * Math.PI * 2) * 50;
        break;
      case 'figure8':
        x = Math.sin(progress * Math.PI * 2) * 200;
        y = Math.sin(progress * Math.PI * 4) * 50;
        break;
      case 'random':
        if (progress < 0.01) {
          x = (Math.random() - 0.5) * 400;
          y = (Math.random() - 0.5) * 100;
        }
        break;
    }

    ballRef.current.style.transform = `translate(${x}px, ${y}px)`;
    
    if (isActive) {
      animationRef.current = requestAnimationFrame(animateVisual);
    }
  };

  // Auditory bilateral stimulation
  const startAuditoryStimulation = () => {
    if (!audioContextRef.current) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    const pannerNode = audioContextRef.current.createStereoPanner();

    oscillator.connect(gainNode);
    gainNode.connect(pannerNode);
    pannerNode.connect(audioContextRef.current.destination);

    oscillator.frequency.value = 440; // A4 note
    gainNode.gain.value = settings.intensity / 100;

    oscillator.start();
    oscillatorRef.current = oscillator;

    // Alternate between left and right
    let isLeft = true;
    const panInterval = setInterval(() => {
      if (!isActive) {
        clearInterval(panInterval);
        return;
      }
      pannerNode.pan.value = isLeft ? -1 : 1;
      isLeft = !isLeft;
    }, settings.speed * 500); // Half cycle for each side
  };

  const stopAuditoryStimulation = () => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current = null;
    }
  };

  // Handle start/stop
  const handleStart = () => {
    setIsActive(true);
    setElapsedTime(0);

    switch (settings.type) {
      case 'visual':
        animationRef.current = requestAnimationFrame(animateVisual);
        break;
      case 'auditory':
        startAuditoryStimulation();
        break;
      case 'tactile':
        // In a real implementation, this would trigger haptic feedback
        console.log('Tactile stimulation started');
        break;
    }

    onToolStateChange?.({ isActive: true, settings });
  };

  const handleStop = () => {
    setIsActive(false);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    stopAuditoryStimulation();

    onToolStateChange?.({ isActive: false, settings });
  };

  const handleReset = () => {
    handleStop();
    setElapsedTime(0);
    setSul(0);
    setVoc(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isConsultant) {
    // Student view - simplified, read-only
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            EMDR Session Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isActive && (
              <div className="text-center">
                <Badge variant="default" className="mb-4">
                  Session Active
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Follow the consultant's guidance
                </p>
                {settings.type === 'visual' && (
                  <div className="relative h-32 bg-gray-100 rounded-lg mt-4 overflow-hidden">
                    <div 
                      ref={ballRef}
                      className="absolute top-1/2 left-1/2 w-8 h-8 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2 transition-transform"
                    />
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label>SUD Level</Label>
                <p className="text-2xl font-bold">{sul}/10</p>
              </div>
              <div>
                <Label>VOC Level</Label>
                <p className="text-2xl font-bold">{voc}/7</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Consultant view - full controls
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            EMDR Session Tools
          </span>
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? `Active - ${formatTime(elapsedTime)}` : 'Inactive'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bilateral" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bilateral">Bilateral Stimulation</TabsTrigger>
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
            <TabsTrigger value="notes">Session Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="bilateral" className="space-y-4">
            {/* Stimulation Type */}
            <div className="space-y-2">
              <Label>Stimulation Type</Label>
              <Select
                value={settings.type}
                onValueChange={(value: any) => setSettings({ ...settings, type: value })}
                disabled={isActive}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visual">
                    <span className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Visual (Eye Movement)
                    </span>
                  </SelectItem>
                  <SelectItem value="auditory">
                    <span className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      Auditory (Bilateral Sound)
                    </span>
                  </SelectItem>
                  <SelectItem value="tactile">
                    <span className="flex items-center gap-2">
                      <Vibrate className="w-4 h-4" />
                      Tactile (Bilateral Tapping)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pattern (for visual) */}
            {settings.type === 'visual' && (
              <div className="space-y-2">
                <Label>Movement Pattern</Label>
                <Select
                  value={settings.pattern}
                  onValueChange={(value: any) => setSettings({ ...settings, pattern: value })}
                  disabled={isActive}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal">Horizontal</SelectItem>
                    <SelectItem value="diagonal">Diagonal</SelectItem>
                    <SelectItem value="figure8">Figure 8</SelectItem>
                    <SelectItem value="random">Random</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Speed Control */}
            <div className="space-y-2">
              <Label>Speed (seconds per cycle): {settings.speed}s</Label>
              <Slider
                value={[settings.speed]}
                onValueChange={([value]) => setSettings({ ...settings, speed: value })}
                min={0.5}
                max={3}
                step={0.1}
                disabled={isActive}
              />
            </div>

            {/* Intensity Control */}
            <div className="space-y-2">
              <Label>Intensity: {settings.intensity}%</Label>
              <Slider
                value={[settings.intensity]}
                onValueChange={([value]) => setSettings({ ...settings, intensity: value })}
                min={0}
                max={100}
                step={5}
                disabled={isActive}
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Duration (minutes): {settings.duration}</Label>
              <Slider
                value={[settings.duration]}
                onValueChange={([value]) => setSettings({ ...settings, duration: value })}
                min={1}
                max={10}
                step={1}
                disabled={isActive}
              />
            </div>

            {/* Visual Preview */}
            {settings.type === 'visual' && (
              <div className="relative h-32 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <div 
                  ref={ballRef}
                  className="absolute top-1/2 left-1/2 w-8 h-8 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2 transition-transform"
                  style={{ 
                    opacity: settings.intensity / 100,
                    transition: `transform ${settings.speed}s ease-in-out`
                  }}
                />
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2">
              {!isActive ? (
                <Button onClick={handleStart} className="flex-1">
                  <Play className="w-4 h-4 mr-2" />
                  Start Bilateral Stimulation
                </Button>
              ) : (
                <Button onClick={handleStop} variant="destructive" className="flex-1">
                  <Pause className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              )}
              <Button onClick={handleReset} variant="outline">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="assessment" className="space-y-4">
            {/* SUD Scale */}
            <div className="space-y-2">
              <Label>SUD (Subjective Units of Disturbance): {sul}/10</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm">0</span>
                <Slider
                  value={[sul]}
                  onValueChange={([value]) => setSul(value)}
                  min={0}
                  max={10}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm">10</span>
              </div>
              <p className="text-xs text-muted-foreground">
                0 = No disturbance, 10 = Maximum disturbance
              </p>
            </div>

            {/* VOC Scale */}
            <div className="space-y-2">
              <Label>VOC (Validity of Cognition): {voc}/7</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm">1</span>
                <Slider
                  value={[voc]}
                  onValueChange={([value]) => setVoc(value)}
                  min={1}
                  max={7}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm">7</span>
              </div>
              <p className="text-xs text-muted-foreground">
                1 = Completely false, 7 = Completely true
              </p>
            </div>

            {/* Progress Indicators */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Initial SUD</p>
                    <p className="text-2xl font-bold">8/10</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Current SUD</p>
                    <p className="text-2xl font-bold">{sul}/10</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-notes">Session Notes</Label>
              <Textarea
                id="session-notes"
                placeholder="Record observations, client responses, and session progress..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={8}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <FileText className="w-4 h-4 mr-2" />
                Save as Draft
              </Button>
              <Button className="flex-1">
                Save Notes
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
