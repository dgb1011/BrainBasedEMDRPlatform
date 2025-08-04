
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar, 
  Video, 
  Clock, 
  Users, 
  Activity, 
  DollarSign,
  TrendingUp,
  CheckCircle
} from 'lucide-react';

export default function ConsultantDashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['/api/consultants/dashboard'],
    retry: false,
  });

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

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary">BrainBased EMDR - Consultant</h1>
              <nav className="hidden md:ml-8 md:flex md:space-x-8">
                <Link href="/" className="text-primary border-b-2 border-primary px-1 pb-4 text-sm font-medium">
                  Dashboard
                </Link>
                <Link href="/schedule" className="text-text-secondary hover:text-primary px-1 pb-4 text-sm font-medium">
                  Schedule
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
                  Welcome back, Consultant!
                </h2>
                <p className="text-text-secondary">
                  Manage your consultation sessions and help students complete their EMDR certification.
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <Link href="/schedule">
                  <Button className="bg-primary hover:bg-blue-700 text-white">
                    <Calendar className="h-4 w-4 mr-2" />
                    Manage Schedule
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Sessions */}
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-primary bg-opacity-10 rounded-full p-3">
                  <Video className="text-primary h-6 w-6" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-text-primary">24</h3>
                  <p className="text-text-secondary">Total Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Week's Sessions */}
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-accent bg-opacity-10 rounded-full p-3">
                  <Calendar className="text-accent h-6 w-6" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-text-primary">6</h3>
                  <p className="text-text-secondary">This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Students */}
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-secondary bg-opacity-10 rounded-full p-3">
                  <Users className="text-secondary h-6 w-6" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-text-primary">12</h3>
                  <p className="text-text-secondary">Active Students</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hours This Month */}
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-primary bg-opacity-10 rounded-full p-3">
                  <Clock className="text-primary h-6 w-6" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-text-primary">38</h3>
                  <p className="text-text-secondary">Hours This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Schedule and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Today's Sessions */}
          <Card className="bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Today's Sessions</CardTitle>
                <Link href="/sessions">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-blue-700">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center text-text-secondary py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sessions scheduled for today</p>
                <Link href="/schedule">
                  <Button className="mt-4">Manage Schedule</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

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
                    <span className="text-sm font-medium">Set Availability</span>
                  </Button>
                </Link>
                
                <Link href="/sessions">
                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-center p-4 w-full hover:bg-gray-50"
                  >
                    <Video className="text-accent h-8 w-8 mb-2" />
                    <span className="text-sm font-medium">View Sessions</span>
                  </Button>
                </Link>
                
                <Button
                  variant="outline"
                  className="h-auto flex flex-col items-center p-4 hover:bg-gray-50"
                >
                  <TrendingUp className="text-secondary h-8 w-8 mb-2" />
                  <span className="text-sm font-medium">View Reports</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto flex flex-col items-center p-4 hover:bg-gray-50"
                >
                  <CheckCircle className="text-primary h-8 w-8 mb-2" />
                  <span className="text-sm font-medium">Session Notes</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 border border-gray-100 rounded-lg">
                <div className="bg-primary bg-opacity-10 rounded-full p-2">
                  <CheckCircle className="text-primary h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">Session completed with Sarah Johnson</p>
                  <p className="text-xs text-text-secondary">2 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-4 border border-gray-100 rounded-lg">
                <div className="bg-accent bg-opacity-10 rounded-full p-2">
                  <Calendar className="text-accent h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">New session booked for tomorrow</p>
                  <p className="text-xs text-text-secondary">5 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-4 border border-gray-100 rounded-lg">
                <div className="bg-secondary bg-opacity-10 rounded-full p-2">
                  <Users className="text-secondary h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">New student assigned: Mike Chen</p>
                  <p className="text-xs text-text-secondary">1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          <Link href="/">
            <Button variant="ghost" className="flex flex-col items-center py-2 px-4 text-primary">
              <Activity className="h-5 w-5 mb-1" />
              <span className="text-xs">Dashboard</span>
            </Button>
          </Link>
          <Link href="/schedule">
            <Button variant="ghost" className="flex flex-col items-center py-2 px-4 text-text-secondary">
              <Calendar className="h-5 w-5 mb-1" />
              <span className="text-xs">Schedule</span>
            </Button>
          </Link>
          <Link href="/sessions">
            <Button variant="ghost" className="flex flex-col items-center py-2 px-4 text-text-secondary">
              <Video className="h-5 w-5 mb-1" />
              <span className="text-xs">Sessions</span>
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
