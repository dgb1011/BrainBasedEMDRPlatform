import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  Calendar, 
  Clock, 
  User,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';

interface SessionCardProps {
  session: {
    id: string;
    consultantName: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    status: string;
    sessionType?: string;
  };
  onJoin: (sessionId: string) => void;
  onReschedule: (sessionId: string) => void;
}

export default function SessionCard({ session, onJoin, onReschedule }: SessionCardProps) {
  const isUpcoming = new Date(session.scheduledStart) > new Date();
  const isToday = format(new Date(session.scheduledStart), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const canJoin = isToday && isUpcoming && session.status === 'scheduled';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSessionTypeColor = (type?: string) => {
    switch (type) {
      case 'consultation':
        return 'bg-purple-100 text-purple-800';
      case 'practice':
        return 'bg-orange-100 text-orange-800';
      case 'evaluation':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getStatusColor(session.status)}>
                {session.status.replace('_', ' ').toUpperCase()}
              </Badge>
              {session.sessionType && (
                <Badge variant="outline" className={getSessionTypeColor(session.sessionType)}>
                  {session.sessionType.toUpperCase()}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-2" />
                <span className="font-medium">{session.consultantName}</span>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                <span>{format(new Date(session.scheduledStart), 'EEEE, MMMM d, yyyy')}</span>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                <span>
                  {format(new Date(session.scheduledStart), 'h:mm a')} - {format(new Date(session.scheduledEnd), 'h:mm a')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 ml-4">
            {canJoin && (
              <Button 
                onClick={() => onJoin(session.id)}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <Video className="h-4 w-4 mr-2" />
                Join
              </Button>
            )}
            
            {isUpcoming && session.status === 'scheduled' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onReschedule(session.id)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Reschedule
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}