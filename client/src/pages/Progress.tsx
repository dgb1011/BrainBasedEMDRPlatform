import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import ProgressCircle from '@/components/ProgressCircle';
import { ArrowLeft, Calendar, Clock, CheckCircle, TrendingUp, Award } from 'lucide-react';

export default function ProgressPage() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['/api/students/dashboard'],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-24 bg-gray-200 rounded-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { progress } = dashboardData || {};

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-primary">Certification Progress</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Overall Progress */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>EMDR Certification Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              <div className="text-center">
                <ProgressCircle 
                  progress={progress?.completionPercentage || 0} 
                  size={160} 
                  strokeWidth={12}
                  className="mb-4"
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold text-text-primary">
                      {Math.round(progress?.completedHours || 0)}
                    </div>
                    <div className="text-sm text-text-secondary">of 40 hours</div>
                  </div>
                </ProgressCircle>
                <p className="text-lg font-semibold text-text-primary">
                  {Math.round(progress?.completionPercentage || 0)}% Complete
                </p>
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">Progress Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircle className="text-primary h-5 w-5 mr-2" />
                        <span className="text-sm font-medium text-text-primary">Hours Completed</span>
                      </div>
                      <p className="text-2xl font-bold text-primary mt-1">
                        {Math.round(progress?.completedHours || 0)}
                      </p>
                    </div>
                    
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <Clock className="text-accent h-5 w-5 mr-2" />
                        <span className="text-sm font-medium text-text-primary">Hours Remaining</span>
                      </div>
                      <p className="text-2xl font-bold text-accent mt-1">
                        {progress?.remainingHours || 40}
                      </p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <Calendar className="text-secondary h-5 w-5 mr-2" />
                        <span className="text-sm font-medium text-text-primary">Sessions This Month</span>
                      </div>
                      <p className="text-2xl font-bold text-secondary mt-1">
                        {progress?.sessionsThisMonth || 0}
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <TrendingUp className="text-purple-600 h-5 w-5 mr-2" />
                        <span className="text-sm font-medium text-text-primary">Est. Completion</span>
                      </div>
                      <p className="text-lg font-bold text-purple-600 mt-1">
                        March 2024
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Certification Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { hours: 10, title: 'Basic Foundations', description: 'Understanding EMDR principles and protocols', completed: (progress?.completedHours || 0) >= 10 },
                { hours: 20, title: 'Clinical Application', description: 'Applying EMDR techniques with supervision', completed: (progress?.completedHours || 0) >= 20 },
                { hours: 30, title: 'Advanced Practice', description: 'Complex cases and specialized populations', completed: (progress?.completedHours || 0) >= 30 },
                { hours: 40, title: 'Certification Complete', description: 'Ready for independent EMDR practice', completed: (progress?.completedHours || 0) >= 40 }
              ].map((milestone, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    milestone.completed 
                      ? 'bg-secondary text-white' 
                      : (progress?.completedHours || 0) >= milestone.hours - 5
                        ? 'bg-accent text-white'
                        : 'bg-gray-200 text-text-secondary'
                  }`}>
                    {milestone.completed ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-medium">{milestone.hours}</span>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`font-medium ${
                        milestone.completed ? 'text-secondary' : 'text-text-primary'
                      }`}>
                        {milestone.title}
                      </h4>
                      <span className="text-sm text-text-secondary">
                        {milestone.hours} hours
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mb-2">
                      {milestone.description}
                    </p>
                    
                    {!milestone.completed && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary rounded-full h-2 transition-all duration-300"
                          style={{ 
                            width: `${Math.min(
                              ((progress?.completedHours || 0) / milestone.hours) * 100, 
                              100
                            )}%` 
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Learning Path */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Recommended Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div>
                  <h4 className="font-medium text-text-primary">Schedule Regular Sessions</h4>
                  <p className="text-sm text-text-secondary">Book 2-3 consultation sessions per month to maintain steady progress</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-accent rounded-full mt-2"></div>
                <div>
                  <h4 className="font-medium text-text-primary">Review Case Studies</h4>
                  <p className="text-sm text-text-secondary">Prepare diverse case examples for consultation discussions</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-secondary rounded-full mt-2"></div>
                <div>
                  <h4 className="font-medium text-text-primary">Complete Documentation</h4>
                  <p className="text-sm text-text-secondary">Submit required forms and reflection papers promptly</p>
                </div>
              </div>
              
              <Link href="/schedule">
                <Button className="w-full mt-4">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Next Session
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2 text-primary" />
                Certification Benefits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-secondary" />
                <span className="text-sm text-text-primary">Professional EMDR certification</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-secondary" />
                <span className="text-sm text-text-primary">Expanded clinical competencies</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-secondary" />
                <span className="text-sm text-text-primary">Enhanced career opportunities</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-secondary" />
                <span className="text-sm text-text-primary">Continuing education credits</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-secondary" />
                <span className="text-sm text-text-primary">Professional network access</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}