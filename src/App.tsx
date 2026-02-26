// ==============================
// Imports
// ==============================

import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CookieConsent } from "@/components/CookieConsent";
import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import { AppLayout } from "@/components/AppLayout";

// ==============================
// Critical path — eagerly loaded (above-the-fold, always needed)
// ==============================
import Index from "./pages/Index";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import EmailVerification from "./pages/EmailVerification";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// ==============================
// Non-critical routes — lazily loaded to reduce initial JS bundle
// These are code-split by Vite and only downloaded when the user navigates to them
// ==============================
const Athletes        = lazy(() => import("./pages/Athletes"));
const Employers       = lazy(() => import("./pages/Employers"));
const Schedule        = lazy(() => import("./pages/Schedule"));
const News            = lazy(() => import("./pages/News"));
const Training        = lazy(() => import("./pages/Training"));
const TrainingArticle = lazy(() => import("./pages/TrainingArticle"));
const Settings        = lazy(() => import("./pages/Settings"));
const Privacy         = lazy(() => import("./pages/Privacy"));
const AllUsers        = lazy(() => import("./pages/admin/AllUsers"));
const AllAthletes     = lazy(() => import("./pages/admin/AllAthletes"));
const AllEmployers    = lazy(() => import("./pages/admin/AllEmployers"));
const AllRequests     = lazy(() => import("./pages/admin/AllRequests"));
const AcceptedConnections = lazy(() => import("./pages/admin/AcceptedConnections"));
const RejectedRequests    = lazy(() => import("./pages/admin/RejectedRequests"));

// ==============================
// QueryClient Configuration
// staleTime: 5 min — cached data is considered fresh, no re-fetch on route change
// gcTime:   10 min — unused cache entries are held in memory before garbage collection
// This enables stale-while-revalidate: repeat visits hydrate instantly from cache
// while a background refresh runs silently.
// ==============================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      gcTime:    10 * 60 * 1000, // 10 minutes
    },
  },
});

// ==============================
// Route Loading Fallback
// Minimal centered spinner shown while lazy chunks download.
// Replaces the previous `return null` blank screen during auth load.
// ==============================
const RouteLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// ==============================
// AppRoutes — Smart Component
// Reads auth state; renders public vs authenticated root route.
// All lazy routes are wrapped in a single Suspense boundary.
// ==============================
const AppRoutes = () => {
  const { user, loading } = useAuth();

  // Show spinner while auth session is resolving (prevents flash of wrong route)
  if (loading) {
    return <RouteLoader />;
  }

  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route element={<AppLayout />}>
          {/* Auth-conditional home route */}
          <Route path="/" element={user ? <Home /> : <Index />} />

          {/* Always-public auth routes (eagerly loaded) */}
          <Route path="/auth"               element={<Auth />} />
          <Route path="/email-verification" element={<EmailVerification />} />
          <Route path="/forgot-password"    element={<ForgotPassword />} />
          <Route path="/reset-password"     element={<ResetPassword />} />

          {/* Authenticated core routes (eagerly loaded) */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Secondary routes (lazily loaded) */}
          <Route path="/athletes"          element={<Athletes />} />
          <Route path="/employers"         element={<Employers />} />
          <Route path="/schedule"          element={<Schedule />} />
          <Route path="/news"              element={<News />} />
          <Route path="/training"          element={<Training />} />
          <Route path="/training/:slug"    element={<TrainingArticle />} />
          <Route path="/settings"          element={<Settings />} />
          <Route path="/privacy"           element={<Privacy />} />

          {/* Admin routes (lazily loaded — only admin users navigate here) */}
          <Route path="/admin/users"       element={<AllUsers />} />
          <Route path="/admin/athletes"    element={<AllAthletes />} />
          <Route path="/admin/employers"   element={<AllEmployers />} />
          <Route path="/admin/requests"    element={<AllRequests />} />
          <Route path="/admin/connections" element={<AcceptedConnections />} />
          <Route path="/admin/rejected"    element={<RejectedRequests />} />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

// ==============================
// App — Root Component
// Wraps the entire tree with global providers.
// ==============================
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
          <CookieConsent />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
