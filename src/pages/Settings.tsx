// ==============================
// Imports
// ==============================

import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Phone } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

// ==============================
// Types / Interfaces
// ==============================

interface NotificationPreferences {
  email_new_requests: boolean;
  email_accepted_connections: boolean;
  email_profile_views: boolean;
  email_new_accounts: boolean;
  email_connections_declined: boolean;
  digest_frequency: "instant" | "daily" | "weekly" | "off";
  sms_notifications_enabled: boolean;
}

interface SettingsData {
  preferences: NotificationPreferences;
  phone: string;
}

// ==============================
// Utilities
// Phone formatting helpers — defined outside component to prevent recreation
// ==============================

const formatPhone = (digits: string): string => {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 1) return `+${d}`;
  if (d.length <= 4) return `+${d[0]} (${d.slice(1)}`;
  if (d.length <= 7) return `+${d[0]} (${d.slice(1, 4)}) ${d.slice(4)}`;
  if (d.length <= 9) return `+${d[0]} (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return `+${d[0]} (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`;
};

const unformatPhone = (value: string): string => value.replace(/\D/g, "");

const validatePhone = (digits: string): string => {
  if (digits.length === 0) return "Phone number is required";
  if (digits.length !== 11) return "Please enter a valid US phone number";
  return "";
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email_new_requests: true,
  email_accepted_connections: true,
  email_profile_views: false,
  email_new_accounts: false,
  email_connections_declined: false,
  digest_frequency: "instant",
  sms_notifications_enabled: false,
};

// ==============================
// Query Key
// ==============================
const settingsKey = (userId: string) => ["settings", userId];

// ==============================
// Query Function
// Fetches notification preferences and phone number in parallel.
// If no preferences row exists yet, inserts a default row and returns defaults.
// Extracted outside the component — stable reference, not recreated per render.
// ==============================
const fetchSettings = async (userId: string): Promise<SettingsData> => {
  const [{ data: profileData }, { data: prefsData, error: prefsError }] = await Promise.all([
    supabase.from("profiles").select("phone").eq("id", userId).single(),
    supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  if (prefsError) throw prefsError;

  // Insert default row if none exists yet — fire-and-forget, non-blocking
  if (!prefsData) {
    supabase
      .from("notification_preferences")
      .insert({ user_id: userId })
      .then(({ error }) => {
        if (error) console.error("Error creating default preferences:", error);
      });
  }

  const preferences: NotificationPreferences = prefsData
    ? {
        email_new_requests: prefsData.email_new_requests,
        email_accepted_connections: prefsData.email_accepted_connections,
        email_profile_views: prefsData.email_profile_views,
        email_new_accounts: prefsData.email_new_accounts,
        email_connections_declined: prefsData.email_connections_declined,
        digest_frequency: prefsData.digest_frequency as NotificationPreferences["digest_frequency"],
        sms_notifications_enabled: prefsData.sms_notifications_enabled,
      }
    : DEFAULT_PREFERENCES;

  const phone = profileData?.phone ? formatPhone(unformatPhone(profileData.phone)) : "";

  return { preferences, phone };
};

// ==============================
// Component Definition
// Data fetching migrated from useState/useEffect to useQuery.
//
// Previously, loadPreferences() fired on every mount, reset loading:true,
// and ran two sequential Supabase calls. Now settings are cached under
// settingsKey(userId):
//
//  - On the first visit: fetches from Supabase, stores in cache.
//  - On repeat visits: initialData reads from cache synchronously —
//    loading is false from render zero, no spinner flash.
//
// Phone and preferences UI state remain as useState since they represent
// in-progress edits that should not be shared with or overwritten by the cache
// until the user explicitly saves.
// ==============================

export default function Settings() {
  // ==============================
  // Hooks
  // ==============================
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { role } = useUserRole(user?.id);
  const isAdmin = role === "admin";

  // ==============================
  // UI-only state
  // Local copies of phone/preferences that the user edits before saving.
  // Initialised from the query result via the `select` option below.
  // ==============================
  const [saving, setSaving] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  // ==============================
  // Data Fetching — Settings
  // The `select` callback runs once when data first arrives (or from cache)
  // and seeds the local editable state — equivalent to the original
  // setPreferences / setPhoneNumber calls inside loadPreferences().
  // ==============================
  const { data: settingsData, isLoading } = useQuery<SettingsData>({
    queryKey: settingsKey(user?.id ?? ""),
    queryFn: () => fetchSettings(user!.id),
    enabled: !!user,
    initialData: () => queryClient.getQueryData<SettingsData>(settingsKey(user?.id ?? "")),
    staleTime: 5 * 60 * 1000,
  });

  // Seed local editable state when data first arrives from network or cache.
  // The saving/phoneTouched guards prevent overwriting in-progress edits
  // if a background refetch lands while the user is mid-edit.
  useEffect(() => {
    if (!settingsData || saving || phoneTouched) return;
    setPreferences(settingsData.preferences);
    setPhoneNumber(settingsData.phone);
  }, [settingsData]);

  // ==============================
  // Derived Values
  // ==============================
  const rawDigits = unformatPhone(phoneNumber);
  const isPhoneValid = rawDigits.length === 11;

  // ==============================
  // Handlers — Preferences
  // Optimistically updates local state then persists to Supabase.
  // On success, updates the cache so repeat visits see the latest values.
  // ==============================
  const savePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      if (!user) return;
      setSaving(true);
      try {
        const newPreferences = { ...preferences, ...updates };
        setPreferences(newPreferences);

        const { error } = await supabase
          .from("notification_preferences")
          .update({
            email_new_requests: newPreferences.email_new_requests,
            email_accepted_connections: newPreferences.email_accepted_connections,
            email_profile_views: newPreferences.email_profile_views,
            email_new_accounts: newPreferences.email_new_accounts,
            email_connections_declined: newPreferences.email_connections_declined,
            digest_frequency: newPreferences.digest_frequency,
            sms_notifications_enabled: newPreferences.sms_notifications_enabled,
          })
          .eq("user_id", user.id);

        if (error) throw error;

        // Keep the cache in sync so the next visit reads the latest preferences
        queryClient.setQueryData<SettingsData>(settingsKey(user.id), (old) =>
          old ? { ...old, preferences: newPreferences } : old,
        );

        toast.success("Notification preferences updated");
      } catch (error) {
        console.error("Error saving preferences:", error);
        toast.error("Failed to save preferences");
      } finally {
        setSaving(false);
      }
    },
    [preferences, user, queryClient],
  );

  // ==============================
  // Handlers — Phone Number
  // ==============================

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = unformatPhone(e.target.value);
    const formatted = formatPhone(digits);
    setPhoneNumber(formatted);
    if (phoneTouched) setPhoneError(validatePhone(digits));
  };

  const handlePhoneBlur = () => {
    setPhoneTouched(true);
    setPhoneError(validatePhone(rawDigits));
  };

  const savePhoneNumber = async () => {
    if (!user || !isPhoneValid) return;
    setSaving(true);
    try {
      const e164 = `+${rawDigits}`;
      const { error } = await supabase.from("profiles").update({ phone: e164 }).eq("id", user.id);

      if (error) throw error;

      // Keep the cache in sync so the next visit reads the saved phone number
      queryClient.setQueryData<SettingsData>(settingsKey(user.id), (old) =>
        old ? { ...old, phone: phoneNumber } : old,
      );

      toast.success("Phone number saved");
    } catch (error) {
      console.error("Error saving phone number:", error);
      toast.error("Failed to save phone number");
    } finally {
      setSaving(false);
    }
  };

  // ==============================
  // Render — Loading Guard
  // Only shown on first-ever visit. On all subsequent mounts, initialData
  // populates from cache and isLoading is false from render zero.
  // ==============================
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ==============================
  // Render
  // ==============================
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
          <CardDescription>Choose which email notifications you'd like to receive and how often</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Toggles */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Notifications:</h3>

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
              <Label htmlFor="email_connections_declined" className="flex flex-col gap-1 cursor-pointer">
                <span>Declined connections</span>
                <span className="text-sm font-normal text-muted-foreground">When connection requests are declined</span>
              </Label>
              <Switch
                id="email_connections_declined"
                checked={preferences.email_connections_declined}
                onCheckedChange={(checked) => savePreferences({ email_connections_declined: checked })}
                disabled={saving}
              />
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center justify-between">
              <Label htmlFor="email_new_accounts" className="flex flex-col gap-1 cursor-pointer">
                <span>New user registrations</span>
                <span className="text-sm font-normal text-muted-foreground">When new athletes or partners sign up</span>
              </Label>
              <Switch
                id="email_new_accounts"
                checked={preferences.email_new_accounts}
                onCheckedChange={(checked) => savePreferences({ email_new_accounts: checked })}
                disabled={saving}
              />
            </div>
          )}

          {/* Digest Frequency */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium text-sm">Email frequency:</h3>
            <RadioGroup
              value={preferences.digest_frequency}
              onValueChange={(value) =>
                savePreferences({
                  digest_frequency: value as NotificationPreferences["digest_frequency"],
                })
              }
              disabled={saving}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="instant" id="instant" />
                <Label htmlFor="instant" className="flex flex-col gap-1 cursor-pointer font-normal">
                  <span className="font-medium">Instant</span>
                  <span className="text-sm text-muted-foreground">Send emails as notifications happen</span>
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily" className="flex flex-col gap-1 cursor-pointer font-normal">
                  <span className="font-medium">Daily summary</span>
                  <span className="text-sm text-muted-foreground">Receive a daily summary at 9:00 AM UTC</span>
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly" className="flex flex-col gap-1 cursor-pointer font-normal">
                  <span className="font-medium">Weekly summary</span>
                  <span className="text-sm text-muted-foreground">
                    Receive a weekly summary on Monday at 9:00 AM UTC
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

          {/* SMS Notifications */}
          <div className="pt-6 border-t space-y-4">
            <h3 className="font-medium text-sm">SMS Notifications:</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (___) ___-__-__"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      onBlur={handlePhoneBlur}
                      className={`pl-10 ${phoneTouched && phoneError ? "border-destructive" : ""}`}
                    />
                  </div>
                  <Button onClick={savePhoneNumber} disabled={saving || !isPhoneValid}>
                    Save
                  </Button>
                </div>
                {phoneTouched && phoneError && <p className="text-sm text-destructive">{phoneError}</p>}
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="sms-enabled" className="font-medium">
                    Enable SMS notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">Receive text message alerts in addition to email</p>
                </div>
                <Switch
                  id="sms-enabled"
                  checked={preferences.sms_notifications_enabled}
                  onCheckedChange={(checked) => {
                    if (checked && !phoneNumber) {
                      toast.error("Please add a phone number first");
                      return;
                    }
                    savePreferences({ sms_notifications_enabled: checked });
                  }}
                  disabled={saving || !phoneNumber}
                />
              </div>
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
