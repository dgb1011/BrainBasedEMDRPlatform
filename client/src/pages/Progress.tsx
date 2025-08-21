import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress as ProgressBar } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import Navigation from '@/components/layout/Navigation';
import { 
  TrendingUp, 
  Clock, 
  Award,
  Target,
  Star,
  Calendar,
  CheckCircle,
  Play,
  Pause,
  BookOpen,
  Users,
  BarChart3,
  Trophy,
  Zap,
  ChevronRight,
  Download,
  Share2,
  MessageSquare,
  FileText,
  Video,
  Activity,
  GraduationCap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function Progress() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: progressData, isLoading } = useQuery({
    queryKey: ['/api/students/progress'],
  });

  const { data: eligibility } = useQuery({
    queryKey: ['/api/students/certificates/eligibility'],
    queryFn: async () => {
      try {
        const res = await apiRequest('/api/students/certificates/eligibility', 'GET');
        return await res.json();
      } catch {
        return undefined as any;
      }
    }
  });

  const { data: latestCert } = useQuery({
    queryKey: ['/api/students/certificates/latest'],
    queryFn: async () => {
      try {
        const res = await apiRequest('/api/students/certificates/latest', 'GET');
        return await res.json();
      } catch {
        return undefined as any;
      }
    }
  });

  // Mock data for demonstration
  const mockProgressData = {
    student: {
      name: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      progress: 67.5, // 27/40 hours
      hoursCompleted: 27,
      totalHours: 40,
      certificationStatus: "in_progress",
      currentConsultant: "Dr. Emily Chen",
      consultantImage: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face",
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      profileImage: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
    },
    milestones: [
      { 
        id: 1, 
        title: "10 Hours Completed", 
        achieved: true, 
        date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        description: "Completed first 10 hours of consultation",
        icon: CheckCircle,
        color: "text-green-600"
      },
      { 
        id: 2, 
        title: "20 Hours Completed", 
        achieved: true, 
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        description: "Reached the halfway point",
        icon: CheckCircle,
        color: "text-green-600"
      },
      { 
        id: 3, 
        title: "30 Hours Completed", 
        achieved: false, 
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        description: "Almost there! Just 3 more hours needed",
        icon: Target,
        color: "text-blue-600",
        progress: 90
      },
      { 
        id: 4, 
        title: "40 Hours Completed", 
        achieved: false, 
        targetDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        description: "Final milestone - certification ready",
        icon: Trophy,
        color: "text-purple-600",
        progress: 67.5
      }
    ],
    recentSessions: [
      {
        id: 'session-1',
        consultantName: 'Dr. Emily Chen',
        consultantImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face',
        completedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        duration: 1.5,
        rating: 5,
        sessionType: 'consultation',
        notes: 'Excellent progress on trauma processing. Student showed great improvement in bilateral stimulation techniques.',
        hoursEarned: 1.5
      },
      {
        id: 'session-2',
        consultantName: 'Dr. Michael Torres',
        consultantImage: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face',
        completedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        duration: 1.0,
        rating: 4,
        sessionType: 'practice',
        notes: 'Good work on grounding techniques. Need more practice with complex trauma cases.',
        hoursEarned: 1.0
      },
      {
        id: 'session-3',
        consultantName: 'Dr. Emily Chen',
        consultantImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face',
        completedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        duration: 2.0,
        rating: 5,
        sessionType: 'consultation',
        notes: 'Outstanding session! Student demonstrated mastery of EMDR protocols.',
        hoursEarned: 2.0
      }
    ],
    statistics: {
      averageRating: 4.8,
      totalSessions: 18,
      averageSessionLength: 1.4,
      completionRate: 94,
      daysRemaining: 30,
      weeklyProgress: 2.5,
      monthlyProgress: 8.0
    },
    achievements: [
      {
        id: 1,
        title: "First Session",
        description: "Completed your first EMDR consultation session",
        icon: Play,
        achieved: true,
        date: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000)
      },
      {
        id: 2,
        title: "Consistent Learner",
        description: "Completed 5 sessions in a row",
        icon: Activity,
        achieved: true,
        date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
      },
      {
        id: 3,
        title: "Halfway There",
        description: "Reached 20 hours of consultation",
        icon: Target,
        achieved: true,
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
      },
      {
        id: 4,
        title: "Excellence",
        description: "Maintained 4.5+ rating for 10 sessions",
        icon: Star,
        achieved: false,
        progress: 80
      }
    ]
  };

  const data = progressData || mockProgressData;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">
              Your Progress Journey
            </h1>
            <p className="text-gray-600">
              Track your EMDR certification progress and achievements
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {latestCert?.success && latestCert.certificate?.certificate_url ? (
              <Button variant="outline" size="sm" onClick={() => window.open(latestCert.certificate.certificate_url, '_blank')}>
                <Download className="h-4 w-4 mr-2" />
                Download Certificate
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <Award className="h-4 w-4 mr-2" />
                {eligibility?.eligible ? 'Eligible — issuing soon' : 'Certificate Pending'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => window.open('/api/students/progress.pdf', '_blank')}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Progress Overview Card */}
        <Card className="mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-xl">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                    <GraduationCap className="h-10 w-10" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Certification Progress</h2>
                  <p className="text-blue-100">
                    {data.student.hoursCompleted} of {data.student.totalHours} hours completed
                  </p>
                  <p className="text-blue-100 text-sm">
                    Started {data.student.startDate.toLocaleDateString()} • Estimated completion {data.student.estimatedCompletion.toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{data.student.progress}%</div>
                <div className="text-blue-100">Complete</div>
                <div className="text-blue-100 text-sm mt-1">
                  {data.statistics.daysRemaining} days remaining
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progress to next milestone</span>
                <span className="text-sm text-blue-100">30 hours (3 more needed)</span>
              </div>
              <ProgressBar value={data.student.progress} className="h-3 bg-white/20" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-100">Weekly progress: {data.statistics.weeklyProgress}h</span>
                <span className="text-blue-100">Monthly progress: {data.statistics.monthlyProgress}h</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Statistics */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg font-semibold">
                    <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                    Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{data.statistics.totalSessions}</div>
                      <div className="text-xs text-gray-600">Total Sessions</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">{data.statistics.averageRating}</div>
                      <div className="text-xs text-gray-600">Avg Rating</div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Completion Rate</span>
                      <span className="text-sm text-gray-600">{data.statistics.completionRate}%</span>
                    </div>
                    <ProgressBar value={data.statistics.completionRate} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Avg Session Length</span>
                    <span className="font-medium">{data.statistics.averageSessionLength}h</span>
                  </div>
                </CardContent>
              </Card>

              {/* Current Consultant */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg font-semibold">
                    <Users className="h-5 w-5 mr-2 text-purple-600" />
                    Your Consultant
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-3 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={data.student.consultantImage} />
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
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full">
                      <MessageSquare className="h-3 w-3 mr-2" />
                      Send Message
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      <Calendar className="h-3 w-3 mr-2" />
                      Schedule Session
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Next Steps */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg font-semibold">
                    <Target className="h-5 w-5 mr-2 text-green-600" />
                    Next Steps
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {data.milestones
                      .filter(milestone => !milestone.achieved)
                      .slice(0, 2)
                      .map((milestone) => (
                        <div key={milestone.id} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <milestone.icon className={`h-4 w-4 ${milestone.color}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{milestone.title}</p>
                            <p className="text-xs text-gray-600">{milestone.description}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                  <Separator />
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">Ready for your next session?</p>
                    <Button className="w-full">
                      <Calendar className="h-4 w-4 mr-2" />
                      Book Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="milestones" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Award className="h-5 w-5 mr-2 text-yellow-600" />
                  Certification Milestones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {data.milestones.map((milestone, index) => (
                    <div key={milestone.id} className="relative">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          milestone.achieved ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          <milestone.icon className={`h-6 w-6 ${milestone.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`text-lg font-semibold ${
                              milestone.achieved ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {milestone.title}
                            </h4>
                            <Badge variant={milestone.achieved ? "default" : "secondary"}>
                              {milestone.achieved ? "Completed" : "In Progress"}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-2">{milestone.description}</p>
                          {milestone.achieved && milestone.date && (
                            <p className="text-sm text-gray-500">
                              Completed {milestone.date.toLocaleDateString()}
                            </p>
                          )}
                          {!milestone.achieved && milestone.targetDate && (
                            <p className="text-sm text-gray-500">
                              Target: {milestone.targetDate.toLocaleDateString()}
                            </p>
                          )}
                          {!milestone.achieved && milestone.progress && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-gray-600">Progress</span>
                                <span className="text-gray-600">{milestone.progress}%</span>
                              </div>
                              <ProgressBar value={milestone.progress} className="h-2" />
                            </div>
                          )}
                        </div>
                      </div>
                      {index < data.milestones.length - 1 && (
                        <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200"></div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Video className="h-5 w-5 mr-2 text-purple-600" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {data.recentSessions.map((session) => (
                      <div key={session.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={session.consultantImage} />
                          <AvatarFallback>
                            {session.consultantName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-semibold text-gray-900">
                              {session.consultantName}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {session.sessionType}
                              </Badge>
                              <div className="flex items-center">
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <span className="text-xs text-gray-600 ml-1">{session.rating}</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">
                            {session.completedDate.toLocaleDateString()} • {session.duration}h • {session.hoursEarned}h earned
                          </p>
                          <p className="text-xs text-gray-600 italic">
                            "{session.notes}"
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.achievements.map((achievement) => (
                    <div key={achievement.id} className={`p-4 rounded-lg border ${
                      achievement.achieved 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          achievement.achieved ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <achievement.icon className={`h-5 w-5 ${
                            achievement.achieved ? 'text-green-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-semibold ${
                            achievement.achieved ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {achievement.title}
                          </h4>
                          <p className={`text-sm ${
                            achievement.achieved ? 'text-gray-600' : 'text-gray-500'
                          }`}>
                            {achievement.description}
                          </p>
                          {achievement.achieved && achievement.date && (
                            <p className="text-xs text-gray-500 mt-1">
                              Earned {achievement.date.toLocaleDateString()}
                            </p>
                          )}
                          {!achievement.achieved && achievement.progress && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-gray-500">Progress</span>
                                <span className="text-gray-500">{achievement.progress}%</span>
                              </div>
                              <ProgressBar value={achievement.progress} className="h-1" />
                            </div>
                          )}
                        </div>
                        {achievement.achieved && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}