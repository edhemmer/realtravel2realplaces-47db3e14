import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useUserProfile } from "@/hooks/useUserProfile";
import { BrandedPageLoader } from "@/components/ui/premium-loading";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CompleteProfile from "./pages/CompleteProfile";
import Dashboard from "./pages/Dashboard";
import TripDetail from "./pages/TripDetail";
import DriveMode from "./pages/DriveMode";
import AcceptShare from "./pages/AcceptShare";
import AcceptInvite from "./pages/AcceptInvite";
import AdminPlans from "./pages/AdminPlans";
import AdminSupportTickets from "./pages/AdminSupportTickets";
import AdminUsers from "./pages/AdminUsers";
import Account from "./pages/Account";
import Plans from "./pages/Plans";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Reports from "./pages/Reports";
import Onboarding from "./pages/Onboarding";
import WelcomeChoice from "./pages/WelcomeChoice";
import HelpCenter from "./pages/HelpCenter";
import NotFound from "./pages/NotFound";
import InstallApp from "./pages/InstallApp";
import { RealtimeSyncBridge } from "@/lib/realtime/RealtimeSyncBridge";
import { ThemeProvider } from "@/contexts/ThemeContext";

const queryClient = new QueryClient();

/**
 * Protected route that requires user to be authenticated.
 * v2.3.x: Single centralized guard for auth + onboarding.
 * Waits for both auth session AND profile to be loaded before deciding redirects.
 */
function ProtectedRoute({ children, skipOnboardingGate }: { children: React.ReactNode; skipOnboardingGate?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { shouldShowOnboarding, isLoading: onboardingLoading } = useOnboardingStatus();

  // Show loading while checking auth OR profile status — prevents premature redirects
  if (authLoading || (user && (profileLoading || onboardingLoading))) {
    return <BrandedPageLoader />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // v3.8.20: New users go directly to wizard — no intro slides
  // skipOnboardingGate is true for /onboarding and /welcome-choice routes themselves
  // Note: We no longer redirect to /dashboard here because that causes an infinite loop.
  // Instead, Dashboard itself detects shouldShowOnboarding via its own hook and opens the wizard.

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
      
      {/* Profile completion (authenticated but incomplete profile) */}
      <Route path="/complete-profile" element={<CompleteProfile />} />
      
      {/* Protected app routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trip/:tripId"
        element={
          <ProtectedRoute>
            <TripDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trip/:tripId/drive"
        element={
          <ProtectedRoute>
            <DriveMode />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invite"
        element={
          <ProtectedRoute>
            <AcceptInvite />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shared/:token"
        element={
          <ProtectedRoute>
            <AcceptShare />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <Account />
          </ProtectedRoute>
        }
      />
      <Route
        path="/plans"
        element={
          <ProtectedRoute>
            <Plans />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute skipOnboardingGate>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/welcome-choice"
        element={
          <ProtectedRoute skipOnboardingGate>
            <WelcomeChoice />
          </ProtectedRoute>
        }
      />
      
      {/* Admin routes */}
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="/admin/plans" element={<AdminPlans />} />
      <Route path="/admin/support-tickets" element={<AdminSupportTickets />} />
      
      {/* Legacy route redirect */}
      <Route path="/login" element={<Navigate to="/auth" replace />} />
      <Route path="/install" element={<InstallApp />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ErrorBoundary context="App">
            <RealtimeSyncBridge />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
