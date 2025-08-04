import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  GraduationCap, 
  Video, 
  Calendar, 
  Award, 
  Users, 
  CheckCircle,
  ArrowRight,
  Star
} from 'lucide-react';

export default function Landing() {
  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <GraduationCap className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">BrainBased EMDR</h1>
            </div>
            <Button onClick={handleLogin} className="bg-blue-600 hover:bg-blue-700 text-white">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Complete Your EMDR
            <span className="text-blue-600"> Certification</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Streamline your 40-hour EMDR consultation journey with integrated video conferencing, 
            automated scheduling, and real-time progress tracking in one comprehensive platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={handleLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="px-8 py-3"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need for EMDR Certification
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform combines all the essential tools you need to complete your EMDR 
              consultation requirements efficiently and effectively.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                  <Video className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle>Integrated Video Conferencing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  High-quality video sessions with recording capabilities, 
                  screen sharing, and seamless consultant connections.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle>Smart Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Automated scheduling system that matches you with qualified 
                  consultants based on availability and specialization.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                  <Award className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle>Progress Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Real-time tracking of your 40-hour requirement with detailed 
                  analytics and certification milestone monitoring.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-orange-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                  <Users className="h-8 w-8 text-orange-600" />
                </div>
                <CardTitle>Expert Consultants</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Access to certified EMDR consultants with specialized 
                  expertise in various therapeutic modalities.
                </p>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle>Automated Certification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Streamlined certification process with automatic document 
                  generation and verification upon completion.
                </p>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-teal-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                  <Star className="h-8 w-8 text-teal-600" />
                </div>
                <CardTitle>Quality Assurance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Comprehensive quality monitoring with session recordings, 
                  feedback systems, and performance analytics.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-blue-200">Students Certified</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-blue-200">Expert Consultants</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">98%</div>
              <div className="text-blue-200">Completion Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Start Your EMDR Journey?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join hundreds of mental health professionals who have successfully completed 
            their EMDR certification through our platform.
          </p>
          <Button 
            size="lg"
            onClick={handleLogin}
            className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-lg"
          >
            Begin Certification Process
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <GraduationCap className="h-6 w-6 text-blue-400 mr-2" />
                <span className="font-bold">BrainBased EMDR</span>
              </div>
              <p className="text-gray-400">
                Streamlining EMDR certification with innovative technology 
                and expert consultation services.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Video Conferencing</li>
                <li>Scheduling System</li>
                <li>Progress Tracking</li>
                <li>Certification Management</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Contact Support</li>
                <li>Training Resources</li>
                <li>System Status</li>
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