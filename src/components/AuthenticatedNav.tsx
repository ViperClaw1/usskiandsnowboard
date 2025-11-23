import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import usLogo from "@/assets/us-logo-new.png";
import mountainHeaderBg from "@/assets/mountain-header-bg.png";
import { MobileNav } from "@/components/MobileNav";
import { toast } from "sonner";

export const AuthenticatedNav = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    // Ignore session_not_found errors since user is already logged out
    if (error && error.message !== "Session from session_id claim in JWT does not exist" && error.status !== 403) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
    }
    // Always navigate to home regardless of error
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50" style={{ 
      backgroundImage: `url(${mountainHeaderBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundColor: '#1e3a5f'
    }}>
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <Link to="/" className="cursor-pointer">
          <img src={usLogo} alt="U.S. Ski & Snowboard" className="h-16 sm:h-20 hover:opacity-80 transition-opacity" />
        </Link>
        <nav className="hidden md:flex items-center gap-4 lg:gap-6">
          <Link to="/athletes" className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base">
            Athletes
          </Link>
          <Link to="/employers" className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base">
            Partners
          </Link>
          <Link to="/schedule" className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base">
            Schedule
          </Link>
          <Link to="/news" className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base">
            News
          </Link>
          <Link to="/dashboard">
            <Button size="sm" className="lg:h-10 bg-red-600 hover:bg-red-700">Dashboard</Button>
          </Link>
          <Button size="sm" variant="outline" className="lg:h-10" onClick={handleSignOut}>
            Sign Out
          </Button>
        </nav>
        <MobileNav />
      </div>
    </header>
  );
};
