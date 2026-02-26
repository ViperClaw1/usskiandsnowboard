import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CookieConsent } from "@/components/CookieConsent";
import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Suspense, lazy, memo, useMemo } from "react";

// ==============================
// Lazy-loaded routes
// Each page is code-split into its own chunk.
// Only the current page's JS is downloaded on first visit.
// ==============================
const Index = lazy(() => import("./pages/Index"));
const Home = lazy(() => import("./pages/Home"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Athletes = lazy(() => import("./pages/Athletes"));
const Employers = lazy(() => import("./pages/Employers"));
const Schedule = lazy(() => import("./pages/Schedule"));
const News = lazy(() => import("./pages/News"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/Privacy"));
const EmailVerification = lazy(() => import("./pages/EmailVerification"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Settings = lazy(() => import("./pages/Settings"));
const Training = lazy(() => import("./pages/Training"));
const TrainingArticle = lazy(() => import("./pages/TrainingArticle"));

// Admin pages — rarely visited, ideal lazy candidates
const AllUsers = lazy(() => import("./pages/admin/AllUsers"));
const AllAthletes = lazy(() => import("./pages/admin/AllAthletes"));
const AllEmployers = lazy(() => import("./pages/admin/AllEmployers"));
const AllRequests = lazy(() => import("./pages/admin/AllRequests"));
const AcceptedConnections = lazy(() => import("./pages/admin/AcceptedConnections"));
const RejectedRequests = lazy(() => import("./pages/admin/RejectedRequests"));

// ==============================
// QueryClient — stable singleton with aggressive caching
// staleTime: data is fresh for 5 min, no background refetch on focus/reconnect
// gcTime: unused cache kept for 10 min (formerly cacheTime in v4)
// ==============================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

// ==============================
// Global page loading fallback
// Shown by Suspense while a lazy page chunk is downloading.
// Keeps the AppLayout (nav/shell) visible — only the content area shows this.
// ==============================
const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
  </div>
);

// ==============================
// AppRoutes
// FIX: Remove `if (loading) return null`.
// Instead, pass auth state down so individual pages can handle
// their own loading skeletons (as Athletes.tsx already does).
// memo() prevents re-rendering this tree on unrelated parent state changes.
// ==============================
const AppRoutes = memo(() => {
  const { user, loading } = useAuth();

  // FIX: useMemo keeps the route element stable so React doesn't unmount/remount
  // pages when unrelated context values change.
  const rootElement = useMemo(() => (user ? <Home /> : <Index />), [user]);

  return (
    // Suspense wraps all routes — lazy chunks resolve here.
    // AppLayout (shell/nav) is outside Suspense so it never unmounts during nav.
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<AppLayout />}>
          {/* FIX: Render root immediately — don't block on auth loading.
              Home/Index handle their own loading states internally. */}
          <Route path="/" element={loading ? <PageFallback /> : rootElement} />

          <Route path="/auth" element={<Auth />} />
          <Route path="/email-verification" element={<EmailVerification />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/athletes" element={<Athletes />} />
          <Route path="/employers" element={<Employers />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/news" element={<News />} />
          <Route path="/training" element={<Training />} />
          <Route path="/training/:slug" element={<TrainingArticle />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/privacy" element={<Privacy />} />

          {/* Admin */}
          <Route path="/admin/users" element={<AllUsers />} />
          <Route path="/admin/athletes" element={<AllAthletes />} />
          <Route path="/admin/employers" element={<AllEmployers />} />
          <Route path="/admin/requests" element={<AllRequests />} />
          <Route path="/admin/connections" element={<AcceptedConnections />} />
          <Route path="/admin/rejected" element={<RejectedRequests />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
});

// ==============================
// App — Provider ordering matters:
// BrowserRouter is now OUTSIDE AuthProvider so router context is always
// available independently of auth state changes, preventing full subtree
// re-renders when auth changes.
// ==============================
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <AppRoutes />
          <CookieConsent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
