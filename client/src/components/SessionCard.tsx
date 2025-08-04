import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, Calendar, Clock, User, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface SessionCardProps {
  session: {
    id: string;
    scheduledStart: string;
    scheduledEnd: string;
    status: string;
    consultant?: {
      user?: {
        firstName?: string;
        lastName?: string;
        profileImageUrl?: string;
      };
      specializations?: string[];
    };
  };
  onJoinSession: (sessionId: string) => void;
  onReschedule?: (sessionId: string) => void;
}

export default function SessionCard({ session, onJoinSession, onReschedule }: SessionCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const canJoin = (status: string, scheduledStart: string) => {
    if (status !== 'scheduled') return false;
    const sessionTime = new Date(scheduledStart);
    const now = new Date();
    const timeDiff = sessionTime.getTime() - now.getTime();
    return timeDiff <= 15 * 60 * 1000 && timeDiff >= -60 * 60 * 1000; // 15 min before to 1 hour after
  };

  const isUpcoming = (status: string, scheduledStart: string) => {
    return status === 'scheduled' && new Date(scheduledStart) > new Date();
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-white hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <img
            src={session.consultant?.user?.profileImageUrl || '/default-avatar.png'}
            alt={`${session.consultant?.user?.firstName} ${session.consultant?.user?.lastName}`}
            className="w-12 h-12 rounded-full object-cover"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="text-lg font-semibold text-text-primary truncate">
              {session.consultant?.user?.firstName} {session.consultant?.user?.lastName}
            </h4>
            <Badge className={getStatusColor(session.status)}>
              {getStatusText(session.status)}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-text-secondary">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {format(new Date(session.scheduledStart), 'MMM dd, yyyy')}
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {format(new Date(session.scheduledStart), 'h:mm a')} - {format(new Date(session.scheduledEnd), 'h:mm a')}
            </div>
          </div>
          
          {session.consultant?.specializations && session.consultant.specializations.length > 0 && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {session.consultant.specializations.slice(0, 2).map((spec, index) => (
                  <span 
                    key={index}
                    className="inline-block px-2 py-1 text-xs bg-gray-100 text-text-secondary rounded"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2 ml-4">
        {canJoin(session.status, session.scheduledStart) && (
          <Button 
            onClick={() => onJoinSession(session.id)}
            className="bg-secondary hover:bg-green-700 text-white"
          >
            <Video className="h-4 w-4 mr-2" />
            Join Session
          </Button>
        )}
        
        {isUpcoming(session.status, session.scheduledStart) && !canJoin(session.status, session.scheduledStart) && onReschedule && (
          <Button 
            variant="outline" 
            onClick={() => onReschedule(session.id)}
          >
            Reschedule
          </Button>
        )}
        
        {session.status === 'completed' && (
          <Button variant="ghost" size="sm">
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}