import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';

interface CalendarViewProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  availableSlots?: { [key: string]: Array<{ time: string; consultant: string; consultantId: string }> };
  onSlotSelect?: (date: Date, slot: { time: string; consultant: string; consultantId: string }) => void;
}

export default function CalendarView({ 
  selectedDate, 
  onDateSelect, 
  availableSlots = {},
  onSlotSelect 
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedConsultant, setSelectedConsultant] = useState<string>('all');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad the calendar to show full weeks
  const firstDayOfWeek = monthStart.getDay();
  const lastDayOfWeek = monthEnd.getDay();
  
  const paddedDays = [
    ...Array(firstDayOfWeek).fill(null),
    ...monthDays,
    ...Array(6 - lastDayOfWeek).fill(null)
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleDateClick = (date: Date) => {
    onDateSelect?.(date);
  };

  const handleSlotClick = (date: Date, slot: { time: string; consultant: string; consultantId: string }) => {
    onSlotSelect?.(date, slot);
  };

  const getAvailableSlotsForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const slots = availableSlots[dateKey] || [];
    
    if (selectedConsultant === 'all') {
      return slots;
    }
    
    return slots.filter(slot => slot.consultantId === selectedConsultant);
  };

  const hasAvailableSlots = (date: Date) => {
    return getAvailableSlotsForDate(date).length > 0;
  };

  const mockAvailableSlots = {
    [format(new Date(2024, 0, 15), 'yyyy-MM-dd')]: [
      { time: '9:00 AM', consultant: 'Dr. Chen', consultantId: 'consultant-1' },
      { time: '11:00 AM', consultant: 'Dr. Torres', consultantId: 'consultant-2' },
      { time: '2:00 PM', consultant: 'Dr. Chen', consultantId: 'consultant-1' },
      { time: '4:30 PM', consultant: 'Dr. Kim', consultantId: 'consultant-3' },
    ],
    [format(new Date(2024, 0, 18), 'yyyy-MM-dd')]: [
      { time: '10:00 AM', consultant: 'Dr. Torres', consultantId: 'consultant-2' },
      { time: '3:00 PM', consultant: 'Dr. Kim', consultantId: 'consultant-3' },
    ],
    [format(new Date(2024, 0, 22), 'yyyy-MM-dd')]: [
      { time: '9:30 AM', consultant: 'Dr. Chen', consultantId: 'consultant-1' },
      { time: '1:00 PM', consultant: 'Dr. Torres', consultantId: 'consultant-2' },
    ],
  };

  // Use mock data if no real data provided
  const effectiveSlots = Object.keys(availableSlots).length > 0 ? availableSlots : mockAvailableSlots;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Schedule New Session</CardTitle>
          <div className="flex items-center space-x-4">
            <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Consultants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Consultants</SelectItem>
                <SelectItem value="consultant-1">Dr. Emily Chen</SelectItem>
                <SelectItem value="consultant-2">Dr. Michael Torres</SelectItem>
                <SelectItem value="consultant-3">Dr. Sarah Kim</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-32 text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {/* Week day headers */}
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-text-secondary py-2">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {paddedDays.map((date, index) => {
            if (!date) {
              return <div key={index} className="h-10" />;
            }
            
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isTodayDate = isToday(date);
            const isSelected = selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const hasSlots = hasAvailableSlots(date);
            
            return (
              <button
                key={index}
                onClick={() => handleDateClick(date)}
                className={`
                  h-10 text-sm rounded transition-colors relative
                  ${!isCurrentMonth ? 'text-text-secondary opacity-50' : 'text-text-primary'}
                  ${isTodayDate ? 'bg-primary text-white font-semibold' : ''}
                  ${isSelected && !isTodayDate ? 'bg-blue-100 text-primary' : ''}
                  ${hasSlots && !isTodayDate && !isSelected ? 'hover:bg-blue-50' : ''}
                  ${!hasSlots && !isTodayDate ? 'hover:bg-gray-50' : ''}
                `}
              >
                {format(date, 'd')}
                {hasSlots && !isTodayDate && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-accent rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Available Time Slots */}
        {selectedDate && (
          <div className="border-t pt-6">
            <h4 className="text-sm font-semibold text-text-primary mb-4">
              Available Times - {format(selectedDate, 'MMMM do, yyyy')}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {getAvailableSlotsForDate(selectedDate).map((slot, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="p-3 border-primary text-primary hover:bg-blue-50 transition-colors text-sm h-auto flex flex-col"
                  onClick={() => handleSlotClick(selectedDate, slot)}
                >
                  <span className="font-medium">{slot.time}</span>
                  <span className="text-xs text-text-secondary">{slot.consultant}</span>
                </Button>
              ))}
              
              {getAvailableSlotsForDate(selectedDate).length === 0 && (
                <div className="col-span-full text-center text-text-secondary py-8">
                  No available time slots for this date
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
