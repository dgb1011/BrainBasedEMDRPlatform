import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CalendarView from '@/components/CalendarView';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { toast } = useToast();

  const { data: consultants } = useQuery({
    queryKey: ['/api/consultants'],
    retry: false,
  });

  const handleSlotSelect = (date: Date, slot: { time: string; consultant: string; consultantId: string }) => {
    toast({
      title: "Session Booking",
      description: `Booking ${slot.time} with ${slot.consultant} on ${date.toDateString()}`,
    });
    
    // In a real app, this would make an API call to book the session
    setTimeout(() => {
      toast({
        title: "Session Booked Successfully!",
        description: "Check your dashboard for confirmation details.",
        variant: "default",
      });
    }, 1000);
  };

  // Mock available slots based on consultants
  const availableSlots = {
    [new Date(2024, 0, 15).toISOString().split('T')[0]]: [
      { time: '9:00 AM', consultant: 'Dr. Emily Chen', consultantId: 'consultant-1' },
      { time: '11:00 AM', consultant: 'Dr. Michael Torres', consultantId: 'consultant-2' },
      { time: '2:00 PM', consultant: 'Dr. Emily Chen', consultantId: 'consultant-1' },
      { time: '4:30 PM', consultant: 'Dr. Sarah Kim', consultantId: 'consultant-3' },
    ],
    [new Date(2024, 0, 18).toISOString().split('T')[0]]: [
      { time: '10:00 AM', consultant: 'Dr. Michael Torres', consultantId: 'consultant-2' },
      { time: '3:00 PM', consultant: 'Dr. Sarah Kim', consultantId: 'consultant-3' },
    ],
    [new Date(2024, 0, 22).toISOString().split('T')[0]]: [
      { time: '9:30 AM', consultant: 'Dr. Emily Chen', consultantId: 'consultant-1' },
      { time: '1:00 PM', consultant: 'Dr. Michael Torres', consultantId: 'consultant-2' },
      { time: '4:00 PM', consultant: 'Dr. Sarah Kim', consultantId: 'consultant-3' },
    ],
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
              <h1 className="text-xl font-bold text-primary">Schedule Session</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Instructions */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Book Your Consultation Session</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary">
                Select a date and time slot that works for you. All sessions are conducted via video 
                conference and automatically recorded for your reference. You'll receive a confirmation 
                email with the session details and join link.
              </p>
            </CardContent>
          </Card>

          {/* Calendar */}
          <CalendarView
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            availableSlots={availableSlots}
            onSlotSelect={handleSlotSelect}
          />

          {/* Consultant Information */}
          {consultants && (
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Available Consultants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {consultants && consultants.slice(0, 3).map((consultant: any) => (
                    <div key={consultant.id} className="border rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <img
                          src={consultant.user?.profileImageUrl || '/default-avatar.png'}
                          alt={`${consultant.user?.firstName} ${consultant.user?.lastName}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <h4 className="font-medium text-text-primary">
                            Dr. {consultant.user?.firstName} {consultant.user?.lastName}
                          </h4>
                          <p className="text-sm text-text-secondary">
                            {consultant.yearsExperience} years experience
                          </p>
                        </div>
                      </div>
                      
                      {consultant.specializations && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-text-primary mb-1">Specializations:</p>
                          <p className="text-sm text-text-secondary">
                            {consultant.specializations.join(', ')}
                          </p>
                        </div>
                      )}
                      
                      {consultant.bio && (
                        <p className="text-sm text-text-secondary mb-3">
                          {consultant.bio}
                        </p>
                      )}
                      
                      {consultant.averageRating && (
                        <div className="flex items-center text-sm">
                          <span className="text-yellow-500 mr-1">★</span>
                          <span className="text-text-primary">
                            {consultant.averageRating} rating
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-text-primary mb-3">Session Preparation Tips</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>• Ensure you have a stable internet connection for video conferencing</li>
                <li>• Find a quiet, private space for your consultation</li>
                <li>• Have your case materials and questions prepared in advance</li>
                <li>• Test your camera and microphone before the session</li>
                <li>• Join the session 5-10 minutes early to resolve any technical issues</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
