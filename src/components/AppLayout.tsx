import { Outlet } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import { AuthenticatedNav } from "@/components/AuthenticatedNav";

export const AppLayout = () => {
  const { user } = useAuth();
  return (
    <>
      {user && <AuthenticatedNav />}
      <Outlet />
    </>
  );
};
