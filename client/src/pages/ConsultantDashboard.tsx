import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
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
  Settings
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { format, addDays } from 'date-fns';

export default function ConsultantDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: consultantData, isLoading } = useQuery({
    queryKey: ['/api/consultants/dashboard'],
  });

  // Mock data for demonstration
  const mockConsultantData = {
    consultant: {
      name: 'Dr. Emily Chen',
      specializations: ['Trauma', 'PTSD', 'Anxiety'],
      rating: 4.9,
      totalHours: 500.5,
      monthlyEarnings: 4800,
      completedSessions: 234
    },
    upcomingSessions: [
      {
        id: 'session-1',
        studentName: 'Jane Smith',
        scheduledStart: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        scheduledEnd: new Date(Date.now() + 3 * 60 * 60 * 1000),
        sessionType: 'consultation',
        studentProgress: '15.5/40 hours',
        notes: 'Working on bilateral stimulation techniques'
      },
      {
        id: 'session-2',
        studentName: 'Mike Johnson',
        scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        scheduledEnd: new Date(Date.now() + 25 * 60 * 60 * 1000),
        sessionType: 'practice',
        studentProgress: '28/40 hours',
        notes: 'Final evaluation session'
      }
    ],
    monthlyStats: {
      sessionsThisMonth: 18,
      hoursThisMonth: 22.5,
      newStudents: 5,
      averageRating: 4.9
    },
    recentCompletedSessions: [
      {
        id: 'completed-1',
        studentName: 'Sarah Wilson',
        completedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        duration: 1.5,
        rating: 5,
        sessionType: 'consultation'
      },
      {
        id: 'completed-2',
        studentName: 'Tom Brown',
        completedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        duration: 1.0,
        rating: 4,
        sessionType: 'practice'
      }
    ]
  };

  const data = consultantData || mockConsultantData;

  const handleJoinSession = (sessionId: string) => {
    setLocation(`/video/${sessionId}`);
  };

  const handleUpdateAvailability = () => {
    toast({
      title: "Availability Updated",
      description: "Your availability schedule has been updated.",
    });
  };

  const isSessionStartingSoon = (sessionStart: Date) => {
    const now = new Date();
    const timeDiff = sessionStart.getTime() - now.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));
    return minutesDiff <= 15 && minutesDiff > 0;
  };

  const canJoinSession = (sessionStart: Date) => {
    const now = new Date();
    const timeDiff = sessionStart.getTime() - now.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));
    return minutesDiff <= 15 && minutesDiff >= -60; // Can join 15 min early to 60 min after start
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {data.consultant.name}
        </h1>
        <p className="text-gray-600">Your EMDR consultation dashboard</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">{data.monthlyStats.sessionsThisMonth}</p>
                <p className="text-xs text-gray-500">sessions completed</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hours This Month</p>
                <p className="text-2xl font-bold text-gray-900">{data.monthlyStats.hoursThisMonth}</p>
                <p className="text-xs text-gray-500">consultation hours</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Earnings</p>
                <p className="text-2xl font-bold text-gray-900">${data.consultant.monthlyEarnings}</p>
                <p className="text-xs text-green-600">+12% vs last month</p>
              </div>
              <div className="bg-orange-100 rounded-full p-3">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold text-gray-900">{data.consultant.rating}</p>
                <div className="flex items-center">
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-500 ml-1">from {data.consultant.completedSessions} sessions</span>
                </div>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Sessions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  Upcoming Sessions
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleUpdateAvailability}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Update Availability
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.upcomingSessions.length > 0 ? (
                  data.upcomingSessions.map((session) => (
                    <div key={session.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-blue-100 text-blue-800">
                              {session.sessionType.toUpperCase()}
                            </Badge>
                            {isSessionStartingSoon(new Date(session.scheduledStart)) && (
                              <Badge className="bg-orange-100 text-orange-800">
                                STARTING SOON
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center text-sm">
                              <User className="h-4 w-4 mr-2 text-gray-500" />
                              <span className="font-medium">{session.studentName}</span>
                              <span className="text-gray-500 ml-2">({session.studentProgress})</span>
                            </div>
                            
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>
                                {format(new Date(session.scheduledStart), 'MMM d, h:mm a')} - 
                                {format(new Date(session.scheduledEnd), 'h:mm a')}
                              </span>
                            </div>
                            
                            {session.notes && (
                              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                {session.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          {canJoinSession(new Date(session.scheduledStart)) ? (
                            <Button 
                              onClick={() => handleJoinSession(session.id)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Video className="h-4 w-4 mr-2" />
                              Join
                            </Button>
                          ) : (
                            <Button variant="outline" disabled>
                              <Clock className="h-4 w-4 mr-2" />
                              Scheduled
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming sessions</h3>
                    <p className="text-gray-500">Your schedule is clear for now.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-600">Specializations</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.consultant.specializations.map((spec, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Total Hours</span>
                <p className="text-lg font-semibold">{data.consultant.totalHours}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Rating</span>
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="ml-1 font-semibold">{data.consultant.rating}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentCompletedSessions.map((session) => (
                  <div key={session.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{session.studentName}</span>
                      <div className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                        <span className="text-xs ml-1">{session.rating}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{format(session.completedDate, 'MMM d')}</span>
                      <span>{session.duration}h • {session.sessionType}</span>
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
                onClick={() => setLocation('/sessions')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                View All Sessions
              </Button>
              <Button 
                className="w-full justify-start"
                variant="outline"
                onClick={handleUpdateAvailability}
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Availability
              </Button>
              <Button 
                className="w-full justify-start"
                variant="outline"
                onClick={() => toast({ title: "Profile", description: "Profile editing coming soon!" })}
              >
                <User className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}