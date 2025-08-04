import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Users, 
  UserCheck, 
  DollarSign, 
  Award, 
  Calendar, 
  Settings, 
  Mail, 
  Download,
  TrendingUp,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: adminData, isLoading } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    retry: false,
  });

  const { data: students } = useQuery({
    queryKey: ['/api/admin/students'],
    retry: false,
  });

  const { data: consultants } = useQuery({
    queryKey: ['/api/admin/consultants'],
    retry: false,
  });

  const { data: sessions } = useQuery({
    queryKey: ['/api/admin/sessions'],
    retry: false,
  });

  const approveCertificationMutation = useMutation({
    mutationFn: async (studentId: string) => {
      await apiRequest(`/api/admin/certifications/${studentId}/approve`, 'POST');
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Certification approved and sent to student",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/students'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve certification",
        variant: "destructive",
      });
    },
  });

  const payConsultantMutation = useMutation({
    mutationFn: async ({ consultantId, amount }: { consultantId: string; amount: number }) => {
      await apiRequest(`/api/admin/payments/consultants/${consultantId}`, 'POST', { amount });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment processed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/consultants'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-24 bg-gray-200 rounded-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const studentsData = students || [];
  const consultantsData = consultants || [];
  const sessionsData = sessions || [];

  const pendingCertifications = studentsData.filter((s: any) => 
    parseFloat(s.totalVerifiedHours) >= 40 && s.certificationStatus === 'in_progress'
  );

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary">Admin Panel</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="consultants">Consultants</TabsTrigger>
            <TabsTrigger value="certifications">Certifications</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="bg-primary bg-opacity-10 rounded-full p-3">
                      <Users className="text-primary h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-2xl font-bold text-text-primary">
                        {adminData?.activeStudents || studentsData.length}
                      </h3>
                      <p className="text-text-secondary">Active Students</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="bg-accent bg-opacity-10 rounded-full p-3">
                      <UserCheck className="text-accent h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-2xl font-bold text-text-primary">
                        {consultantsData.length}
                      </h3>
                      <p className="text-text-secondary">Consultants</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="bg-secondary bg-opacity-10 rounded-full p-3">
                      <Calendar className="text-secondary h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-2xl font-bold text-text-primary">
                        {adminData?.sessionsThisWeek || sessionsData.length}
                      </h3>
                      <p className="text-text-secondary">Sessions This Week</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="bg-purple-100 rounded-full p-3">
                      <DollarSign className="text-purple-600 h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-2xl font-bold text-text-primary">
                        $12,450
                      </h3>
                      <p className="text-text-secondary">Revenue This Month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Recent Registrations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {studentsData.slice(0, 5).map((student: any) => (
                    <div key={student.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={student.user?.profileImageUrl || '/default-avatar.png'}
                          alt="Student"
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <p className="font-medium text-text-primary">
                            {student.user?.firstName} {student.user?.lastName}
                          </p>
                          <p className="text-sm text-text-secondary">
                            {format(new Date(student.createdAt), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">New</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Pending Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-text-primary">
                          {pendingCertifications.length} Certifications to Review
                        </p>
                        <p className="text-sm text-text-secondary">
                          Ready for approval
                        </p>
                      </div>
                    </div>
                    <Link href="/admin?tab=certifications">
                      <Button variant="outline" size="sm">Review</Button>
                    </Link>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-text-primary">
                          Consultant Payments Due
                        </p>
                        <p className="text-sm text-text-secondary">
                          Monthly compensation
                        </p>
                      </div>
                    </div>
                    <Link href="/admin?tab=payments">
                      <Button variant="outline" size="sm">Process</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Student Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {studentsData.map((student: any) => (
                    <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <img
                          src={student.user?.profileImageUrl || '/default-avatar.png'}
                          alt="Student"
                          className="w-12 h-12 rounded-full"
                        />
                        <div>
                          <h4 className="font-semibold text-text-primary">
                            {student.user?.firstName} {student.user?.lastName}
                          </h4>
                          <p className="text-sm text-text-secondary">
                            {student.user?.email}
                          </p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-text-secondary">
                              {student.totalVerifiedHours} hours completed
                            </span>
                            <Badge className={
                              student.certificationStatus === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : student.certificationStatus === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }>
                              {student.certificationStatus}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Mail className="h-4 w-4 mr-1" />
                          Email
                        </Button>
                        <Button variant="outline" size="sm">
                          View Profile
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certifications Tab */}
          <TabsContent value="certifications" className="space-y-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Pending Certifications ({pendingCertifications.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingCertifications.length > 0 ? (
                  <div className="space-y-4">
                    {pendingCertifications.map((student: any) => (
                      <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <img
                            src={student.user?.profileImageUrl || '/default-avatar.png'}
                            alt="Student"
                            className="w-12 h-12 rounded-full"
                          />
                          <div>
                            <h4 className="font-semibold text-text-primary">
                              {student.user?.firstName} {student.user?.lastName}
                            </h4>
                            <p className="text-sm text-text-secondary">
                              {student.totalVerifiedHours} hours completed
                            </p>
                            <p className="text-xs text-secondary font-medium">
                              Ready for certification
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            onClick={() => approveCertificationMutation.mutate(student.id)}
                            disabled={approveCertificationMutation.isPending}
                            className="bg-secondary hover:bg-green-700 text-white"
                          >
                            <Award className="h-4 w-4 mr-2" />
                            Approve Certification
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <h3 className="text-lg font-medium text-text-primary mb-2">
                      All caught up!
                    </h3>
                    <p className="text-text-secondary">
                      No pending certifications to review at this time.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Consultant Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {consultantsData.map((consultant: any) => (
                    <div key={consultant.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <img
                          src={consultant.user?.profileImageUrl || '/default-avatar.png'}
                          alt="Consultant"
                          className="w-12 h-12 rounded-full"
                        />
                        <div>
                          <h4 className="font-semibold text-text-primary">
                            {consultant.user?.firstName} {consultant.user?.lastName}
                          </h4>
                          <p className="text-sm text-text-secondary">
                            {consultant.totalHoursCompleted} hours completed
                          </p>
                          <p className="text-sm font-medium text-secondary">
                            ${consultant.hourlyRate}/hour
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-text-primary">
                          ${(parseFloat(consultant.hourlyRate || '0') * parseFloat(consultant.totalHoursCompleted || '0')).toFixed(2)}
                        </span>
                        <Button 
                          onClick={() => payConsultantMutation.mutate({
                            consultantId: consultant.id,
                            amount: parseFloat(consultant.hourlyRate || '0') * parseFloat(consultant.totalHoursCompleted || '0')
                          })}
                          disabled={payConsultantMutation.isPending}
                          variant="outline"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Pay Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}