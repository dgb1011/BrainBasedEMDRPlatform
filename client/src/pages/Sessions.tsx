import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Video, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  Download,
  Edit,
  CheckCircle,
  AlertCircle,
  Star
} from 'lucide-react';
import SessionCard from '@/components/SessionCard';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

export default function Sessions() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [logDialogOpen, setLogDialogOpen] = useState<string | null>(null);
  const [evalDialogOpen, setEvalDialogOpen] = useState<string | null>(null);
  const [reflectionText, setReflectionText] = useState('');
  const [evaluationScore, setEvaluationScore] = useState<string>('5');

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['/api/students/sessions'],
    queryFn: async () => {
      const res = await apiRequest('/api/students/sessions', 'GET');
      return await res.json();
    }
  });

  const rescheduleSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/sessions/${sessionId}/reschedule`, 'PUT');
    },
    onSuccess: () => {
      toast({
        title: "Reschedule Request Sent",
        description: "Your reschedule request has been sent to the consultant.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/students/sessions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Reschedule Failed",
        description: error.message || "Failed to reschedule session.",
        variant: "destructive",
      });
    },
  });

  const handleJoinSession = (sessionId: string) => {
    setLocation(`/video/${sessionId}`);
  };

  const handleRescheduleSession = (sessionId: string) => {
    rescheduleSessionMutation.mutate(sessionId);
  };

  const submitLogMutation = useMutation({
    mutationFn: async ({ sessionId, notes, rating }: { sessionId: string; notes: string; rating?: number }) => {
      return await apiRequest(`/api/sessions/${sessionId}/log`, 'POST', {
        notes,
        rating,
        duration: 1 // Default 1 hour
      });
    },
    onSuccess: () => {
      toast({
        title: "Log Submitted",
        description: "Your consultation log has been submitted successfully.",
      });
      setLogDialogOpen(null);
      setReflectionText('');
      queryClient.invalidateQueries({ queryKey: ['/api/students/sessions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit log",
        description: error.message || "Failed to submit consultation log.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitLog = () => {
    if (logDialogOpen && reflectionText.trim()) {
      submitLogMutation.mutate({
        sessionId: logDialogOpen,
        notes: reflectionText,
        rating: parseInt(evaluationScore)
      });
    }
  };

  // Mock data for demonstration
  const mockSessions = {
    upcoming: [
      {
        id: 'session-1',
        consultantName: 'Dr. Emily Chen',
        scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        scheduledEnd: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        status: 'scheduled',
        sessionType: 'consultation'
      },
      {
        id: 'session-2',
        consultantName: 'Dr. Michael Torres',
        scheduledStart: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        scheduledEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        status: 'scheduled',
        sessionType: 'practice'
      }
    ],
    completed: [
      {
        id: 'session-3',
        consultantName: 'Dr. Emily Chen',
        scheduledStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        scheduledEnd: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        status: 'completed',
        sessionType: 'consultation',
        recordingUrl: 'https://example.com/recording1.mp4',
        feedback: 'Excellent progress on bilateral stimulation techniques.'
      }
    ],
    cancelled: []
  };

  const sessions = sessionsData || mockSessions;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const SessionsList = ({ sessions, showActions = false }: { sessions: any[]; showActions?: boolean }) => (
    <div className="space-y-4">
      {sessions.length > 0 ? (
        sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onJoin={handleJoinSession}
            onReschedule={handleRescheduleSession}
          />
        ))
      ) : (
        <Card className="text-center py-8">
          <CardContent>
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'upcoming' ? 'You have no upcoming sessions scheduled.' : 
               activeTab === 'completed' ? 'You have no completed sessions yet.' : 
               'You have no cancelled sessions.'}
            </p>
            {activeTab === 'upcoming' && (
              <Button onClick={() => setLocation('/schedule')}>
                Schedule Session
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Sessions</h1>
        <p className="text-gray-600">Manage your EMDR consultation sessions and track your progress.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming" className="mt-6">
               <SessionsList sessions={(sessions as any).upcoming || []} showActions={true} />
            </TabsContent>
            
            <TabsContent value="completed" className="mt-6">
              <div className="space-y-4">
                {((sessions as any).completed || []).map((session: any) => (
                  <Card key={session.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-green-100 text-green-800">COMPLETED</Badge>
                            {session.sessionType && (
                              <Badge variant="outline">{session.sessionType.toUpperCase()}</Badge>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <User className="h-4 w-4 mr-2" />
                               <span className="font-medium">{session.consultantName}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="h-4 w-4 mr-2" />
                              <span>{format(new Date(session.scheduledStart), 'EEEE, MMMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>
                                {format(new Date(session.scheduledStart), 'h:mm a')} - {format(new Date(session.scheduledEnd), 'h:mm a')}
                              </span>
                            </div>
                             {session.feedback && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center mb-1">
                                  <FileText className="h-4 w-4 mr-2 text-gray-500" />
                                  <span className="text-sm font-medium text-gray-700">Consultant Feedback</span>
                                </div>
                                <p className="text-sm text-gray-600">{session.feedback}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          {session.recordingUrl && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(session.recordingUrl, '_blank')}
                            >
                              <Video className="h-4 w-4 mr-2" />
                              Recording
                            </Button>
                          )}
                           <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toast({ title: "Certificate", description: "Certificate download coming soon!" })}
                           >
                            <Download className="h-4 w-4 mr-2" />
                            Certificate
                          </Button>
                           {typeof session.studentEvaluationScore === 'number' && (
                             <div className="text-xs text-gray-600 flex items-center justify-end">
                               <Star className="h-3 w-3 mr-1 text-yellow-500" /> {session.studentEvaluationScore}/5
                             </div>
                           )}
                           <Dialog open={logDialogOpen === session.id} onOpenChange={(open)=>{ setLogDialogOpen(open ? session.id : null); if(!open) setReflectionText(''); }}>
                             <DialogTrigger asChild>
                               <Button variant="outline" size="sm">
                                 <FileText className="h-4 w-4 mr-2" />
                                 Submit Log
                               </Button>
                             </DialogTrigger>
                             <DialogContent>
                               <DialogHeader>
                                 <DialogTitle>Submit Consultation Log</DialogTitle>
                               </DialogHeader>
                               <div className="space-y-3">
                                 <Textarea value={reflectionText} onChange={(e)=>setReflectionText(e.target.value)} placeholder="Write your reflection..." rows={6} />
                               </div>
                               <DialogFooter>
                                 <Button variant="outline" onClick={()=>{ setLogDialogOpen(null); setReflectionText(''); }}>Cancel</Button>
                                 <Button onClick={async ()=>{
                                   if(!reflectionText.trim()) { toast({ title:'Please enter a reflection', variant:'destructive' }); return; }
                                   try {
                                     await apiRequest(`/api/sessions/${session.id}/log`, 'POST', { 
                                       notes: reflectionText.trim(),
                                       rating: parseInt(evaluationScore),
                                       duration: 1 
                                     });
                                     toast({ title:'Log submitted' });
                                     setLogDialogOpen(null);
                                     setReflectionText('');
                                     queryClient.invalidateQueries({ queryKey: ['/api/students/sessions'] });
                                   } catch(e:any){
                                     toast({ title:'Failed to submit log', description:e.message, variant:'destructive' });
                                   }
                                 }}>Submit</Button>
                               </DialogFooter>
                             </DialogContent>
                           </Dialog>
                           <Dialog open={evalDialogOpen === session.id} onOpenChange={(open)=>{ setEvalDialogOpen(open ? session.id : null); if(!open) setEvaluationScore('5'); }}>
                             <DialogTrigger asChild>
                               <Button variant="outline" size="sm">
                                 <Edit className="h-4 w-4 mr-2" />
                                 Evaluate
                               </Button>
                             </DialogTrigger>
                             <DialogContent>
                               <DialogHeader>
                                 <DialogTitle>Rate This Session</DialogTitle>
                               </DialogHeader>
                               <RadioGroup value={evaluationScore} onValueChange={setEvaluationScore} className="grid grid-cols-5 gap-3">
                                 {["1","2","3","4","5"].map(val => (
                                   <div key={val} className="flex items-center space-x-2">
                                     <RadioGroupItem value={val} id={`score-${val}`} />
                                     <Label htmlFor={`score-${val}`}>{val}</Label>
                                   </div>
                                 ))}
                               </RadioGroup>
                               <DialogFooter>
                                 <Button variant="outline" onClick={()=>{ setEvalDialogOpen(null); setEvaluationScore('5'); }}>Cancel</Button>
                                 <Button onClick={async ()=>{
                                   const score = Number(evaluationScore);
                                   try {
                                     await apiRequest(`/api/sessions/${session.id}/evaluation`, 'POST', { score });
                                     toast({ title:'Evaluation submitted' });
                                     setEvalDialogOpen(null);
                                     setEvaluationScore('5');
                                     queryClient.invalidateQueries({ queryKey: ['/api/students/sessions'] });
                                   } catch(e:any){
                                     toast({ title:'Failed to submit evaluation', description:e.message, variant:'destructive' });
                                   }
                                 }}>Submit</Button>
                               </DialogFooter>
                             </DialogContent>
                           </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {((sessions as any).completed || []).length === 0 && (
                  <SessionsList sessions={[]} />
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="cancelled" className="mt-6">
              <SessionsList sessions={(sessions as any).cancelled || []} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Sessions</span>
                <span className="font-semibold">{((sessions as any).upcoming || []).length + ((sessions as any).completed || []).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="font-semibold text-green-600">{((sessions as any).completed || []).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Upcoming</span>
                <span className="font-semibold text-blue-600">{((sessions as any).upcoming || []).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Hours Completed</span>
                <span className="font-semibold">15.5/40</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start"
                onClick={() => setLocation('/schedule')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule New Session
              </Button>
              <Button 
                className="w-full justify-start"
                variant="outline"
                onClick={() => setLocation('/progress')}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                View Progress
              </Button>
            </CardContent>
          </Card>

          {/* Session Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Before Session:</span>
                <p className="text-gray-600 mt-1">Test your camera and microphone 15 minutes early.</p>
              </div>
              <div>
                <span className="font-medium">During Session:</span>
                <p className="text-gray-600 mt-1">Maintain professional conduct and active participation.</p>
              </div>
              <div>
                <span className="font-medium">After Session:</span>
                <p className="text-gray-600 mt-1">Complete reflection form and review recordings.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>


    </div>
  );
}