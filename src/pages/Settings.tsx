import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

interface NotificationPreferences {
  email_new_requests: boolean;
  email_accepted_connections: boolean;
  email_profile_views: boolean;
  email_new_accounts: boolean;
  email_connections_declined: boolean;
  digest_frequency: 'instant' | 'daily' | 'weekly' | 'off';
  sms_notifications_enabled: boolean;
}

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_new_requests: true,
    email_accepted_connections: true,
    email_profile_views: false,
    email_new_accounts: false,
    email_connections_declined: false,
    digest_frequency: 'instant',
    sms_notifications_enabled: false,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!roleData);

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          email_new_requests: data.email_new_requests,
          email_accepted_connections: data.email_accepted_connections,
          email_profile_views: data.email_profile_views,
          email_new_accounts: data.email_new_accounts,
          email_connections_declined: data.email_connections_declined,
          digest_frequency: data.digest_frequency as 'instant' | 'daily' | 'weekly' | 'off',
          sms_notifications_enabled: data.sms_notifications_enabled,
        });
      } else {
        // Create default preferences if none exist
        await createDefaultPreferences(user.id);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPreferences = async (userId: string) => {
    const { error } = await supabase
      .from('notification_preferences')
      .insert({ user_id: userId });

    if (error) {
      console.error('Error creating default preferences:', error);
    }
  };

  const savePreferences = async (updates: Partial<NotificationPreferences>) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newPreferences = { ...preferences, ...updates };
      setPreferences(newPreferences);

      const { error } = await supabase
        .from('notification_preferences')
        .update({
          email_new_requests: newPreferences.email_new_requests,
          email_accepted_connections: newPreferences.email_accepted_connections,
          email_profile_views: newPreferences.email_profile_views,
          email_new_accounts: newPreferences.email_new_accounts,
          email_connections_declined: newPreferences.email_connections_declined,
          digest_frequency: newPreferences.digest_frequency,
          sms_notifications_enabled: newPreferences.sms_notifications_enabled,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 animate-fade-in">
      <div className="mb-8 flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Choose which email notifications you'd like to receive and how often
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Toggles */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Email me when:</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="email_new_requests" className="flex flex-col gap-1 cursor-pointer">
                <span>New connection requests</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Someone sends you a connection request
                </span>
              </Label>
              <Switch
                id="email_new_requests"
                checked={preferences.email_new_requests}
                onCheckedChange={(checked) => savePreferences({ email_new_requests: checked })}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="email_accepted_connections" className="flex flex-col gap-1 cursor-pointer">
                <span>Accepted connections</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Someone accepts your connection request
                </span>
              </Label>
              <Switch
                id="email_accepted_connections"
                checked={preferences.email_accepted_connections}
                onCheckedChange={(checked) => savePreferences({ email_accepted_connections: checked })}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="email_profile_views" className="flex flex-col gap-1 cursor-pointer">
                <span>Profile views</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Someone views your profile (coming soon)
                </span>
              </Label>
              <Switch
                id="email_profile_views"
                checked={preferences.email_profile_views}
                onCheckedChange={(checked) => savePreferences({ email_profile_views: checked })}
                disabled={true}
              />
            </div>
          </div>

          {/* Admin-only notifications */}
          {isAdmin && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium text-sm text-primary">Admin notifications:</h3>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="email_new_accounts" className="flex flex-col gap-1 cursor-pointer">
                  <span>New user registrations</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    When new athletes or partners sign up
                  </span>
                </Label>
                <Switch
                  id="email_new_accounts"
                  checked={preferences.email_new_accounts}
                  onCheckedChange={(checked) => savePreferences({ email_new_accounts: checked })}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="email_connections_declined" className="flex flex-col gap-1 cursor-pointer">
                  <span>Declined connections</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    When connection requests are declined
                  </span>
                </Label>
                <Switch
                  id="email_connections_declined"
                  checked={preferences.email_connections_declined}
                  onCheckedChange={(checked) => savePreferences({ email_connections_declined: checked })}
                  disabled={saving}
                />
              </div>
            </div>
          )}

          {/* Digest Frequency */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium text-sm">Email frequency:</h3>
            
            <RadioGroup
              value={preferences.digest_frequency}
              onValueChange={(value) => savePreferences({ digest_frequency: value as 'instant' | 'daily' | 'weekly' | 'off' })}
              disabled={saving}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="instant" id="instant" />
                <Label htmlFor="instant" className="flex flex-col gap-1 cursor-pointer font-normal">
                  <span className="font-medium">Instant</span>
                  <span className="text-sm text-muted-foreground">
                    Send emails as notifications happen
                  </span>
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily" className="flex flex-col gap-1 cursor-pointer font-normal">
                  <span className="font-medium">Daily summary</span>
                  <span className="text-sm text-muted-foreground">
                    Receive a daily summary at 9:00 AM (coming soon)
                  </span>
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly" className="flex flex-col gap-1 cursor-pointer font-normal">
                  <span className="font-medium">Weekly summary</span>
                  <span className="text-sm text-muted-foreground">
                    Receive a weekly summary on Monday at 9:00 AM (coming soon)
                  </span>
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <RadioGroupItem value="off" id="off" />
                <Label htmlFor="off" className="flex flex-col gap-1 cursor-pointer font-normal">
                  <span className="font-medium">Off</span>
                  <span className="text-sm text-muted-foreground">
                    Don't send any email notifications (in-app only)
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="pt-6 border-t space-y-4">
            <h3 className="font-medium text-sm">SMS Notifications:</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="sms-enabled" className="font-medium">
                  Enable SMS notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive text message alerts in addition to email (optional)
                </p>
              </div>
              <Switch
                id="sms-enabled"
                checked={preferences.sms_notifications_enabled}
                onCheckedChange={(checked) => savePreferences({ sms_notifications_enabled: checked })}
                disabled={saving}
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Note: In-app notifications will always be enabled regardless of email or SMS settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
