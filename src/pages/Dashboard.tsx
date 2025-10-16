import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserRole();
    }
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserRole(data.role);
    } catch (error) {
      console.error('Error fetching user role:', error);
    } finally {
      setLoadingRole(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Signed out successfully",
        description: "See you next time!",
      });
      navigate('/');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message,
      });
    }
  };

  if (authLoading || loadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">
            {userRole === 'athlete' ? 'Athlete Dashboard' : 'Employer Dashboard'}
          </h1>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-lg p-8 shadow-[var(--shadow-elegant)]">
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              Welcome, {user?.user_metadata?.full_name || user?.email}!
            </h2>
            <p className="text-muted-foreground mb-6">
              {userRole === 'athlete' 
                ? 'Complete your athlete profile to connect with employers and career opportunities.'
                : 'Browse athlete profiles and connect with talented individuals for your organization.'}
            </p>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-6 bg-secondary rounded-lg">
                <h3 className="font-semibold mb-2 text-foreground">Profile</h3>
                <p className="text-sm text-muted-foreground">
                  {userRole === 'athlete' 
                    ? 'Set up your athlete profile with skills, experience, and career interests.'
                    : 'Complete your company profile to attract the best talent.'}
                </p>
              </div>
              
              <div className="p-6 bg-secondary rounded-lg">
                <h3 className="font-semibold mb-2 text-foreground">
                  {userRole === 'athlete' ? 'Opportunities' : 'Athletes'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {userRole === 'athlete' 
                    ? 'View connection requests and opportunities from employers.'
                    : 'Search and filter athletes by sport, skills, and location.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;