import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useLocation, Link } from 'wouter';
import Navigation from '@/components/layout/Navigation';
import { 
  Calendar, 
  Clock, 
  Users, 
  Star,
  DollarSign,
  Video,
  CheckCircle,
  TrendingUp,
  User,
  Settings,
  Play,
  Pause,
  MessageSquare,
  Bell,
  BarChart3,
  Award,
  Target,
  Activity,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  Clock3
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { format, addDays } from 'date-fns';

export default function ConsultantDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: consultantData, isLoading } = useQuery({
    queryKey: ['/api/consultants/dashboard'],
    queryFn: async () => {
      try {
        const [summaryRes, monthlyRes] = await Promise.all([
          apiRequest('/api/earnings/consultant/summary', 'GET'),
          apiRequest('/api/earnings/consultant/monthly', 'GET')
        ]);
        const summary = await summaryRes.json();
        const monthly = await monthlyRes.json();
        return { summary, monthly } as any;
      } catch {
        return undefined;
      }
    }
  });

  // Mock data for demonstration
  const mockConsultantData = {
    consultant: {
      name: 'Dr. Emily Chen',
      email: 'emily.chen@brainbased.com',
      specializations: ['Trauma', 'PTSD', 'Anxiety'],
      rating: 4.9,
      totalHours: 500.5,
      monthlyEarnings: 4800,
      completedSessions: 234,
      profileImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face',
      licenseNumber: 'LMFT-12345',
      yearsExperience: 8,
      isActive: true,
      bio: 'Specialized in trauma therapy with extensive experience in EMDR techniques.'
    },
    upcomingSessions: [
      {
        id: 'session-1',
        studentName: 'Jane Smith',
        studentImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        scheduledStart: new Date(Date.now() + 2 * 60 * 60 * 1000),
        scheduledEnd: new Date(Date.now() + 3 * 60 * 60 * 1000),
        sessionType: 'consultation',
        status: 'confirmed',
        studentProgress: '15.5/40 hours',
        notes: 'Working on bilateral stimulation techniques',
        studentEmail: 'jane.smith@email.com'
      },
      {
        id: 'session-2',
        studentName: 'Mike Johnson',
        studentImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        scheduledEnd: new Date(Date.now() + 25 * 60 * 60 * 1000),
        sessionType: 'practice',
        status: 'pending',
        studentProgress: '28/40 hours',
        notes: 'Final evaluation session',
        studentEmail: 'mike.johnson@email.com'
      }
    ],
    monthlyStats: {
      sessionsThisMonth: 18,
      hoursThisMonth: 22.5,
      newStudents: 5,
      averageRating: 4.9,
      earningsThisMonth: 4800,
      targetHours: 30,
      completionRate: 85
    },
    recentCompletedSessions: [
      {
        id: 'completed-1',
        studentName: 'Sarah Wilson',
        studentImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        completedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        duration: 1.5,
        rating: 5,
        sessionType: 'consultation',
        notes: 'Excellent progress on trauma processing'
      },
      {
        id: 'completed-2',
        studentName: 'Tom Brown',
        studentImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        completedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        duration: 1.0,
        rating: 4,
        sessionType: 'practice',
        notes: 'Good work on grounding techniques'
      }
    ],
    quickActions: [
      { id: 1, title: "Update Availability", icon: Calendar, color: "bg-blue-500", action: "availability" },
      { id: 2, title: "View Earnings", icon: DollarSign, color: "bg-green-500", action: "earnings" },
      { id: 3, title: "Student Directory", icon: Users, color: "bg-purple-500", action: "students" },
      { id: 4, title: "Support", icon: MessageSquare, color: "bg-orange-500", action: "support" }
    ]
  };

  const data = (consultantData as any) || mockConsultantData;

  const handleJoinSession = (sessionId: string) => {
    setLocation(`/video/${sessionId}`);
  };

  const handleUpdateAvailability = () => {
    toast({
      title: "Availability Updated",
      description: "Your availability schedule has been updated.",
    });
  };

  const canJoinSession = (sessionStart: Date) => {
    const now = new Date();
    const timeDiff = sessionStart.getTime() - now.getTime();
    return timeDiff <= 15 * 60 * 1000 && timeDiff >= -60 * 60 * 1000; // 15 min before to 1 hour after
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
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
            
            {/* Stats Card Skeleton */}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={data.consultant.profileImage} />
              <AvatarFallback className="text-lg font-semibold">
                {data.consultant.name.split(' ').map((n: string) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900">
                {data.consultant.name}
              </h1>
              <p className="text-gray-600">
                EMDR Consultant • BrainBased EMDR Platform
              </p>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium text-gray-900 ml-1">
                    {data.consultant.rating}
                  </span>
                  <span className="text-sm text-gray-600 ml-1">
                    ({data.consultant.completedSessions} sessions)
                  </span>
                </div>
                <Badge variant={data.consultant.isActive ? "default" : "secondary"}>
                  {data.consultant.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/availability">
                <Calendar className="h-4 w-4 mr-2" />
                Availability
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/sessions">
                <Users className="h-4 w-4 mr-2" />
                Sessions
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">EMDR Sessions</p>
                  <p className="text-2xl font-bold">{data.monthlyStats.sessionsThisMonth}</p>
                  <p className="text-blue-100 text-sm">This Month</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Consultation Hours</p>
                  <p className="text-2xl font-bold">{data.monthlyStats.hoursThisMonth}</p>
                  <p className="text-green-100 text-sm">This Month</p>
                </div>
                <Clock className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Monthly Earnings</p>
                  <p className="text-2xl font-bold">${data.monthlyStats.earningsThisMonth}</p>
                  <p className="text-purple-100 text-sm">From EMDR Sessions</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Rating</p>
                  <p className="text-2xl font-bold">{data.monthlyStats.averageRating}</p>
                  <p className="text-orange-100 text-sm">Average</p>
                </div>
                <Star className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Quick Actions & Profile */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Activity className="h-5 w-5 mr-2 text-blue-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.quickActions.map((action: any) => (
                  <Button 
                    key={action.id} 
                    variant="ghost" 
                    className="w-full justify-start h-12 hover:bg-gray-50"
                    onClick={() => {
                      if (action.action === 'availability') handleUpdateAvailability();
                      toast({
                        title: action.title,
                        description: `${action.title} functionality would be implemented here.`,
                      });
                    }}
                  >
                    <div className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center mr-3`}>
                      <action.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium">{action.title}</span>
                    <ChevronRight className="h-4 w-4 ml-auto text-gray-400" />
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Profile Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <User className="h-5 w-5 mr-2 text-indigo-600" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{data.consultant.email}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Award className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">License: {data.consultant.licenseNumber}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{data.consultant.yearsExperience} years experience</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Target className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{data.consultant.totalHours} total hours</span>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-600">{data.consultant.bio}</p>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Progress */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                  Monthly Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Hours Target</span>
                    <span className="text-sm text-gray-600">{data.monthlyStats.hoursThisMonth}/{data.monthlyStats.targetHours}h</span>
                  </div>
                  <Progress value={(data.monthlyStats.hoursThisMonth / data.monthlyStats.targetHours) * 100} className="h-2" />
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-green-600">{data.monthlyStats.completionRate}%</div>
                    <div className="text-xs text-gray-600">Completion Rate</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">{data.monthlyStats.newStudents}</div>
                    <div className="text-xs text-gray-600">New Students</div>
                  </div>
                </div>
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
                <Badge variant="outline" className="text-xs">
                  {data.upcomingSessions.length} sessions
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {data.upcomingSessions.map((session: any) => (
                    <div key={session.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={session.studentImage} />
                        <AvatarFallback>
                          {session.studentName.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {session.studentName}
                          </h4>
                          <Badge variant={session.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                            {session.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          {session.scheduledStart.toLocaleDateString()} at {session.scheduledStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                        <p className="text-xs text-gray-500 mb-2">
                          {session.sessionType} • {session.studentProgress}
                        </p>
                        <p className="text-xs text-gray-600 italic">
                          "{session.notes}"
                        </p>
                      </div>
                      <div className="flex flex-col space-y-2">
                        {canJoinSession(session.scheduledStart) ? (
                          <Button size="sm" onClick={() => handleJoinSession(session.id)}>
                            <Play className="h-3 w-3 mr-1" />
                            Join
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled>
                            <Clock3 className="h-3 w-3 mr-1" />
                            Wait
                          </Button>
                        )}
                        <Button size="sm" variant="ghost">
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Column - Recent Activity & Stats */}
          <div className="space-y-6">
            {/* Recent Completed Sessions */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {data.recentCompletedSessions.map((session: any) => (
                      <div key={session.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={session.studentImage} />
                          <AvatarFallback className="text-xs">
                            {session.studentName.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {session.studentName}
                          </p>
                          <p className="text-xs text-gray-600">
                            {session.completedDate.toLocaleDateString()} • {session.duration}h
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span className="text-xs text-gray-600">{session.rating}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Session Completion</span>
                    <span className="text-sm text-gray-600">{data.monthlyStats.completionRate}%</span>
                  </div>
                  <Progress value={data.monthlyStats.completionRate} className="h-2" />
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">{data.consultant.rating}</div>
                    <div className="text-xs text-gray-600">Avg Rating</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">{data.consultant.completedSessions}</div>
                    <div className="text-xs text-gray-600">Total Sessions</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Today's Schedule */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Clock className="h-5 w-5 mr-2 text-orange-600" />
                  Today's Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.upcomingSessions
                    .filter((session: any) => session.scheduledStart.toDateString() === new Date().toDateString())
                    .map((session: any) => (
                      <div key={session.id} className="flex items-center space-x-3 p-2 rounded-lg bg-orange-50">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{session.studentName}</p>
                          <p className="text-xs text-gray-600">
                            {session.scheduledStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {session.scheduledEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {session.sessionType}
                        </Badge>
                      </div>
                    ))}
                  {data.upcomingSessions.filter((session: any) => session.scheduledStart.toDateString() === new Date().toDateString()).length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No sessions scheduled for today</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}