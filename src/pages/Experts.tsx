import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { ExpertDirectory } from "@/components/experts/ExpertDirectory";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// ==============================
// Blurred preview card for unauthenticated users
// ==============================
const BlurCard = ({ index }: { index: number }) => {
  const names = ["Alex Johnson", "Sam Rivera", "Jordan Kim"];
  const roles = ["Head of Brand Strategy", "VP of Operations", "Senior Marketing Director"];
  const industries = ["Marketing & Advertising", "Technology & Software", "Sports & Recreation"];
  return (
    <Card className="select-none pointer-events-none">
      <CardContent className="p-5 flex flex-col items-center text-center gap-3">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
            {names[index].split(" ").map((n) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{names[index]}</p>
          <p className="text-sm text-muted-foreground">{roles[index]}</p>
        </div>
        <Badge variant="secondary" className="text-xs">{industries[index]}</Badge>
        <p className="text-xs text-muted-foreground line-clamp-2">
          Experienced professional with 15+ years in the industry, passionate about mentoring the next generation of athletes.
        </p>
      </CardContent>
    </Card>
  );
};

const Experts = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-10 space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground">Meet the Experts</h1>
          <p className="text-muted-foreground">
            Discover industry experts to expand your professional network
          </p>
        </div>

        <div className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 blur-sm pointer-events-none select-none">
            {[0, 1, 2].map((i) => <BlurCard key={i} index={i} />)}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="bg-background/90 backdrop-blur-sm rounded-xl px-8 py-6 text-center shadow-lg border">
              <Lock className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="font-semibold text-foreground mb-1">Sign In to View Experts</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create an account to connect with industry professionals
              </p>
              <Button onClick={() => navigate("/auth")}>Sign In</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground">Meet the Experts</h1>
        <p className="text-muted-foreground">
          Discover industry experts to expand your professional network
        </p>
      </div>
      <ExpertDirectory />
    </div>
  );
};

export default Experts;
