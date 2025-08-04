import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  Video, 
  TrendingUp, 
  Users, 
  Clock, 
  Shield, 
  Award, 
  CheckCircle,
  Zap,
  FileText
} from 'lucide-react';

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string>('student');
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  if (isAuthenticated) {
    window.location.href = '/';
    return null;
  }

  const handleGetStarted = () => {
    setShowRoleSelector(true);
  };

  const handleLogin = () => {
    window.location.href = `/api/login?role=${selectedRole}`;
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary">BrainBased EMDR</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={handleGetStarted} className="bg-primary hover:bg-blue-700 text-white">
                Login
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-text-primary mb-6">
            EMDR Consultation
            <span className="block text-primary">Tracking System</span>
          </h1>
          <p className="text-xl text-text-secondary mb-8 max-w-3xl mx-auto">
            Transform your EMDR certification journey with our comprehensive platform featuring 
            integrated video conferencing, automated scheduling, and real-time progress tracking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="bg-primary hover:bg-blue-700 text-white px-8 py-3"
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-primary text-primary hover:bg-blue-50 px-8 py-3"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              Everything you need for EMDR certification
            </h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto">
              Our platform streamlines the entire consultation process with professional tools 
              designed specifically for EMDR practitioners and students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-primary bg-opacity-10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Video className="text-primary h-8 w-8" />
                </div>
                <CardTitle className="text-center">Integrated Video Conferencing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary text-center">
                  Professional-grade video sessions built specifically for EMDR consultations 
                  with automatic recording and attendance tracking.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-accent bg-opacity-10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Calendar className="text-accent h-8 w-8" />
                </div>
                <CardTitle className="text-center">Smart Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary text-center">
                  Intelligent calendar system that matches students with available consultants 
                  across multiple time zones with automated confirmations.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-secondary bg-opacity-10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <TrendingUp className="text-secondary h-8 w-8" />
                </div>
                <CardTitle className="text-center">Real-time Progress Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary text-center">
                  Visual progress indicators showing completion toward your 40-hour requirement 
                  with estimated completion dates and milestone celebrations.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-primary bg-opacity-10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Award className="text-primary h-8 w-8" />
                </div>
                <CardTitle className="text-center">Automated Certification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary text-center">
                  Instant certificate generation and delivery upon completion of requirements 
                  with secure verification and professional formatting.
                </p>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-accent bg-opacity-10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Users className="text-accent h-8 w-8" />
                </div>
                <CardTitle className="text-center">Expert Consultants</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary text-center">
                  Access to qualified EMDR practitioners with specialized expertise 
                  and verified credentials for high-quality consultation experiences.
                </p>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-secondary bg-opacity-10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Clock className="text-secondary h-8 w-8" />
                </div>
                <CardTitle className="text-center">24/7 Accessibility</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary text-center">
                  Access your dashboard, schedule sessions, and track progress anytime 
                  from any device with our responsive, mobile-friendly platform.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-primary to-secondary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-xl opacity-90">Students Certified</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">95%</div>
              <div className="text-xl opacity-90">Completion Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-xl opacity-90">Expert Consultants</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99.9%</div>
              <div className="text-xl opacity-90">System Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Ready to start your EMDR certification journey?
          </h2>
          <p className="text-xl text-text-secondary mb-8">
            Join hundreds of mental health professionals who have successfully completed 
            their EMDR certification through our platform.
          </p>
           {showRoleSelector ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <h3 className="text-lg font-semibold text-text-primary">Choose your role to continue:</h3>
              <Select onValueChange={setSelectedRole} defaultValue={selectedRole}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student - Complete EMDR Certification</SelectItem>
                  <SelectItem value="consultant">Consultant - Provide EMDR Consultation</SelectItem>
                  <SelectItem value="admin">Admin - System Administration</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                size="lg" 
                onClick={handleLogin}
                disabled={!selectedRole}
                className="bg-primary hover:bg-blue-700 text-white px-8 py-3 disabled:opacity-50"
              >
                Continue as {selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) : 'User'}
              </Button>
            </div>
          ) : (
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="bg-primary hover:bg-blue-700 text-white px-8 py-3"
            >
              Get Started Today
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">BrainBased EMDR</h3>
              <p className="text-gray-400">
                The premier platform for EMDR consultation tracking and certification.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Dashboard</li>
                <li>Scheduling</li>
                <li>Video Sessions</li>
                <li>Progress Tracking</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li>EMDR Guidelines</li>
                <li>Training Materials</li>
                <li>Documentation</li>
                <li>Support</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Support Center</li>
                <li>Technical Help</li>
                <li>Consultation Issues</li>
                <li>Account Management</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 BrainBased EMDR. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}