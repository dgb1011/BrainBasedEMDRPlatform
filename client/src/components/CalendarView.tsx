import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Clock
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';

interface AvailableSlot {
  time: string;
  consultant: string;
  consultantId: string;
  available: boolean;
}

interface CalendarViewProps {
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
  onSlotSelect: (date: Date, slot: AvailableSlot) => void;
  availableSlots: Record<string, AvailableSlot[]>;
}

export default function CalendarView({ 
  selectedDate, 
  onDateSelect, 
  onSlotSelect, 
  availableSlots 
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const getDateKey = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  };

  const hasAvailableSlots = (date: Date) => {
    const dateKey = getDateKey(date);
    const slots = availableSlots[dateKey];
    return slots && slots.some(slot => slot.available);
  };

  const getAvailableSlotsForDate = (date: Date) => {
    const dateKey = getDateKey(date);
    return availableSlots[dateKey] || [];
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-primary" />
            Schedule Session
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 font-medium text-gray-500">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {daysInMonth.map(date => {
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const isTodayDate = isToday(date);
            const hasSlots = hasAvailableSlots(date);
            
            return (
              <button
                key={date.toString()}
                onClick={() => onDateSelect(date)}
                className={`
                  p-2 text-sm rounded-lg transition-colors relative
                  ${!isCurrentMonth ? 'text-gray-300' : ''}
                  ${isSelected ? 'bg-blue-600 text-white' : ''}
                  ${isTodayDate && !isSelected ? 'bg-blue-100 text-blue-600 font-medium' : ''}
                  ${hasSlots && !isSelected ? 'bg-green-50 text-green-700 hover:bg-green-100' : ''}
                  ${!hasSlots && !isSelected && !isTodayDate ? 'hover:bg-gray-100' : ''}
                `}
              >
                {format(date, 'd')}
                {hasSlots && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Available slots for selected date */}
        {selectedDate && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">
              Available times for {format(selectedDate, 'EEEE, MMMM d')}
            </h4>
            
            <div className="space-y-2">
              {getAvailableSlotsForDate(selectedDate).length > 0 ? (
                getAvailableSlotsForDate(selectedDate).map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium text-sm">{slot.time}</div>
                        <div className="text-xs text-gray-500">{slot.consultant}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={slot.available ? "default" : "secondary"}
                        className={slot.available ? "bg-green-600" : ""}
                      >
                        {slot.available ? 'Available' : 'Booked'}
                      </Badge>
                      
                      {slot.available && (
                        <Button
                          size="sm"
                          onClick={() => onSlotSelect(selectedDate, slot)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Book
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No available slots for this date</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}