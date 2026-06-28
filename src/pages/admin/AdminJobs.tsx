import { useAuth } from "@/components/auth/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { JobPostsManager } from "@/components/dashboard/admin/JobPostsManager";

const AdminJobs = () => {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole(user?.id);
  if (loading || roleLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (role !== "admin") return <Navigate to="/" replace />;
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-5xl space-y-4">
        <h1 className="text-3xl font-bold">Job Board Management</h1>
        <JobPostsManager />
      </div>
    </div>
  );
};

export default AdminJobs;
