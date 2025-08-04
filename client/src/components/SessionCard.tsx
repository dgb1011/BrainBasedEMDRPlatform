import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Video, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface SessionCardProps {
  session: {
    id: string;
    scheduledStart: string;
    scheduledEnd: string;
    status: string;
    consultant?: {
      user?: {
        firstName: string;
        lastName: string;
        profileImageUrl?: string | null;
      };
      specializations?: string[];
    };
  };
  onJoinSession?: (sessionId: string) => void;
  onReschedule?: (sessionId: string) => void;
}

export default function SessionCard({ session, onJoinSession, onReschedule }: SessionCardProps) {
  const startDate = new Date(session.scheduledStart);
  const endDate = new Date(session.scheduledEnd);
  const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60); // hours
  
  const canJoin = session.status === 'scheduled' && new Date() >= new Date(startDate.getTime() - 15 * 60 * 1000); // 15 minutes before
  
  const consultantName = session.consultant?.user 
    ? `Dr. ${session.consultant.user.firstName} ${session.consultant.user.lastName}`
    : 'Unknown Consultant';

  const initials = session.consultant?.user
    ? `${session.consultant.user.firstName[0]}${session.consultant.user.lastName[0]}`
    : 'UK';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage 
                src={session.consultant?.user?.profileImageUrl || undefined} 
                alt={consultantName}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h4 className="font-medium text-text-primary">{consultantName}</h4>
              <p className="text-sm text-text-secondary">
                {format(startDate, 'MMM dd, yyyy • h:mm a')} - {format(endDate, 'h:mm a')}
              </p>
              <p className="text-xs text-accent font-medium">{duration} hour{duration !== 1 ? 's' : ''}</p>
              {session.consultant?.specializations && session.consultant.specializations.length > 0 && (
                <p className="text-xs text-text-secondary mt-1">
                  {session.consultant.specializations.join(', ')}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            {canJoin ? (
              <Button 
                onClick={() => onJoinSession?.(session.id)}
                className="bg-primary hover:bg-blue-700 text-white"
              >
                <Video className="h-4 w-4 mr-2" />
                Join
              </Button>
            ) : session.status === 'scheduled' ? (
              <Button 
                variant="outline" 
                onClick={() => onReschedule?.(session.id)}
                className="border-primary text-primary hover:bg-blue-50"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Reschedule
              </Button>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary bg-opacity-10 text-secondary">
                {session.status === 'completed' ? 'Completed' : 'Confirmed'}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
