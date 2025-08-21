import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, User, Plus } from 'lucide-react';
import CalendarView from '@/components/CalendarView';
import { apiRequest } from '@/lib/queryClient';
import { format, addDays } from 'date-fns';

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock available slots data - in real app this would come from API
  const availableSlots: Record<string, any[]> = {
    [format(new Date(), 'yyyy-MM-dd')]: [
      { time: '9:00 AM', consultant: 'Dr. Emily Chen', consultantId: 'consultant-1', available: true },
      { time: '11:00 AM', consultant: 'Dr. Michael Torres', consultantId: 'consultant-2', available: false },
      { time: '2:00 PM', consultant: 'Dr. Emily Chen', consultantId: 'consultant-1', available: true },
      { time: '4:00 PM', consultant: 'Dr. Michael Torres', consultantId: 'consultant-2', available: true },
    ],
    [format(addDays(new Date(), 1), 'yyyy-MM-dd')]: [
      { time: '10:00 AM', consultant: 'Dr. Emily Chen', consultantId: 'consultant-1', available: true },
      { time: '1:00 PM', consultant: 'Dr. Michael Torres', consultantId: 'consultant-2', available: true },
      { time: '3:00 PM', consultant: 'Dr. Emily Chen', consultantId: 'consultant-1', available: false },
    ],
    [format(addDays(new Date(), 2), 'yyyy-MM-dd')]: [
      { time: '9:00 AM', consultant: 'Dr. Michael Torres', consultantId: 'consultant-2', available: true },
      { time: '11:00 AM', consultant: 'Dr. Emily Chen', consultantId: 'consultant-1', available: true },
      { time: '2:00 PM', consultant: 'Dr. Michael Torres', consultantId: 'consultant-2', available: true },
    ],
  };

  const { data: upcomingSessions, isLoading } = useQuery({
    queryKey: ['/api/sessions'],
    queryFn: async () => {
      const res = await apiRequest('/api/sessions', 'GET');
      return await res.json();
    }
  });

  const bookSessionMutation = useMutation({
    mutationFn: async ({ date, slot }: { date: Date; slot: any }) => {
      return await apiRequest('/api/sessions/book', 'POST', {
        consultantId: slot.consultantId,
        scheduledStart: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 
          parseInt(slot.time.split(':')[0]), 
          slot.time.includes('PM') && slot.time.split(':')[0] !== '12' ? parseInt(slot.time.split(':')[0]) + 12 : parseInt(slot.time.split(':')[0])
        ),
        sessionType: 'consultation'
      });
    },
    onSuccess: () => {
      toast({
        title: "Session Booked",
        description: "Your consultation session has been successfully scheduled.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to book session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSlotSelect = (date: Date, slot: any) => {
    bookSessionMutation.mutate({ date, slot });
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Schedule Consultation</h1>
        <p className="text-gray-600">Book your EMDR consultation sessions with qualified consultants.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Section */}
        <div className="lg:col-span-2">
          <CalendarView
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onSlotSelect={handleSlotSelect}
            availableSlots={availableSlots}
          />
        </div>

        {/* Upcoming Sessions Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                Upcoming Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (upcomingSessions?.sessions || [])?.length > 0 ? (
                <div className="space-y-4">
                  {(upcomingSessions?.sessions || []).slice(0, 3).map((session: any) => (
                    <div key={session.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-blue-100 text-blue-800">
                          {session.status?.toUpperCase() || 'SCHEDULED'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {format(new Date(session.scheduledStart), 'MMM d')}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <User className="h-3 w-3 mr-2 text-gray-400" />
                          <span className="font-medium">{session.consultantName || 'Dr. Smith'}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-3 w-3 mr-2 text-gray-400" />
                          <span>
                            {format(new Date(session.scheduledStart), 'h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No upcoming sessions</p>
                  <p className="text-xs">Book your first session!</p>
                </div>
              )}
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
                variant="outline"
                onClick={() => setSelectedDate(new Date())}
              >
                <Plus className="h-4 w-4 mr-2" />
                Book Today
              </Button>
              <Button 
                className="w-full justify-start"
                variant="outline"
                onClick={() => setSelectedDate(addDays(new Date(), 1))}
              >
                <Plus className="h-4 w-4 mr-2" />
                Book Tomorrow
              </Button>
              <Button 
                className="w-full justify-start"
                variant="outline"
                onClick={() => window.location.href = '/sessions'}
              >
                <Calendar className="h-4 w-4 mr-2" />
                View All Sessions
              </Button>
            </CardContent>
          </Card>

          {/* Consultation Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Duration:</span>
                <span className="ml-2 text-gray-600">60 minutes</span>
              </div>
              <div>
                <span className="font-medium">Format:</span>
                <span className="ml-2 text-gray-600">Video Conference</span>
              </div>
              <div>
                <span className="font-medium">Recording:</span>
                <span className="ml-2 text-gray-600">Available after session</span>
              </div>
              <div>
                <span className="font-medium">Cancellation:</span>
                <span className="ml-2 text-gray-600">24 hours notice required</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}