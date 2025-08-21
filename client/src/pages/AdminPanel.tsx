import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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
  UserCheck,
  Activity,
  Award,
  Target,
  Star,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Bell,
  Shield,
  Database,
  Globe,
  Zap,
  Eye,
  MessageSquare,
  FileText,
  CreditCard
} from 'lucide-react';
import { apiRequest } from '@/lib/utils';
import { format } from 'date-fns';
import { Link } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Navigation from '@/components/layout/Navigation';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: adminData, isLoading, error } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    queryFn: async () => {
      try {
        // Get basic admin dashboard data
        const res = await apiRequest('/api/admin/dashboard', 'GET');
        const overview = await res.json();
        
        // Fetch recent evaluations/logs
        let evaluations: any[] = [];
        try {
          const evRes = await apiRequest('/api/admin/evaluations', 'GET');
          const evJson = await evRes.json();
          evaluations = evJson.items || [];
        } catch {}
        
        return { overview, evaluations } as any;
      } catch (error) {
        console.error('Admin dashboard query error:', error);
        // Return fallback data instead of undefined
        return {
          overview: {
            totalStudents: 0,
            activeStudents: 0,
            totalConsultants: 0,
            activeConsultants: 0,
            totalSessions: 0,
            sessionsThisWeek: 0,
            systemUptime: 98.5
          },
          evaluations: []
        };
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: pending } = useQuery({
    queryKey: ['/api/admin/certificates/pending'],
    queryFn: async () => {
      try {
        const res = await apiRequest('/api/admin/certificates/pending', 'GET');
        const json = await res.json();
        return json.items || [];
      } catch (error) {
        console.error('Pending certificates query error:', error);
        return [] as any[];
      }
    },
    retry: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | number | null>(null);
  const [actioningId, setActioningId] = useState<string | number | null>(null);

  const previewItem = async (id: string | number) => {
    try {
      setPreviewingId(id);
      // New global preview endpoint returns a PDF buffer
      const res = await apiRequest('/api/admin/certificates/preview', 'GET');
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/pdf')) {
        const blob = await res.blob();
        setPreviewUrl(URL.createObjectURL(blob));
      } else {
        const json = await res.json();
        setPreviewUrl(json.url || json.preview?.url || null);
      }
    } catch (e: any) {
      toast({ title: 'Preview failed', description: e?.message || '', variant: 'destructive' });
    } finally {
      setPreviewingId(null);
    }
  };

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
      monthlyRevenue: 28940,
      systemHealth: 98.5,
      activeUsers: 67
    },
    recentActivities: [
      { 
        id: 1, 
        type: 'certification', 
        message: 'John Doe completed EMDR certification', 
        timestamp: new Date(),
        user: 'John Doe',
        userImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        priority: 'high'
      },
      { 
        id: 2, 
        type: 'session', 
        message: 'New session scheduled between Sarah Wilson and Dr. Chen', 
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        user: 'Sarah Wilson',
        userImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        priority: 'medium'
      },
      { 
        id: 3, 
        type: 'consultant', 
        message: 'Dr. Michael Torres updated availability', 
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        user: 'Dr. Michael Torres',
        userImage: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face',
        priority: 'low'
      },
      { 
        id: 4, 
        type: 'payment', 
        message: 'Payment processed for consultation #1234', 
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        user: 'System',
        userImage: null,
        priority: 'medium'
      },
    ],
    pendingApprovals: [
      { 
        id: 1, 
        type: 'consultant', 
        name: 'Dr. Lisa Rodriguez', 
        item: 'Application Review', 
        priority: 'high',
        submittedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        userImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face'
      },
      { 
        id: 2, 
        type: 'certification', 
        name: 'Mike Johnson', 
        item: 'Final Certification', 
        priority: 'medium',
        submittedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        userImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
      },
      { 
        id: 3, 
        type: 'session', 
        name: 'Session #5678', 
        item: 'Dispute Resolution', 
        priority: 'low',
        submittedDate: new Date(Date.now() - 12 * 60 * 60 * 1000),
        userImage: null
      },
    ],
    monthlyStats: {
      newStudents: 23,
      completedCertifications: 12,
      averageSessionRating: 4.8,
      consultantUtilization: 76,
      systemUptime: 99.9,
      activeSessions: 15,
      pendingReviews: 8,
      revenueGrowth: 12.5
    },
    systemMetrics: {
      cpuUsage: 45,
      memoryUsage: 62,
      diskUsage: 78,
      networkTraffic: 34,
      activeConnections: 156,
      errorRate: 0.02
    },
    quickActions: [
      { id: 1, title: "Add Consultant", icon: UserCheck, color: "bg-blue-500", action: "add-consultant" },
      { id: 2, title: "System Settings", icon: Settings, color: "bg-purple-500", action: "settings" },
      { id: 3, title: "View Reports", icon: BarChart3, color: "bg-green-500", action: "reports" },
      { id: 4, title: "Support Tickets", icon: MessageSquare, color: "bg-orange-500", action: "support" }
    ],
    evaluations: []
  };

  // Transform API response to match expected structure with safe fallbacks
  const data = (adminData && adminData.overview) ? {
    overview: {
      totalStudents: adminData.overview?.totalStudents || 0,
      activeStudents: adminData.overview?.activeStudents || 0,
      totalConsultants: adminData.overview?.totalConsultants || 0,
      activeConsultants: adminData.overview?.activeConsultants || 0,
      totalSessions: adminData.overview?.totalSessions || 0,
      completedSessions: adminData.overview?.sessionsThisWeek || 0,
      totalRevenue: 284650, // Mock data for now
      monthlyRevenue: 28940, // Mock data for now
      systemHealth: adminData.overview?.systemUptime || 98.5,
      activeUsers: (adminData.overview?.activeStudents || 0) + (adminData.overview?.activeConsultants || 0)
    },
    evaluations: adminData.evaluations || [],
    recentActivities: mockAdminData.recentActivities,
    pendingApprovals: mockAdminData.pendingApprovals,
    monthlyStats: mockAdminData.monthlyStats,
    systemMetrics: mockAdminData.systemMetrics,
    quickActions: mockAdminData.quickActions
  } : mockAdminData;
  const pendingApprovals = (pending as any[])?.length ? pending : mockAdminData.pendingApprovals;

  const handleApproval = async (id: string | number, approved: boolean) => {
    try {
      setActioningId(id);
      if (approved) {
        await apiRequest('/api/admin/certificates/' + id + '/approve', 'POST');
        toast({ title: 'Issued', description: 'Certificate approved and issued.' });
      } else {
        await apiRequest('/api/admin/certificates/' + id + '/revoke', 'POST');
        toast({ title: 'Revoked', description: 'Certificate revoked.' });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/admin/certificates/pending'] });
    } catch (e: any) {
      toast({ title: 'Action failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setActioningId(null);
    }
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
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="text-sm text-red-700">
                    <strong>Error loading dashboard:</strong> {error.message}
                    <button 
                      onClick={() => window.location.reload()} 
                      className="ml-2 underline"
                    >
                      Refresh page
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
            
            {/* Content Skeleton */}
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">
              System overview and management for BrainBased EMDR Platform
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open('/api/admin/exports/student-progress.csv', '_blank')}>
              <FileText className="h-4 w-4 mr-2" /> Export Student Progress
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open('/api/admin/exports/consultant-earnings.csv', '_blank')}>
              <FileText className="h-4 w-4 mr-2" /> Export Consultant Earnings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const studentId = prompt('Enter studentId to generate certificate');
                if (!studentId) return;
                try {
                  const res = await apiRequest(`/api/admin/certificates/${studentId}/generate`, 'POST');
                  const json = await res.json();
                  if (json.success) {
                    toast({ title: 'Certificate generated', description: json.certificate.certificateNumber });
                  } else {
                    toast({ title: 'Failed to generate certificate', description: json.message || 'Error', variant: 'destructive' });
                  }
                } catch (e: any) {
                  toast({ title: 'Error', description: e.message, variant: 'destructive' });
                }
              }}
            >
              <FileText className="h-4 w-4 mr-2" /> Generate Certificate
            </Button>
          </div>
        </div>

        {/* Stats Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Users</p>
                  <p className="text-2xl font-bold">{data.overview.totalStudents + data.overview.totalConsultants}</p>
                  <p className="text-blue-100 text-sm">{data.overview.activeUsers} active now</p>
                </div>
                <Users className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Sessions</p>
                  <p className="text-2xl font-bold">{data.overview.totalSessions}</p>
                  <p className="text-blue-100 text-sm">{data.overview.completedSessions} completed</p>
                </div>
                <Calendar className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Revenue</p>
                  <p className="text-2xl font-bold">${(data.overview.totalRevenue / 1000).toFixed(0)}k</p>
                  <p className="text-purple-100 text-sm">${data.overview.monthlyRevenue} this month</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">System Health</p>
                  <p className="text-2xl font-bold">{data.overview.systemHealth}%</p>
                  <p className="text-blue-100 text-sm">All systems operational</p>
                </div>
                <Shield className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} defaultValue="overview" onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg font-semibold">
                    <Zap className="h-5 w-5 mr-2 text-blue-600" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.quickActions.map((action: any) => (
                    <Button 
                      key={action.id} 
                      variant="ghost" 
                      className="w-full justify-start h-12 hover:bg-gray-50"
                      onClick={() => {
                        toast({
                          title: action.title,
                          description: `${action.title} functionality would be implemented here.`,
                        });
                      }}
                    >
                      <div className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center mr-3`}>
                        <action.icon className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium">{action.title}</span>
                      <ChevronRight className="h-4 w-4 ml-auto text-gray-400" />
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Monthly Stats */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg font-semibold">
                    <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                    Monthly Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{data.monthlyStats.newStudents}</div>
                      <div className="text-xs text-gray-600">New Students</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">{data.monthlyStats.completedCertifications}</div>
                      <div className="text-xs text-gray-600">Certifications</div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Consultant Utilization</span>
                      <span className="text-sm text-gray-600">{data.monthlyStats.consultantUtilization}%</span>
                    </div>
                    <Progress value={data.monthlyStats.consultantUtilization} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Revenue Growth</span>
                    <span className="font-medium text-green-600">+{data.monthlyStats.revenueGrowth}%</span>
                  </div>
                </CardContent>
              </Card>

              {/* System Metrics */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg font-semibold">
                    <Database className="h-5 w-5 mr-2 text-purple-600" />
                    System Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">CPU Usage</span>
                      <span className="text-sm text-gray-600">{data.systemMetrics.cpuUsage}%</span>
                    </div>
                    <Progress value={data.systemMetrics.cpuUsage} className="h-2" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Memory Usage</span>
                      <span className="text-sm text-gray-600">{data.systemMetrics.memoryUsage}%</span>
                    </div>
                    <Progress value={data.systemMetrics.memoryUsage} className="h-2" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Disk Usage</span>
                      <span className="text-sm text-gray-600">{data.systemMetrics.diskUsage}%</span>
                    </div>
                    <Progress value={data.systemMetrics.diskUsage} className="h-2" />
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-blue-600">{data.systemMetrics.activeConnections}</div>
                      <div className="text-xs text-gray-600">Active Connections</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-600">{(data.systemMetrics.errorRate * 100).toFixed(2)}%</div>
                      <div className="text-xs text-gray-600">Error Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Activity className="h-5 w-5 mr-2 text-blue-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {data.recentActivities.map((activity: any) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                        {activity.userImage ? (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={activity.userImage} />
                            <AvatarFallback>
                              {activity.user.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            {getActivityIcon(activity.type)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-semibold text-gray-900">
                              {activity.user}
                            </h4>
                            <Badge className={`text-xs ${getPriorityColor(activity.priority)}`}>
                              {activity.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            {activity.message}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(activity.timestamp, 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approvals" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  Pending Approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-500">Students who reached 40+ hours and are not yet issued</div>
                  <div className="flex gap-2">
                    <a href="/api/admin/certificates/export" className="text-sm px-3 py-2 border rounded hover:bg-gray-50">Export Issued CSV</a>
                  </div>
                </div>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {pendingApprovals.map((approval: any) => (
                      <div key={approval.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                        {approval.user?.email ? (
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(approval.user.first_name + ' ' + approval.user.last_name)}`} />
                            <AvatarFallback>
                              {`${approval.user.first_name?.[0] || ''}${approval.user.last_name?.[0] || ''}`}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <FileText className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-semibold text-gray-900">
                              {approval.user?.first_name} {approval.user?.last_name}
                            </h4>
                            <Badge className="text-xs bg-blue-100 text-blue-700">
                              {approval.total_verified_hours} hrs
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            {approval.user?.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            Updated {format(new Date(approval.updated_at || Date.now()), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled={previewingId === approval.id}
                            onClick={() => previewItem(approval.id)}
                          >
                            Preview
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleApproval(approval.id, true)}
                            disabled={actioningId === approval.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve & Issue
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleApproval(approval.id, false)}
                            disabled={actioningId === approval.id}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <Dialog open={!!previewUrl} onOpenChange={(open)=> !open && setPreviewUrl(null)}>
            <DialogContent className="max-w-5xl">
              <DialogHeader>
                <DialogTitle>Certificate Preview</DialogTitle>
              </DialogHeader>
              {previewUrl ? (
                <iframe src={previewUrl} className="w-full h-[70vh]" />
              ) : (
                <div className="p-6">Generating preview…</div>
              )}
            </DialogContent>
          </Dialog>

          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Health */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg font-semibold">
                    <Shield className="h-5 w-5 mr-2 text-green-600" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">{data.overview.systemHealth}%</div>
                    <p className="text-gray-600">System Uptime</p>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Active Sessions</span>
                      <span className="text-sm text-gray-600">{data.monthlyStats.activeSessions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Pending Reviews</span>
                      <span className="text-sm text-gray-600">{data.monthlyStats.pendingReviews}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Network Traffic</span>
                      <span className="text-sm text-gray-600">{data.systemMetrics.networkTraffic} GB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Platform Overview */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg font-semibold">
                    <Globe className="h-5 w-5 mr-2 text-blue-600" />
                    Platform Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Certificate Designer</div>
                      <div className="text-sm text-gray-600">Manage template, colors, text, and assets</div>
                    </div>
                    <Link href="/admin/certificates/designer"><Button size="sm">Open Designer</Button></Link>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{data.overview.totalStudents}</div>
                      <div className="text-xs text-gray-600">Students</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">{data.overview.totalConsultants}</div>
                      <div className="text-xs text-gray-600">Consultants</div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Active Students</span>
                      <span className="text-sm text-gray-600">{data.overview.activeStudents}</span>
                    </div>
                    <Progress value={(data.overview.activeStudents / data.overview.totalStudents) * 100} className="h-2" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Active Consultants</span>
                      <span className="text-sm text-gray-600">{data.overview.activeConsultants}</span>
                    </div>
                    <Progress value={(data.overview.activeConsultants / data.overview.totalConsultants) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="evaluations" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg font-semibold">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Recent Evaluations & Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Student</th>
                      <th className="py-2 pr-3">Consultant</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Score</th>
                      <th className="py-2 pr-3">Reflection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.evaluations || []).slice(0, 25).map((item: any) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 pr-3">{new Date(item.date).toLocaleString()}</td>
                        <td className="py-2 pr-3">{item.studentName}</td>
                        <td className="py-2 pr-3">{item.consultantName}</td>
                        <td className="py-2 pr-3">{item.type}</td>
                        <td className="py-2 pr-3">{item.status}</td>
                        <td className="py-2 pr-3">{item.evaluationScore ?? '-'}</td>
                        <td className="py-2 pr-3 max-w-[400px] truncate" title={item.reflection || ''}>{item.reflection || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}