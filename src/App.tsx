import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Athletes from "./pages/Athletes";
import Employers from "./pages/Employers";
import News from "./pages/News";
import NotFound from "./pages/NotFound";
import AllUsers from "./pages/admin/AllUsers";
import AllAthletes from "./pages/admin/AllAthletes";
import AllEmployers from "./pages/admin/AllEmployers";
import AllRequests from "./pages/admin/AllRequests";
import AcceptedConnections from "./pages/admin/AcceptedConnections";
import RejectedRequests from "./pages/admin/RejectedRequests";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/athletes" element={<Athletes />} />
          <Route path="/employers" element={<Employers />} />
          <Route path="/news" element={<News />} />
          <Route path="/admin/users" element={<AllUsers />} />
          <Route path="/admin/athletes" element={<AllAthletes />} />
          <Route path="/admin/employers" element={<AllEmployers />} />
          <Route path="/admin/requests" element={<AllRequests />} />
          <Route path="/admin/connections" element={<AcceptedConnections />} />
          <Route path="/admin/rejected" element={<RejectedRequests />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
