import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  GraduationCap, 
  Calendar, 
  BarChart3, 
  Settings,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  UserCheck
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: adminData, isLoading } = useQuery({
    queryKey: ['/api/admin/dashboard'],
  });

  // Mock data for demonstration
  const mockAdminData = {
    overview: {
      totalStudents: 127,
      activeStudents: 89,
      totalConsultants: 24,
      activeConsultants: 18,
      totalSessions: 2456,
      completedSessions: 2234,
      totalRevenue: 284650,
      monthlyRevenue: 28940
    },
    recentActivities: [
      { id: 1, type: 'certification', message: 'John Doe completed EMDR certification', timestamp: new Date() },
      { id: 2, type: 'session', message: 'New session scheduled between Sarah Wilson and Dr. Chen', timestamp: new Date() },
      { id: 3, type: 'consultant', message: 'Dr. Michael Torres updated availability', timestamp: new Date() },
      { id: 4, type: 'payment', message: 'Payment processed for consultation #1234', timestamp: new Date() },
    ],
    pendingApprovals: [
      { id: 1, type: 'consultant', name: 'Dr. Lisa Rodriguez', item: 'Application Review', priority: 'high' },
      { id: 2, type: 'certification', name: 'Mike Johnson', item: 'Final Certification', priority: 'medium' },
      { id: 3, type: 'session', name: 'Session #5678', item: 'Dispute Resolution', priority: 'low' },
    ],
    monthlyStats: {
      newStudents: 23,
      completedCertifications: 12,
      averageSessionRating: 4.8,
      consultantUtilization: 76
    }
  };

  const data = adminData || mockAdminData;

  const handleApproval = (id: number, approved: boolean) => {
    toast({
      title: approved ? "Approved" : "Rejected",
      description: `Item has been ${approved ? 'approved' : 'rejected'} successfully.`,
    });
    // In real app, this would call an API
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'certification':
        return <GraduationCap className="h-4 w-4 text-green-600" />;
      case 'session':
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'consultant':
        return <UserCheck className="h-4 w-4 text-purple-600" />;
      case 'payment':
        return <DollarSign className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage your EMDR certification platform operations.</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{data.overview.totalStudents}</p>
                <p className="text-xs text-green-600">+{data.monthlyStats.newStudents} this month</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Consultants</p>
                <p className="text-2xl font-bold text-gray-900">{data.overview.activeConsultants}</p>
                <p className="text-xs text-gray-500">of {data.overview.totalConsultants} total</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{data.overview.totalSessions}</p>
                <p className="text-xs text-gray-500">{data.overview.completedSessions} completed</p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${data.overview.monthlyRevenue.toLocaleString()}</p>
                <p className="text-xs text-green-600">+12% vs last month</p>
              </div>
              <div className="bg-orange-100 rounded-full p-3">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="consultants">Consultants</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                  Recent Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                        <p className="text-xs text-gray-500">{format(activity.timestamp, 'MMM d, h:mm a')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pending Approvals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                  Pending Approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.pendingApprovals.map((approval) => (
                    <div key={approval.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">{approval.name}</p>
                          <Badge className={getPriorityColor(approval.priority)}>
                            {approval.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">{approval.item}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleApproval(approval.id, false)}
                        >
                          Reject
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleApproval(approval.id, true)}
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Active Students</h3>
                  <p className="text-2xl font-bold text-blue-800">{data.overview.activeStudents}</p>
                </div>
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <GraduationCap className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <h3 className="font-semibold text-green-900">Certifications</h3>
                  <p className="text-2xl font-bold text-green-800">{data.monthlyStats.completedCertifications}</p>
                </div>
                <div className="text-center p-6 bg-purple-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <h3 className="font-semibold text-purple-900">Progress Rate</h3>
                  <p className="text-2xl font-bold text-purple-800">87%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultants" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Consultant Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <UserCheck className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Active Consultants</h3>
                  <p className="text-2xl font-bold text-blue-800">{data.overview.activeConsultants}</p>
                </div>
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <h3 className="font-semibold text-green-900">Utilization</h3>
                  <p className="text-2xl font-bold text-green-800">{data.monthlyStats.consultantUtilization}%</p>
                </div>
                <div className="text-center p-6 bg-orange-50 rounded-lg">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <h3 className="font-semibold text-orange-900">Avg Rating</h3>
                  <p className="text-2xl font-bold text-orange-800">{data.monthlyStats.averageSessionRating}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-900">Session Completion Rate</h4>
                  <p className="text-2xl font-bold text-green-600">94%</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-900">Average Session Duration</h4>
                  <p className="text-2xl font-bold text-blue-600">58min</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-900">Student Satisfaction</h4>
                  <p className="text-2xl font-bold text-purple-600">4.7/5</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-900">Platform Uptime</h4>
                  <p className="text-2xl font-bold text-orange-600">99.9%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}