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
import ConsultantDashboard from "@/pages/ConsultantDashboard";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Loading BrainBased EMDR Platform
        </h2>
        <p className="text-gray-600">Please wait while we set up your experience...</p>
      </div>
    </div>
  );
}

function Router() {
  const { user, loading } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return <LoadingScreen />;
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

  return (
    <Switch>
      {userRole === 'admin' ? (
        <>
          <Route path="/" component={AdminPanel} />
          <Route path="/admin" component={AdminPanel} />
          <Route path="/video/:sessionId" component={VideoSession} />
          <Route component={NotFound} />
        </>
      ) : userRole === 'consultant' ? (
        <>
          <Route path="/" component={ConsultantDashboard} />
          <Route path="/schedule" component={Schedule} />
          <Route path="/sessions" component={Sessions} />
          <Route path="/video/:sessionId" component={VideoSession} />
          <Route component={NotFound} />
        </>
      ) : userRole === 'student' ? (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/schedule" component={Schedule} />
          <Route path="/progress" component={Progress} />
          <Route path="/sessions" component={Sessions} />
          <Route path="/video/:sessionId" component={VideoSession} />
          <Route component={NotFound} />
        </>
      ) : (
        // Fallback for undefined role
        <>
          <Route path="/" component={Auth} />
          <Route component={Auth} />
        </>
      )}
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
