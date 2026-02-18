import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CookieConsent } from "@/components/CookieConsent";
import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Athletes from "./pages/Athletes";
import Employers from "./pages/Employers";
import Schedule from "./pages/Schedule";
import News from "./pages/News";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import EmailVerification from "./pages/EmailVerification";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AllUsers from "./pages/admin/AllUsers";
import AllAthletes from "./pages/admin/AllAthletes";
import AllEmployers from "./pages/admin/AllEmployers";
import AllRequests from "./pages/admin/AllRequests";
import AcceptedConnections from "./pages/admin/AcceptedConnections";
import RejectedRequests from "./pages/admin/RejectedRequests";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={user ? <Home /> : <Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/email-verification" element={<EmailVerification />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/athletes" element={<Athletes />} />
        <Route path="/employers" element={<Employers />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/news" element={<News />} />
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
  );
};

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
