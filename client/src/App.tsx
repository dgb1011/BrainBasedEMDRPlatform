import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/Dashboard";
import Landing from "@/pages/Landing";
import Schedule from "@/pages/Schedule";
import VideoSession from "@/pages/VideoSession";
import Progress from "@/pages/Progress";
import Sessions from "@/pages/Sessions";
import AdminPanel from "@/pages/AdminPanel";
import ConsultantDashboard from "@/pages/ConsultantDashboard";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading or landing page if not authenticated
  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Route based on user type
  const userType = user?.userType;

  return (
    <Switch>
      {userType === 'admin' ? (
        <>
          <Route path="/" component={AdminPanel} />
          <Route path="/admin" component={AdminPanel} />
          <Route path="/video/:sessionId" component={VideoSession} />
        </>
      ) : userType === 'consultant' ? (
        <>
          <Route path="/" component={ConsultantDashboard} />
          <Route path="/schedule" component={Schedule} />
          <Route path="/sessions" component={Sessions} />
          <Route path="/video/:sessionId" component={VideoSession} />
        </>
      ) : (
        // Default to student dashboard
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/schedule" component={Schedule} />
          <Route path="/progress" component={Progress} />
          <Route path="/sessions" component={Sessions} />
          <Route path="/admin" component={AdminPanel} />
          <Route path="/video/:sessionId" component={VideoSession} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
