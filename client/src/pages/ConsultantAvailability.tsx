import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default function ConsultantAvailability() {
  const { toast } = useToast();
  const { data, refetch } = useQuery({
    queryKey: ['/api/consultants/availability'],
    queryFn: async () => {
      const res = await apiRequest('/api/consultants/availability', 'GET');
      return await res.json();
    }
  });

  const [timezone, setTimezone] = useState('UTC');
  const [weekly, setWeekly] = useState<Record<number, { startTime: string; endTime: string; isAvailable: boolean; maxSessions?: number }[]>>({});
  const [blocked, setBlocked] = useState<string[]>([]);

  useEffect(() => {
    if (!data) return;
    setTimezone(data.preferences?.timezone || 'UTC');
    const grouped: Record<number, any[]> = {};
    (data.availability || []).forEach((s: any) => {
      const day = s.day_of_week;
      grouped[day] = grouped[day] || [];
      grouped[day].push({ startTime: s.start_time, endTime: s.end_time, isAvailable: s.is_available, maxSessions: s.max_sessions });
    });
    setWeekly(grouped);
    setBlocked((data.blockedDates || []).map((b: any) => b.blocked_date));
  }, [data]);

  const handleAddSlot = (day: number) => {
    setWeekly(prev => ({ ...prev, [day]: [...(prev[day] || []), { startTime: '09:00', endTime: '10:00', isAvailable: true }] }));
  };

  const handleSave = async () => {
    try {
      await apiRequest('/api/consultants/availability', 'POST', { weeklySchedule: weekly, timezone });
      await apiRequest('/api/consultants/blocked-dates', 'POST', { dates: blocked });
      toast({ title: 'Availability saved' });
      refetch();
    } catch (e: any) {
      toast({ title: 'Failed to save', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle>Consultant Availability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-64">
              <label className="text-sm text-gray-600">Timezone</label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">America/New_York</SelectItem>
                  <SelectItem value="America/Chicago">America/Chicago</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                  <SelectItem value="Europe/London">Europe/London</SelectItem>
                  <SelectItem value="Europe/Berlin">Europe/Berlin</SelectItem>
                  <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1" />
            <Button onClick={handleSave}>Save</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {DAYS.map((day, idx) => (
              <Card key={day} className="border">
                <CardHeader>
                  <CardTitle className="text-base">{day}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(weekly[idx] || []).map((slot, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 items-center">
                      <Input value={slot.startTime} onChange={e => {
                        const val = e.target.value;
                        setWeekly(prev => ({ ...prev, [idx]: prev[idx].map((s, si) => si===i ? { ...s, startTime: val } : s) }));
                      }} />
                      <Input value={slot.endTime} onChange={e => {
                        const val = e.target.value;
                        setWeekly(prev => ({ ...prev, [idx]: prev[idx].map((s, si) => si===i ? { ...s, endTime: val } : s) }));
                      }} />
                      <Button variant="outline" onClick={() => setWeekly(prev => ({ ...prev, [idx]: prev[idx].filter((_, si) => si !== i) }))}>Remove</Button>
                    </div>
                  ))}
                  <Button variant="ghost" onClick={() => handleAddSlot(idx)}>+ Add slot</Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <label className="text-sm text-gray-600">Blocked Dates (YYYY-MM-DD, comma separated)</label>
            <Input value={blocked.join(',')} onChange={e => setBlocked(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}







