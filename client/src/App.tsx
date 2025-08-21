import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/pages/Dashboard";
import Auth from "@/pages/Auth";
import Schedule from "@/pages/Schedule";
import VideoSession from "@/pages/VideoSession";
import Progress from "@/pages/Progress";
import Sessions from "@/pages/Sessions";
import AdminPanel from "@/pages/AdminPanel";
import AdminCertificateDesigner from "@/pages/AdminCertificateDesigner";
import VerifyCertificate from "@/pages/VerifyCertificate";
import KajabiIntegration from "@/pages/KajabiIntegration";
import Settings from "@/pages/Settings";
import Reports from "@/pages/Reports";
import Profile from "@/pages/Profile";
import ConsultantDashboard from "@/pages/ConsultantDashboard";
import ConsultantAvailability from "@/pages/ConsultantAvailability";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

function LoadingScreen() {
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTimeoutMessage(true);
    }, 10000); // Show timeout message after 10 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Loading BrainBased EMDR Platform
        </h2>
        <p className="text-gray-600">Please wait while we set up your experience...</p>
        
        {showTimeoutMessage && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Taking longer than expected? Try refreshing the page or check your connection.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Router() {
  const { user, loading } = useAuth();
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setTimeoutReached(true);
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(timer);
  }, [loading]);

  // Show loading screen while checking authentication
  if (loading && !timeoutReached) {
    return <LoadingScreen />;
  }

  // If timeout reached, show auth page anyway
  if (timeoutReached) {
    console.log('Auth timeout reached, showing auth page');
    return (
      <Switch>
        <Route path="/" component={Auth} />
        <Route component={Auth} />
      </Switch>
    );
  }

  // Show auth page if not authenticated
  if (!user) {
    return (
      <Switch>
        <Route path="/" component={Auth} />
        <Route component={Auth} />
      </Switch>
    );
  }

  // Route based on user role
  const userRole = user.role;

  console.log('User role:', userRole, 'Full user:', user); // Debug log

  const routesForRole = (
    userRole === 'admin' ? [
      <Route path="/" component={AdminPanel} />,
      <Route path="/admin" component={AdminPanel} />,
      <Route path="/admin/certificates/designer" component={AdminCertificateDesigner} />,
      <Route path="/admin/kajabi" component={KajabiIntegration} />,
      <Route path="/admin/reports" component={Reports} />,
      <Route path="/profile" component={Profile} />,
      <Route path="/settings" component={Settings} />,
      <Route path="/verify/:code" component={VerifyCertificate} />,
      <Route path="/video/:sessionId" component={VideoSession} />,
    ] : userRole === 'consultant' ? [
      <Route path="/" component={ConsultantDashboard} />,
      <Route path="/schedule" component={Schedule} />,
      <Route path="/availability" component={ConsultantAvailability} />,
      <Route path="/sessions" component={Sessions} />,
      <Route path="/profile" component={Profile} />,
      <Route path="/settings" component={Settings} />,
      <Route path="/video/:sessionId" component={VideoSession} />,
    ] : userRole === 'student' ? [
      <Route path="/" component={Dashboard} />,
      <Route path="/schedule" component={Schedule} />,
      <Route path="/progress" component={Progress} />,
      <Route path="/sessions" component={Sessions} />,
      <Route path="/profile" component={Profile} />,
      <Route path="/settings" component={Settings} />,
      <Route path="/verify/:code" component={VerifyCertificate} />,
      <Route path="/video/:sessionId" component={VideoSession} />,
    ] : [
      <Route path="/" component={Auth} />,
      <Route component={Auth} />,
    ]
  );

  return (
    <Switch>
      {routesForRole}
      {/* Global fallback as the last direct child of Switch */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
