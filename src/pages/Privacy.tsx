import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="ghost">← Back to Home</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <section className="space-y-6 text-muted-foreground">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">Information We Collect</h2>
            <p>
              We collect information you provide directly to us when you create an account, including your name, email address, phone number, and profile information.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">How We Use Your Information</h2>
            <p>
              We use the information we collect to provide, maintain, and improve our services, to communicate with you, and to facilitate connections between athletes and employers.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">Cookies</h2>
            <p>
              We use essential cookies to ensure our website functions properly. These cookies are necessary for authentication and basic site functionality.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information. All data is encrypted in transit and at rest.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">Your Rights</h2>
            <p>
              You have the right to access, update, or delete your personal information at any time through your account settings.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us through the U.S. Ski & Snowboard official channels.
            </p>
          </div>

          <div className="pt-4 text-sm">
            <p>Last updated: January 15, 2025</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Privacy;
