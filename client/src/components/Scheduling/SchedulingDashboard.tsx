import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Calendar } from '../ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../../hooks/use-toast';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  MapPin,
  CheckCircle,
  AlertCircle,
  Plus,
  Settings,
  Filter
} from 'lucide-react';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { apiRequest } from '../../lib/queryClient';

interface SchedulingDashboardProps {
  userRole: 'student' | 'consultant' | 'admin';
}

interface AvailableSlot {
  consultantId: string;
  consultantName: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  duration: number;
  isOptimal: boolean;
  score: number;
}

interface BookingPreferences {
  preferredDuration: number;
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening';
  preferredConsultants?: string[];
  preferredDays?: number[];
  timezone: string;
}

export function SchedulingDashboard({ userRole }: SchedulingDashboardProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [bookingPreferences, setBookingPreferences] = useState<BookingPreferences>({
    preferredDuration: 60,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isPreferencesDialogOpen, setIsPreferencesDialogOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available slots
  const { data: availableSlots, isLoading: slotsLoading } = useQuery({
    queryKey: ['available-slots', selectedDate, bookingPreferences],
    queryFn: async () => {
      const response = await apiRequest('/api/scheduling/available-slots', 'POST', {
        dateRange: {
          start: selectedDate,
          end: addDays(selectedDate || new Date(), 7)
        },
        preferences: bookingPreferences
      });
      return response.slots || [];
    },
    enabled: !!selectedDate
  });

  // Fetch user's upcoming sessions
  const { data: upcomingSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['upcoming-sessions'],
    queryFn: async () => {
      const response = await apiRequest('/api/sessions/upcoming');
      return response.sessions || [];
    }
  });

  // Fetch consultants (for filtering)
  const { data: consultants } = useQuery({
    queryKey: ['consultants'],
    queryFn: async () => {
      const response = await apiRequest('/api/consultants');
      return response.consultants || [];
    }
  });

  // Book session mutation
  const bookSessionMutation = useMutation({
    mutationFn: async (slot: AvailableSlot) => {
      return await apiRequest('/api/scheduling/book-session', 'POST', {
        consultantId: slot.consultantId,
        startTime: slot.startTime,
        endTime: slot.endTime,
        sessionType: 'consultation',
        timezone: bookingPreferences.timezone
      });
    },
    onSuccess: () => {
      toast({
        title: "Session Booked!",
        description: "Your consultation session has been successfully scheduled.",
      });
      queryClient.invalidateQueries({ queryKey: ['upcoming-sessions'] });
      setIsBookingDialogOpen(false);
      setSelectedSlot(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to book session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setIsBookingDialogOpen(true);
  };

  const handleBookSession = () => {
    if (selectedSlot) {
      bookSessionMutation.mutate(selectedSlot);
    }
  };

  const getTimeOfDay = (date: Date) => {
    const hour = date.getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const getConsultantById = (consultantId: string) => {
    return consultants?.find(c => c.id === consultantId);
  };

  const groupedSlots = availableSlots?.reduce((groups: any, slot: AvailableSlot) => {
    const dateKey = format(slot.date, 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(slot);
    return groups;
  }, {}) || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Schedule Consultation Sessions</h1>
          <p className="text-muted-foreground">
            Book your EMDR consultation sessions to complete your certification
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsPreferencesDialogOpen(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Preferences
          </Button>
          
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Quick Book
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              disabled={(date) => date < new Date()}
            />
            
            {/* Quick Stats */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Available Slots:</span>
                <Badge variant="secondary">
                  {availableSlots?.length || 0}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Upcoming Sessions:</span>
                <Badge variant="outline">
                  {upcomingSessions?.length || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Slots */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Available Sessions
              </span>
              {slotsLoading && (
                <Badge variant="secondary">Loading...</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(groupedSlots).length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No available slots found for the selected date range.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsPreferencesDialogOpen(true)}
                >
                  Adjust Preferences
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedSlots).map(([date, slots]: [string, any]) => (
                  <div key={date} className="space-y-2">
                    <h3 className="font-semibold text-lg">
                      {format(parseISO(date), 'EEEE, MMMM d')}
                    </h3>
                    <div className="grid gap-2">
                      {slots.map((slot: AvailableSlot) => (
                        <div
                          key={`${slot.consultantId}-${slot.startTime.toISOString()}`}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleSlotSelect(slot)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <p className="font-semibold">
                                {format(slot.startTime, 'h:mm a')}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {slot.duration} min
                              </p>
                            </div>
                            
                            <div className="h-12 w-px bg-border" />
                            
                            <div>
                              <p className="font-medium">{slot.consultantName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  variant={getTimeOfDay(slot.startTime) === 'morning' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {getTimeOfDay(slot.startTime)}
                                </Badge>
                                {slot.isOptimal && (
                                  <Badge variant="outline" className="text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Optimal
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              Score: {slot.score}%
                            </p>
                            <Button size="sm" className="mt-1">
                              Book
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Your Upcoming Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : upcomingSessions?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No upcoming sessions scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSessions?.map((session: any) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="font-semibold">
                        {format(new Date(session.scheduled_start), 'MMM d')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(session.scheduled_start), 'h:mm a')}
                      </p>
                    </div>
                    
                    <div className="h-12 w-px bg-border" />
                    
                    <div>
                      <p className="font-medium">
                        {session.consultant?.user?.first_name} {session.consultant?.user?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {session.session_type} session
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {session.status}
                    </Badge>
                    <Button size="sm" variant="outline">
                      Join
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Session Booking</DialogTitle>
          </DialogHeader>
          
          {selectedSlot && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="font-medium">Session Details:</p>
                <div className="space-y-1 text-sm">
                  <p><strong>Date:</strong> {format(selectedSlot.date, 'EEEE, MMMM d, yyyy')}</p>
                  <p><strong>Time:</strong> {format(selectedSlot.startTime, 'h:mm a')} - {format(selectedSlot.endTime, 'h:mm a')}</p>
                  <p><strong>Consultant:</strong> {selectedSlot.consultantName}</p>
                  <p><strong>Duration:</strong> {selectedSlot.duration} minutes</p>
                  <p><strong>Type:</strong> Consultation Session</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsBookingDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleBookSession}
                  disabled={bookSessionMutation.isPending}
                  className="flex-1"
                >
                  {bookSessionMutation.isPending ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preferences Dialog */}
      <Dialog open={isPreferencesDialogOpen} onOpenChange={setIsPreferencesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Booking Preferences</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Session Duration</label>
              <Select
                value={bookingPreferences.preferredDuration.toString()}
                onValueChange={(value) => setBookingPreferences({
                  ...bookingPreferences,
                  preferredDuration: parseInt(value)
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred Time of Day</label>
              <Select
                value={bookingPreferences.preferredTimeOfDay || ''}
                onValueChange={(value) => setBookingPreferences({
                  ...bookingPreferences,
                  preferredTimeOfDay: value as any
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any time</SelectItem>
                  <SelectItem value="morning">Morning (6 AM - 12 PM)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12 PM - 5 PM)</SelectItem>
                  <SelectItem value="evening">Evening (5 PM - 10 PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred Consultants</label>
              <Select
                value=""
                onValueChange={(value) => {
                  const current = bookingPreferences.preferredConsultants || [];
                  setBookingPreferences({
                    ...bookingPreferences,
                    preferredConsultants: [...current, value]
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select consultants" />
                </SelectTrigger>
                <SelectContent>
                  {consultants?.map((consultant: any) => (
                    <SelectItem key={consultant.id} value={consultant.id}>
                      {consultant.user.first_name} {consultant.user.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsPreferencesDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => setIsPreferencesDialogOpen(false)}
                className="flex-1"
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
