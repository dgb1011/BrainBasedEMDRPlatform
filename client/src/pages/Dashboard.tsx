import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
function VerifyCertificateWidget() {
  return null;
}

function MyCertificateWidget() {
  const [status, setStatus] = useState<any>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest('/api/me/certificate', 'GET');
        const json = await res.json();
        setStatus(json);
      } catch {}
    })();
  }, []);
  const download = async () => {
    if (!status?.verificationCode) return;
    const res = await fetch(`/api/certificates/${status.verificationCode}/download`);
    const json = await res.json();
    if (json?.url) setDownloadUrl(json.url), (window.location.href = json.url);
  };
  return (
    <div className="p-4 border rounded-lg">
      <div className="font-semibold mb-2">My Certificate</div>
      {status?.status === 'completed' ? (
        <div className="space-y-2 text-sm">
          <div>Certificate Number: {status.certificateNumber}</div>
          <div>Issued: {new Date(status.issuedDate).toLocaleDateString?.() || String(status.issuedDate)}</div>
          <div>
            Verify: <a className="text-blue-600 underline" href={`/verify/${status.verificationCode}`}>/verify/{status.verificationCode}</a>
          </div>
          <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={download}>Download</button>
        </div>
      ) : (
        <div className="text-sm text-gray-600">Not issued yet. Keep completing hours.</div>
      )}
    </div>
  );
}
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import Navigation from '@/components/layout/Navigation';
import { 
  Calendar, 
  TrendingUp, 
  Video, 
  Clock, 
  GraduationCap, 
  Users, 
  Activity, 
  Award,
  AlertCircle,
  CheckCircle,
  User,
  Play,
  Pause,
  BookOpen,
  Target,
  Star,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Bell,
  Settings,
  BarChart3,
  FileText,
  MessageSquare
} from 'lucide-react';
import { isUnauthorizedError } from '@/lib/authUtils';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { toast } = useToast();
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>();

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['/api/students/dashboard'],
    retry: false,
  });

  const { data: upcomingData } = useQuery({
    queryKey: ['/api/sessions/upcoming'],
    queryFn: async () => {
      const res = await apiRequest('/api/sessions/upcoming', 'GET');
      const json = await res.json();
      return json?.sessions || [];
    },
    staleTime: 60_000,
  });

  const { data: adminData } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    retry: false,
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [error, toast]);

  const handleJoinSession = (sessionId: string) => {
    window.location.href = `/video/${sessionId}`;
  };

  const handleRescheduleSession = (sessionId: string) => {
    toast({
      title: "Reschedule Session",
      description: "Reschedule functionality would be implemented here.",
    });
  };

  const handleSlotSelect = (date: Date, slot: { time: string; consultant: string; consultantId: string }) => {
    toast({
      title: "Booking Session",
      description: `Booking ${slot.time} with ${slot.consultant} on ${date.toDateString()}`,
    });
  };

  // Mock data for demonstration
  const mockDashboardData = {
    student: {
      name: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      progress: 67.5, // 27/40 hours
      hoursCompleted: 27,
      totalHours: 40,
      certificationStatus: "in_progress",
      nextMilestone: "30 hours",
      currentConsultant: "Dr. Emily Chen",
      profileImage: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
    },
    upcomingSessions: [
      {
        id: 'session-1',
        consultantName: 'Dr. Emily Chen',
        consultantImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face',
        scheduledStart: new Date(Date.now() + 2 * 60 * 60 * 1000),
        scheduledEnd: new Date(Date.now() + 3 * 60 * 60 * 1000),
        sessionType: 'consultation',
        status: 'confirmed',
        notes: 'Working on bilateral stimulation techniques'
      },
      {
        id: 'session-2',
        consultantName: 'Dr. Michael Torres',
        consultantImage: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face',
        scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        scheduledEnd: new Date(Date.now() + 25 * 60 * 60 * 1000),
        sessionType: 'practice',
        status: 'pending',
        notes: 'Final evaluation session'
      }
    ],
    recentSessions: [
      {
        id: 'completed-1',
        consultantName: 'Dr. Emily Chen',
        completedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        duration: 1.5,
        rating: 5,
        sessionType: 'consultation',
        notes: 'Excellent progress on trauma processing'
      }
    ],
    milestones: [
      { id: 1, title: "10 Hours Completed", achieved: true, date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      { id: 2, title: "20 Hours Completed", achieved: true, date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
      { id: 3, title: "30 Hours Completed", achieved: false, targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      { id: 4, title: "40 Hours Completed", achieved: false, targetDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) }
    ],
    quickActions: [
      { id: 1, title: "Book Session", icon: Calendar, color: "bg-blue-500", href: "/schedule" },
      { id: 2, title: "View Progress", icon: BarChart3, color: "bg-green-500", href: "/progress" },
      { id: 3, title: "My Sessions", icon: FileText, color: "bg-purple-500", href: "/sessions" },
      { id: 4, title: "Verify Certificate", icon: Award, color: "bg-orange-500", href: "/verify" }
    ]
  };

  const normalizeUpcoming = (sessions: any[]) => {
    return (sessions || []).map((s: any) => ({
      id: s.id,
      consultantName: s.consultant ? `${s.consultant.user.first_name} ${s.consultant.user.last_name}` : (s.consultantName || 'Consultant'),
      consultantImage: s.consultantImage || undefined,
      scheduledStart: s.scheduled_start ? new Date(s.scheduled_start) : (s.scheduledStart ? new Date(s.scheduledStart) : new Date()),
      scheduledEnd: s.scheduled_end ? new Date(s.scheduled_end) : (s.scheduledEnd ? new Date(s.scheduledEnd) : new Date()),
      sessionType: s.session_type || s.sessionType || 'consultation',
      status: s.status || 'pending',
      notes: s.notes || '',
    }));
  };

  const data = (() => {
    if (!dashboardData) return mockDashboardData;
    const upcoming = normalizeUpcoming(upcomingData || []);
    return {
      ...mockDashboardData,
      ...dashboardData,
      upcomingSessions: upcoming.length ? upcoming : mockDashboardData.upcomingSessions,
    };
  })();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
            
            {/* Progress Card Skeleton */}
            <Skeleton className="h-32 w-full rounded-xl" />
            
            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Skeleton className="h-96 rounded-xl" />
              <Skeleton className="h-96 rounded-xl" />
              <Skeleton className="h-96 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
            <p className="text-muted-foreground">Unable to load dashboard data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {data.student.name}! 👋
            </h1>
            <p className="text-gray-600">
              Track your progress toward your BrainBased EMDR certification
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/progress">
                <Target className="h-4 w-4 mr-2" />
                View Progress
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/sessions">
                <Calendar className="h-4 w-4 mr-2" />
                My Sessions
              </Link>
            </Button>
          </div>
        </div>

        {/* Progress Overview Card */}
        <Card className="mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <GraduationCap className="h-8 w-8" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-semibold">EMDR Certification Progress</h2>
                  <p className="text-blue-100">
                    {data.student.hoursCompleted} of 40 consultation hours completed
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{data.student.progress}%</div>
                <div className="text-blue-100">Complete</div>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress to next milestone</span>
                <span className="text-sm text-blue-100">{data.student.nextMilestone}</span>
              </div>
              <Progress value={data.student.progress} className="h-3 bg-white/20" />
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Certificate, Quick Actions & Milestones */}
          <div className="space-y-6">
            {/* My Certificate */}
            <MyCertificateWidget />

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Activity className="h-5 w-5 mr-2 text-blue-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.quickActions.map((action) => (
                  <Link key={action.id} href={action.href}>
                    <Button variant="ghost" className="w-full justify-start h-12 hover:bg-gray-50">
                      <div className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center mr-3`}>
                        <action.icon className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium">{action.title}</span>
                      <ChevronRight className="h-4 w-4 ml-auto text-gray-400" />
                    </Button>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Milestones */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Award className="h-5 w-5 mr-2 text-green-600" />
                  Milestones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      milestone.achieved ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {milestone.achieved ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Target className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        milestone.achieved ? 'text-gray-900' : 'text-gray-600'
                      }`}>
                        {milestone.title}
                      </p>
                      {milestone.achieved && milestone.date && (
                        <p className="text-xs text-gray-500">
                          Completed {milestone.date.toLocaleDateString()}
                        </p>
                      )}
                      {!milestone.achieved && milestone.targetDate && (
                        <p className="text-xs text-gray-500">
                          Target: {milestone.targetDate.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Upcoming Sessions */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-lg font-semibold">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                  Upcoming Sessions
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Book New
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <div className="space-y-4">
                  {data.upcomingSessions.map((session) => (
                    <div key={session.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={session.consultantImage} />
                        <AvatarFallback>
                          {session.consultantName.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {session.consultantName}
                          </h4>
                          <Badge variant={session.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                            {session.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {session.scheduledStart.toLocaleDateString()} at {session.scheduledStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {session.sessionType} • {session.notes}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => handleJoinSession(session.id)}>
                        <Play className="h-3 w-3 mr-1" />
                        Join
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Column - Recent Activity & Stats */}
          <div className="space-y-6">
            {/* Current Consultant */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <User className="h-5 w-5 mr-2 text-indigo-600" />
                  Your Consultant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face" />
                    <AvatarFallback>EC</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{data.student.currentConsultant}</h4>
                    <p className="text-sm text-gray-600">EMDR Specialist</p>
                    <div className="flex items-center mt-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span className="text-xs text-gray-600 ml-1">4.9 (127 reviews)</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Message
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Clock className="h-5 w-5 mr-2 text-orange-600" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.recentSessions.map((session) => (
                    <div key={session.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {session.consultantName}
                        </p>
                        <p className="text-xs text-gray-600">
                          {session.completedDate.toLocaleDateString()} • {session.duration}h
                        </p>
                      </div>
                      <div className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-600 ml-1">{session.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Stats Overview */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                  This Week
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">3</div>
                    <div className="text-xs text-gray-600">Sessions</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">4.5h</div>
                    <div className="text-xs text-gray-600">Hours</div>
                  </div>
                </div>
                <Separator />
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">Next Session</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Tomorrow at 2:00 PM with Dr. Chen
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}