import { Link } from "react-router-dom";
import { Clock, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import usSkiLogo from "@/assets/us-ski-snowboard-logo.png";

const Waitlist = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md shadow-2xl border-border/50">
        <CardContent className="pt-10 pb-10 flex flex-col items-center text-center space-y-6">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <img src={usSkiLogo} alt="U.S. Ski & Snowboard" className="h-14 object-contain" />
          </Link>

          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-foreground">Application Submitted</h1>
            <p className="text-muted-foreground leading-relaxed">
              Your account is now under review by the platform administrator. You'll receive an email notification once a decision has been made.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-3 w-full justify-center">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span>Check your inbox for updates</span>
          </div>

          <Button variant="outline" asChild className="w-full">
            <Link to="/">Return to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Waitlist;
