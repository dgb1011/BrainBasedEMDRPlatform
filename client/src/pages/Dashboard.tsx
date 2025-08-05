import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProgressCircle from '@/components/ProgressCircle';
import SessionCard from '@/components/SessionCard';
import CalendarView from '@/components/CalendarView';
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
  User
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-24 bg-gray-200 rounded-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
            <p className="text-text-secondary">Unable to load dashboard data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { student, upcomingSessions, progress } = dashboardData;
  const adminData_safe = adminData || {};

  // Mock available slots for calendar
  const availableSlots = {
    '2024-01-30': [
      { time: '10:00 AM', consultant: 'Dr. Emily Chen', consultantId: 'consultant-1', available: true },
      { time: '2:00 PM', consultant: 'Dr. Michael Torres', consultantId: 'consultant-2', available: true },
    ],
    '2024-01-31': [
      { time: '11:00 AM', consultant: 'Dr. Sarah Kim', consultantId: 'consultant-3', available: true },
      { time: '3:00 PM', consultant: 'Dr. Emily Chen', consultantId: 'consultant-1', available: true },
    ]
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            Welcome back, {student?.user?.firstName || 'Student'}!
          </h2>
          <p className="text-text-secondary">
            Track your EMDR certification progress and manage your consultation sessions.
          </p>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">
                    {progress?.totalHours || 0} / 40
                  </h3>
                  <p className="text-text-secondary">Hours Completed</p>
                </div>
                <ProgressCircle 
                  percentage={progress?.percentage || 0} 
                  size={60} 
                  strokeWidth={6}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-full p-3 mr-4">
                  <Clock className="text-blue-600 h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">
                    {progress?.remainingHours || 40}
                  </h3>
                  <p className="text-text-secondary">Hours Remaining</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-3 mr-4">
                  <CheckCircle className="text-green-600 h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">
                    {progress?.completedSessions || 0}
                  </h3>
                  <p className="text-text-secondary">Sessions Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-purple-100 rounded-full p-3 mr-4">
                  <Award className="text-purple-600 h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">
                    {student?.certificationStatus === 'completed' ? 'Complete' : 'In Progress'}
                  </h3>
                  <p className="text-text-secondary">Certification Status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Upcoming Sessions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Sessions */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Video className="h-5 w-5 mr-2 text-primary" />
                  Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingSessions && upcomingSessions.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingSessions.map((session: any) => (
                      <SessionCard
                        key={session.id}
                        session={{
                          id: session.id,
                          consultantName: session.consultantName || 'Unknown Consultant',
                          scheduledStart: new Date(session.scheduledStart),
                          scheduledEnd: new Date(session.scheduledEnd),
                          status: session.status,
                          sessionType: session.sessionType
                        }}
                        onJoin={handleJoinSession}
                        onReschedule={handleRescheduleSession}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-text-primary mb-2">
                      No upcoming sessions
                    </h3>
                    <p className="text-text-secondary mb-4">
                      Schedule your next consultation session to continue your certification journey.
                    </p>
                    <Link href="/schedule">
                      <Button className="bg-primary hover:bg-blue-700 text-white">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Session
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Admin Overview (if admin data is available) */}
            {adminData_safe && Object.keys(adminData_safe).length > 0 && (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                    Platform Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {adminData_safe.activeStudents || 0}
                      </div>
                      <div className="text-sm text-text-secondary">Active Students</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent">
                        {adminData_safe.sessionsThisWeek || 0}
                      </div>
                      <div className="text-sm text-text-secondary">Sessions This Week</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-secondary">
                        {adminData_safe.completedCertifications || 0}
                      </div>
                      <div className="text-sm text-text-secondary">Certifications</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {adminData_safe.systemUptime || 99}%
                      </div>
                      <div className="text-sm text-text-secondary">System Uptime</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Calendar */}
          <div className="space-y-6">
            <CalendarView
              selectedDate={selectedCalendarDate}
              onDateSelect={setSelectedCalendarDate}
              onSlotSelect={handleSlotSelect}
              availableSlots={availableSlots}
            />

            {/* Quick Actions */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/schedule" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule New Session
                  </Button>
                </Link>
                <Link href="/progress" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <GraduationCap className="h-4 w-4 mr-2" />
                    View Progress
                  </Button>
                </Link>
                <Link href="/sessions" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Session History
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}