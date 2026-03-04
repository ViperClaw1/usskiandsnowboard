import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CookieConsent } from "@/components/CookieConsent";
import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { lazy, Suspense } from "react";

// ==============================
// Critical routes — eagerly loaded (needed for initial paint)
// ==============================
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// ==============================
// Non-critical routes — lazy loaded to reduce initial bundle
// ==============================
const Home = lazy(() => import("./pages/Home"));
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
const AllUsers = lazy(() => import("./pages/admin/AllUsers"));
const AllAthletes = lazy(() => import("./pages/admin/AllAthletes"));
const AllEmployers = lazy(() => import("./pages/admin/AllEmployers"));
const AllRequests = lazy(() => import("./pages/admin/AllRequests"));
const AcceptedConnections = lazy(() => import("./pages/admin/AcceptedConnections"));
const RejectedRequests = lazy(() => import("./pages/admin/RejectedRequests"));
const Settings = lazy(() => import("./pages/Settings"));
const Training = lazy(() => import("./pages/Training"));
const TrainingArticle = lazy(() => import("./pages/TrainingArticle"));
const Waitlist = lazy(() => import("./pages/Waitlist"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

// ==============================
// HomeRoute
// Isolated component so only this tiny node re-renders when auth state
// changes — AppRoutes and the rest of the route tree are unaffected.
// ==============================
const HomeRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Home /> : <Index />;
};

// ==============================
// AppRoutes
// No longer consumes useAuth — renders unconditionally on every visit.
// Previously it called useAuth() at the top level which meant every auth
// state change (including the initial INITIAL_SESSION event) caused the
// entire route tree to re-render and all child pages to remount.
// ==============================
const AppRoutes = () => (
  <Suspense fallback={null}>
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomeRoute />} />
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
        <Route path="/waitlist" element={<Waitlist />} />
        <Route path="/admin/users" element={<AllUsers />} />
        <Route path="/admin/athletes" element={<AllAthletes />} />
        <Route path="/admin/employers" element={<AllEmployers />} />
        <Route path="/admin/requests" element={<AllRequests />} />
        <Route path="/admin/connections" element={<AcceptedConnections />} />
        <Route path="/admin/rejected" element={<RejectedRequests />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  </Suspense>
);

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
