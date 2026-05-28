import { lazy, Suspense } from "react";
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

// Eager: landing + auth surfaces for instant first paint
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy: everything else — split into per-route chunks to shrink the main bundle
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TripDetail = lazy(() => import("./pages/TripDetail"));
const DriveMode = lazy(() => import("./pages/DriveMode"));
const AcceptShare = lazy(() => import("./pages/AcceptShare"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const AdminPlans = lazy(() => import("./pages/AdminPlans"));
const AdminSupportTickets = lazy(() => import("./pages/AdminSupportTickets"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const Account = lazy(() => import("./pages/Account"));
const Plans = lazy(() => import("./pages/Plans"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Reports = lazy(() => import("./pages/Reports"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const WelcomeChoice = lazy(() => import("./pages/WelcomeChoice"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const InstallApp = lazy(() => import("./pages/InstallApp"));

import { RealtimeSyncBridge } from "@/lib/realtime/RealtimeSyncBridge";
import { useNativeReminderSync } from "@/hooks/useNativeReminderSync";
import { useNativeDepartureSync } from "@/hooks/useNativeDepartureSync";
import { CommandPalette } from "@/components/command/CommandPalette";
import { useCommandPaletteHotkey } from "@/hooks/useCommandPaletteHotkey";

/**
 * Bridges DB reminder rows into the iOS/Android local notification scheduler.
 * No-op on web. Lives inside Auth + Query providers so it has user context.
 */
function NativeReminderBridge() {
  useNativeReminderSync();
  useNativeDepartureSync();
  return null;
}

/** Global ⌘K / Ctrl+K hotkey + universal palette. Lives inside Router so it can navigate. */
function GlobalCommandPalette() {
  useCommandPaletteHotkey();
  return <CommandPalette />;
}
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

/**
 * Root route: native shells (iOS/Android Capacitor) skip the marketing
 * landing page entirely. First native launch shows a signature welcome;
 * subsequent launches go straight into the app. Web visitors see LandingPage.
 */
import NativeWelcome, { hasSeenNativeWelcome } from "@/components/native/NativeWelcome";

function RootRoute() {
  const { user, loading } = useAuth();
  let native = false;
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    native = !!cap?.isNativePlatform?.();
  } catch { /* web */ }

  if (!native) return <LandingPage />;
  if (loading) return <BrandedPageLoader />;
  if (!hasSeenNativeWelcome()) return <NativeWelcome />;
  return <Navigate to={user ? '/dashboard' : '/auth'} replace />;
}


function AppRoutes() {
  return (
    <Suspense fallback={<BrandedPageLoader />}>
      <Routes>
      {/* Public landing page */}
      <Route path="/" element={<RootRoute />} />
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
    </Suspense>
  );
}

const App = () => (
  <HelmetProvider>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <ErrorBoundary context="App">
              <RealtimeSyncBridge />
              <NativeReminderBridge />
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <GlobalCommandPalette />
                <AppRoutes />
              </BrowserRouter>
            </ErrorBoundary>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
