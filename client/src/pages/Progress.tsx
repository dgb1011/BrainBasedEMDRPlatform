import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress as ProgressBar } from '@/components/ui/progress';
import { useLocation } from 'wouter';
import { 
  Award, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  Calendar,
  Target,
  BookOpen,
  Trophy
} from 'lucide-react';
import ProgressCircle from '@/components/ProgressCircle';
import { format } from 'date-fns';

export default function Progress() {
  const [, setLocation] = useLocation();

  const { data: progressData, isLoading } = useQuery({
    queryKey: ['/api/students/progress'],
  });

  // Mock data for demonstration
  const mockProgressData = {
    totalHours: 15.5,
    totalRequired: 40,
    completionPercentage: 38.75,
    remainingHours: 24.5,
    sessionsCompleted: 8,
    monthlyProgress: [
      { month: 'Jan', hours: 3.5 },
      { month: 'Feb', hours: 4.0 },
      { month: 'Mar', hours: 6.0 },
      { month: 'Apr', hours: 2.0 },
    ],
    milestones: [
      { title: 'First Consultation', completed: true, date: '2024-01-15', hours: 1.0 },
      { title: '10 Hours Completed', completed: true, date: '2024-03-10', hours: 10.0 },
      { title: '20 Hours Completed', completed: false, date: null, hours: 20.0 },
      { title: '30 Hours Completed', completed: false, date: null, hours: 30.0 },
      { title: 'Final Assessment', completed: false, date: null, hours: 40.0 },
    ],
    recentSessions: [
      { date: '2024-04-10', consultant: 'Dr. Emily Chen', duration: 1.0, type: 'consultation' },
      { date: '2024-04-05', consultant: 'Dr. Michael Torres', duration: 1.0, type: 'practice' },
      { date: '2024-03-28', consultant: 'Dr. Emily Chen', duration: 1.5, type: 'consultation' },
    ]
  };

  const data = progressData || mockProgressData;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return '#10B981'; // Green
    if (percentage >= 50) return '#F59E0B'; // Orange
    if (percentage >= 25) return '#3B82F6'; // Blue
    return '#6B7280'; // Gray
  };

  const nextMilestone = data.milestones.find(m => !m.completed);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Certification Progress</h1>
        <p className="text-gray-600">Track your journey toward EMDR certification completion.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hours Completed</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalHours}</p>
                <p className="text-xs text-gray-500">of {data.totalRequired} required</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sessions Completed</p>
                <p className="text-2xl font-bold text-gray-900">{data.sessionsCompleted}</p>
                <p className="text-xs text-gray-500">consultation sessions</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Remaining Hours</p>
                <p className="text-2xl font-bold text-gray-900">{data.remainingHours}</p>
                <p className="text-xs text-gray-500">to complete certification</p>
              </div>
              <div className="bg-orange-100 rounded-full p-3">
                <Target className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(data.completionPercentage)}%</p>
                <p className="text-xs text-gray-500">certification progress</p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progress Visualization */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overall Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
                Overall Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center mb-6">
                <ProgressCircle 
                  percentage={data.completionPercentage}
                  size={120}
                  strokeWidth={12}
                  color={getProgressColor(data.completionPercentage)}
                />
              </div>
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">{data.totalHours} / {data.totalRequired} Hours</h3>
                <p className="text-gray-600">
                  {data.remainingHours} hours remaining to complete certification
                </p>
              </div>
              <ProgressBar value={data.completionPercentage} className="mb-4" />
              {nextMilestone && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Next Milestone</p>
                  <p className="text-sm text-blue-700">{nextMilestone.title} at {nextMilestone.hours} hours</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentSessions.map((session, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 rounded-full p-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{format(new Date(session.date), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-gray-500">{session.consultant}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {session.type.toUpperCase()}
                      </Badge>
                      <p className="text-sm font-medium">{session.duration}h</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Milestones Sidebar */}
        <div className="space-y-6">
          {/* Milestones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2 text-purple-600" />
                Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.milestones.map((milestone, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="mt-1">
                      {milestone.completed ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${milestone.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                        {milestone.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {milestone.completed ? `Completed ${milestone.date}` : `Target: ${milestone.hours} hours`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start"
                onClick={() => setLocation('/schedule')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Session
              </Button>
              <Button 
                className="w-full justify-start"
                variant="outline"
                onClick={() => setLocation('/sessions')}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                View Sessions
              </Button>
            </CardContent>
          </Card>

          {/* Certification Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Certification Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Total Hours:</span>
                <span className="ml-2 text-gray-600">40 hours consultation</span>
              </div>
              <div>
                <span className="font-medium">Minimum Sessions:</span>
                <span className="ml-2 text-gray-600">20 individual sessions</span>
              </div>
              <div>
                <span className="font-medium">Assessment:</span>
                <span className="ml-2 text-gray-600">Final evaluation required</span>
              </div>
              <div>
                <span className="font-medium">Completion:</span>
                <span className="ml-2 text-gray-600">Certificate issued automatically</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}