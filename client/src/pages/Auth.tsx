import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import { Brain, GraduationCap, Users, Shield } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const { signIn, signUp } = useAuth();

  const handleLoginSuccess = () => {
    // Router will automatically redirect based on user role
    console.log('Login successful - redirecting to appropriate dashboard');
  };

  const handleRegisterSuccess = () => {
    // Redirect will be handled by the router
    console.log('Registration successful');
  };

  const features = [
    {
      icon: <GraduationCap className="h-8 w-8" />,
      title: 'Student Features',
      description: 'Track your EMDR certification progress, upload case studies, and schedule consultation sessions.'
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: 'Consultant Features',
      description: 'Manage student sessions, review documents, and provide professional guidance.'
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: 'Admin Features',
      description: 'Oversee platform operations, manage users, and ensure quality standards.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center min-h-[calc(100vh-4rem)]">
          {/* Left Side - Features */}
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start space-x-3 mb-6">
                <Brain className="h-12 w-12 text-blue-600" />
                <h1 className="text-4xl font-bold text-gray-900">
                  BrainBased EMDR
                </h1>
              </div>
              <p className="text-xl text-gray-600 mb-8">
                Professional EMDR consultation and certification platform
              </p>
            </div>

            <div className="space-y-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                  <div className="flex-shrink-0 text-blue-600">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                Why Choose BrainBased EMDR?
              </h3>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  <span>Professional certification tracking</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  <span>Secure document management</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  <span>Video conferencing integration</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  <span>Automated progress tracking</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Side - Auth Form */}
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              {isLogin ? (
                <LoginForm
                  onSuccess={handleLoginSuccess}
                  onSwitchToRegister={() => setIsLogin(false)}
                />
              ) : (
                <RegisterForm
                  onSuccess={handleRegisterSuccess}
                  onSwitchToLogin={() => setIsLogin(true)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 