import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import Navigation from '@/components/layout/Navigation';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  Download, 
  Filter, 
  Calendar, 
  DollarSign, 
  Users, 
  Clock,
  TrendingUp,
  FileText,
  Eye,
  RefreshCw,
  Search,
  ChevronDown
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  consultantId?: string;
  studentId?: string;
  status?: string;
}

interface ConsultantEarnings {
  consultantId: string;
  consultantName: string;
  totalHours: number;
  totalEarnings: number;
  sessionCount: number;
  averageRating: number;
  monthlyBreakdown: {
    month: string;
    hours: number;
    earnings: number;
    sessions: number;
  }[];
}

interface StudentProgress {
  studentId: string;
  studentName: string;
  totalHours: number;
  completedSessions: number;
  progressPercentage: number;
  certificationStatus: string;
  enrollmentDate: string;
  estimatedCompletion: string;
}

export default function Reports() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('earnings');
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    dateTo: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  // Get consultants for filter dropdown
  const { data: consultantsResp } = useQuery({
    queryKey: ['/api/consultants'],
    queryFn: async () => {
      const res = await apiRequest('/api/consultants', 'GET');
      return await res.json();
    }
  });
  const consultants: any[] = Array.isArray(consultantsResp)
    ? consultantsResp
    : (consultantsResp?.consultants || []);

  // Get students for filter dropdown
  const { data: studentsResp } = useQuery({
    queryKey: ['/api/students'],
    queryFn: async () => {
      try {
        const res = await apiRequest('/api/students', 'GET');
        return await res.json();
      } catch {
        return [];
      }
    }
  });
  const students: any[] = Array.isArray(studentsResp)
    ? studentsResp
    : (studentsResp?.students || []);

  // Earnings report
  const { data: earningsData, isLoading: earningsLoading, refetch: refetchEarnings } = useQuery({
    queryKey: ['/api/reports/earnings', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const res = await apiRequest(`/api/reports/earnings?${params}`, 'GET');
      return await res.json();
    }
  });

  // Student progress report
  const { data: progressData, isLoading: progressLoading, refetch: refetchProgress } = useQuery({
    queryKey: ['/api/reports/progress', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const res = await apiRequest(`/api/reports/progress?${params}`, 'GET');
      return await res.json();
    }
  });

  // Sessions report
  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['/api/reports/sessions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const res = await apiRequest(`/api/reports/sessions?${params}`, 'GET');
      return await res.json();
    }
  });

  const handleExportCSV = async (reportType: string) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await fetch(`/api/reports/${reportType}/export?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: `${reportType} report has been downloaded.`
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      dateTo: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    });
  };

  const refreshAllReports = () => {
    refetchEarnings();
    refetchProgress();
    refetchSessions();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="h-8 w-8 mr-3 text-blue-600" />
              Advanced Reports
            </h1>
            <p className="text-gray-600">
              Comprehensive analytics and reporting for your EMDR consultation platform
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={refreshAllReports}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <Card className="border-0 shadow-lg mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg font-semibold">
              <Filter className="h-5 w-5 mr-2 text-purple-600" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consultantId">Consultant</Label>
                <select
                  id="consultantId"
                  value={filters.consultantId || ''}
                  onChange={(e) => handleFilterChange('consultantId', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Consultants</option>
                  {(consultants || []).map((consultant: any) => (
                    <option key={consultant.id} value={consultant.id}>
                      {consultant.user?.first_name} {consultant.user?.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={resetFilters}>
                Reset Filters
              </Button>
              <div className="text-sm text-gray-600">
                Showing data from {format(new Date(filters.dateFrom), 'MMM dd, yyyy')} to {format(new Date(filters.dateTo), 'MMM dd, yyyy')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="earnings">Consultant Earnings</TabsTrigger>
            <TabsTrigger value="progress">Student Progress</TabsTrigger>
            <TabsTrigger value="sessions">Session Analytics</TabsTrigger>
          </TabsList>

          {/* Consultant Earnings Report */}
          <TabsContent value="earnings" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Consultant Earnings Report</h2>
              <Button onClick={() => handleExportCSV('earnings')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {earningsLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-200 rounded"></div>
                          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {earningsData?.consultants?.map((consultant: ConsultantEarnings) => (
                  <Card key={consultant.consultantId} className="border-0 shadow-lg">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">{consultant.consultantName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            ${consultant.totalEarnings.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">Total Earnings</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {consultant.totalHours}h
                          </div>
                          <div className="text-sm text-gray-600">Total Hours</div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Sessions:</span>
                          <span className="font-medium">{consultant.sessionCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Avg Rating:</span>
                          <span className="font-medium">{consultant.averageRating}/5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Avg per Hour:</span>
                          <span className="font-medium">
                            ${consultant.totalHours > 0 ? (consultant.totalEarnings / consultant.totalHours).toFixed(0) : '0'}
                          </span>
                        </div>
                      </div>
                      
                      {consultant.monthlyBreakdown?.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="font-medium mb-2">Monthly Breakdown</h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {consultant.monthlyBreakdown.map((month, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span>{month.month}</span>
                                  <span className="font-medium">${month.earnings}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Student Progress Report */}
          <TabsContent value="progress" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Student Progress Report</h2>
              <Button onClick={() => handleExportCSV('progress')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {progressLoading ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="w-20 h-8 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Student Progress Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {progressData?.students?.map((student: StudentProgress) => (
                        <div key={student.studentId} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                            {student.studentName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{student.studentName}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>{student.totalHours}/40 hours</span>
                              <span>•</span>
                              <span>{student.completedSessions} sessions</span>
                              <span>•</span>
                              <span>Enrolled {format(new Date(student.enrollmentDate), 'MMM yyyy')}</span>
                            </div>
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span>Progress</span>
                                <span>{student.progressPercentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${student.progressPercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                          <Badge 
                            variant={student.certificationStatus === 'completed' ? 'default' : 'secondary'}
                            className={
                              student.certificationStatus === 'completed' ? 'bg-green-100 text-green-800' :
                              student.certificationStatus === 'eligible' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {student.certificationStatus}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Session Analytics Report */}
          <TabsContent value="sessions" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Session Analytics</h2>
              <Button onClick={() => handleExportCSV('sessions')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {sessionsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-12 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Total Sessions</p>
                        <p className="text-3xl font-bold">{sessionsData?.summary?.totalSessions || 0}</p>
                      </div>
                      <Calendar className="h-8 w-8 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">Completed</p>
                        <p className="text-3xl font-bold">{sessionsData?.summary?.completedSessions || 0}</p>
                      </div>
                      <Clock className="h-8 w-8 text-green-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-yellow-100 text-sm font-medium">Total Hours</p>
                        <p className="text-3xl font-bold">{sessionsData?.summary?.totalHours || 0}</p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium">Avg Rating</p>
                        <p className="text-3xl font-bold">{sessionsData?.summary?.averageRating || 0}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

