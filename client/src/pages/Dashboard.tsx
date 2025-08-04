import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import ProgressCircle from '@/components/ProgressCircle';
import SessionCard from '@/components/SessionCard';
import CalendarView from '@/components/CalendarView';
import { Calendar, FileUp, TrendingUp, HelpCircle, Video, Clock, GraduationCap, Users, Activity, Award } from 'lucide-react';
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
    // In a real app, this would open a reschedule dialog
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

  const { student, upcomingSessions, progress } = dashboardData || {};

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary">BrainBased EMDR</h1>
              <nav className="hidden md:ml-8 md:flex md:space-x-8">
                <Link href="/" className="text-primary border-b-2 border-primary px-1 pb-4 text-sm font-medium">
                  Dashboard
                </Link>
                <Link href="/schedule" className="text-text-secondary hover:text-primary px-1 pb-4 text-sm font-medium">
                  Schedule
                </Link>
                <Link href="/progress" className="text-text-secondary hover:text-primary px-1 pb-4 text-sm font-medium">
                  Progress
                </Link>
                <Link href="/sessions" className="text-text-secondary hover:text-primary px-1 pb-4 text-sm font-medium">
                  Sessions
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Activity className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => window.location.href = "/api/logout"}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Section */}
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">
                  Welcome back, {student?.userId ? 'Sarah' : 'Student'}!
                </h2>
                <p className="text-text-secondary">
                  Continue your EMDR consultation journey. You're making great progress!
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <Link href="/schedule">
                  <Button className="bg-primary hover:bg-blue-700 text-white">
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Session
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Hours Completed */}
          <Card className="bg-white text-center">
            <CardContent className="p-6">
              <ProgressCircle progress={progress?.completionPercentage || 0} className="mb-4">
                <span className="text-2xl font-bold text-text-primary">
                  {Math.round(progress?.completedHours || 0)}
                </span>
              </ProgressCircle>
              <h3 className="text-lg font-semibold text-text-primary">Hours Completed</h3>
              <p className="text-text-secondary">of {progress?.totalRequired || 40} required</p>
            </CardContent>
          </Card>

          {/* Sessions This Month */}
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-accent bg-opacity-10 rounded-full p-3">
                  <Video className="text-accent h-6 w-6" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-text-primary">
                    {progress?.sessionsThisMonth || 0}
                  </h3>
                  <p className="text-text-secondary">Sessions This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Session */}
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-primary bg-opacity-10 rounded-full p-3">
                  <Clock className="text-primary h-6 w-6" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-semibold text-text-primary">Next Session</h3>
                  {upcomingSessions && upcomingSessions.length > 0 ? (
                    <>
                      <p className="text-text-secondary">
                        {new Date(upcomingSessions[0].scheduledStart).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {upcomingSessions[0].consultant?.user?.firstName} {upcomingSessions[0].consultant?.user?.lastName}
                      </p>
                    </>
                  ) : (
                    <p className="text-text-secondary">No sessions scheduled</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completion Estimate */}
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-secondary bg-opacity-10 rounded-full p-3">
                  <GraduationCap className="text-secondary h-6 w-6" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-semibold text-text-primary">Est. Completion</h3>
                  <p className="text-text-secondary">March 2024</p>
                  <p className="text-xs text-secondary">
                    {progress?.remainingHours || 40} hours remaining
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Sessions & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Sessions */}
          <Card className="bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upcoming Sessions</CardTitle>
                <Link href="/sessions">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-blue-700">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingSessions && upcomingSessions.length > 0 ? (
                upcomingSessions.slice(0, 3).map((session: any) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onJoinSession={handleJoinSession}
                    onReschedule={handleRescheduleSession}
                  />
                ))
              ) : (
                <div className="text-center text-text-secondary py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming sessions scheduled</p>
                  <Link href="/schedule">
                    <Button className="mt-4">Schedule Your First Session</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions & Resources */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Link href="/schedule">
                    <Button
                      variant="outline"
                      className="h-auto flex flex-col items-center p-4 w-full hover:bg-gray-50"
                    >
                      <Calendar className="text-primary h-8 w-8 mb-2" />
                      <span className="text-sm font-medium">Book Session</span>
                    </Button>
                  </Link>
                  
                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-center p-4 hover:bg-gray-50"
                  >
                    <FileUp className="text-accent h-8 w-8 mb-2" />
                    <span className="text-sm font-medium">Submit Log</span>
                  </Button>
                  
                  <Link href="/progress">
                    <Button
                      variant="outline"
                      className="h-auto flex flex-col items-center p-4 w-full hover:bg-gray-50"
                    >
                      <TrendingUp className="text-secondary h-8 w-8 mb-2" />
                      <span className="text-sm font-medium">View Progress</span>
                    </Button>
                  </Link>
                  
                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-center p-4 hover:bg-gray-50"
                  >
                    <HelpCircle className="text-primary h-8 w-8 mb-2" />
                    <span className="text-sm font-medium">Get Help</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Resources */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start p-3 h-auto hover:bg-gray-50"
                >
                  <FileUp className="text-primary mr-3 h-5 w-5" />
                  <span className="text-sm">EMDR Guidelines</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start p-3 h-auto hover:bg-gray-50"
                >
                  <Video className="text-accent mr-3 h-5 w-5" />
                  <span className="text-sm">Training Videos</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start p-3 h-auto hover:bg-gray-50"
                >
                  <FileUp className="text-secondary mr-3 h-5 w-5" />
                  <span className="text-sm">Forms & Documents</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Calendar Scheduling Interface */}
        <CalendarView
          selectedDate={selectedCalendarDate}
          onDateSelect={setSelectedCalendarDate}
          onSlotSelect={handleSlotSelect}
        />

        {/* Admin Dashboard Preview */}
        {adminData && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Admin Dashboard Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Active Students */}
                <div className="text-center">
                  <div className="bg-primary bg-opacity-10 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <Users className="text-primary h-6 w-6" />
                  </div>
                  <h4 className="text-2xl font-bold text-text-primary">{adminData?.activeStudents || 0}</h4>
                  <p className="text-text-secondary text-sm">Active Students</p>
                  <p className="text-secondary text-xs">+12% this month</p>
                </div>

                {/* Sessions This Week */}
                <div className="text-center">
                  <div className="bg-accent bg-opacity-10 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <Video className="text-accent h-6 w-6" />
                  </div>
                  <h4 className="text-2xl font-bold text-text-primary">{adminData?.sessionsThisWeek || 0}</h4>
                  <p className="text-text-secondary text-sm">Sessions This Week</p>
                  <p className="text-secondary text-xs">+8% vs last week</p>
                </div>

                {/* Completed Certifications */}
                <div className="text-center">
                  <div className="bg-secondary bg-opacity-10 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <Award className="text-secondary h-6 w-6" />
                  </div>
                  <h4 className="text-2xl font-bold text-text-primary">{adminData?.completedCertifications || 0}</h4>
                  <p className="text-text-secondary text-sm">Certifications</p>
                  <p className="text-secondary text-xs">This month</p>
                </div>

                {/* System Health */}
                <div className="text-center">
                  <div className="bg-secondary bg-opacity-10 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <Activity className="text-secondary h-6 w-6" />
                  </div>
                  <h4 className="text-2xl font-bold text-text-primary">{adminData?.systemUptime || 99.9}%</h4>
                  <p className="text-text-secondary text-sm">System Uptime</p>
                  <p className="text-secondary text-xs">Last 30 days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          <Link href="/">
            <Button variant="ghost" className="flex flex-col items-center py-2 px-4 text-primary">
              <Calendar className="h-5 w-5 mb-1" />
              <span className="text-xs">Dashboard</span>
            </Button>
          </Link>
          <Link href="/schedule">
            <Button variant="ghost" className="flex flex-col items-center py-2 px-4 text-text-secondary">
              <Calendar className="h-5 w-5 mb-1" />
              <span className="text-xs">Schedule</span>
            </Button>
          </Link>
          <Link href="/progress">
            <Button variant="ghost" className="flex flex-col items-center py-2 px-4 text-text-secondary">
              <TrendingUp className="h-5 w-5 mb-1" />
              <span className="text-xs">Progress</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="flex flex-col items-center py-2 px-4 text-text-secondary"
            onClick={() => window.location.href = "/api/logout"}
          >
            <Users className="h-5 w-5 mb-1" />
            <span className="text-xs">Profile</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
