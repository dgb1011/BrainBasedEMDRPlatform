import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SessionCard from '@/components/SessionCard';
import { ArrowLeft, Search, Filter, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function SessionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['/api/students/dashboard'],
    retry: false,
  });

  const handleJoinSession = (sessionId: string) => {
    window.location.href = `/video/${sessionId}`;
  };

  const handleRescheduleSession = (sessionId: string) => {
    // Implementation would go here
    console.log('Reschedule session:', sessionId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-24 bg-gray-200 rounded-lg"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mock all sessions data
  const allSessions = [
    {
      id: 'session-1',
      scheduledStart: '2024-01-20T14:00:00Z',
      scheduledEnd: '2024-01-20T15:30:00Z',
      status: 'scheduled',
      consultant: {
        user: {
          firstName: 'Emily',
          lastName: 'Chen',
          profileImageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150'
        },
        specializations: ['Trauma Therapy', 'PTSD Treatment']
      }
    },
    {
      id: 'session-2',
      scheduledStart: '2024-01-15T15:00:00Z',
      scheduledEnd: '2024-01-15T16:00:00Z',
      status: 'completed',
      consultant: {
        user: {
          firstName: 'Michael',
          lastName: 'Torres',
          profileImageUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150'
        },
        specializations: ['Anxiety Disorders', 'Depression']
      }
    },
    {
      id: 'session-3',
      scheduledStart: '2024-01-10T10:00:00Z',
      scheduledEnd: '2024-01-10T11:30:00Z',
      status: 'completed',
      consultant: {
        user: {
          firstName: 'Sarah',
          lastName: 'Kim',
          profileImageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150'
        },
        specializations: ['Child Therapy', 'Family Counseling']
      }
    }
  ];

  // Filter and sort sessions
  const filteredSessions = allSessions
    .filter(session => {
      const matchesSearch = !searchTerm || 
        session.consultant?.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.consultant?.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime();
      }
      return 0;
    });

  const sessionStats = {
    total: allSessions.length,
    completed: allSessions.filter(s => s.status === 'completed').length,
    scheduled: allSessions.filter(s => s.status === 'scheduled').length,
    totalHours: allSessions.filter(s => s.status === 'completed').length * 1.5 // Assuming 1.5 hours per session
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-primary">All Sessions</h1>
            </div>
            <Link href="/schedule">
              <Button className="bg-primary hover:bg-blue-700 text-white">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule New Session
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-primary bg-opacity-10 rounded-full p-3">
                  <Calendar className="text-primary h-6 w-6" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-text-primary">{sessionStats.total}</h3>
                  <p className="text-text-secondary">Total Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-secondary bg-opacity-10 rounded-full p-3">
                  <Clock className="text-secondary h-6 w-6" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-text-primary">{sessionStats.completed}</h3>
                  <p className="text-text-secondary">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-accent bg-opacity-10 rounded-full p-3">
                  <Calendar className="text-accent h-6 w-6" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-text-primary">{sessionStats.scheduled}</h3>
                  <p className="text-text-secondary">Scheduled</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-purple-100 rounded-full p-3">
                  <Clock className="text-purple-600 h-6 w-6" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-text-primary">{sessionStats.totalHours}</h3>
                  <p className="text-text-secondary">Total Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary h-4 w-4" />
                  <Input
                    placeholder="Search by consultant name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sessions</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date (Newest First)</SelectItem>
                  <SelectItem value="consultant">Consultant Name</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sessions List */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>
              Session History ({filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredSessions.length > 0 ? (
              filteredSessions.map((session) => (
                <div key={session.id} className="border rounded-lg p-4">
                  <SessionCard
                    session={session}
                    onJoinSession={handleJoinSession}
                    onReschedule={handleRescheduleSession}
                  />
                  
                  {session.status === 'completed' && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">
                          Session completed on {format(new Date(session.scheduledStart), 'MMM dd, yyyy')}
                        </span>
                        <div className="flex items-center space-x-4">
                          <span className="text-secondary font-medium">
                            1.5 hours credited
                          </span>
                          <Button variant="ghost" size="sm">
                            View Recording
                          </Button>
                          <Button variant="ghost" size="sm">
                            Download Notes
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-text-secondary opacity-50" />
                <h3 className="text-lg font-medium text-text-primary mb-2">No sessions found</h3>
                <p className="text-text-secondary mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'You haven\'t scheduled any sessions yet.'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Link href="/schedule">
                    <Button>Schedule Your First Session</Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}