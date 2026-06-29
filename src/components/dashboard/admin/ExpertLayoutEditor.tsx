import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  UserCircle,
  Users,
  Eye,
  Briefcase,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  EyeIcon,
  Save,
  RotateCcw,
} from "lucide-react";
import { EditableText } from "./EditableText";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { TypographyControls } from "./TypographyControls";

const MOCK = {
  name: "Taylor Morgan",
  title: "Performance Coach",
  completeness: 78,
  views: 164,
  pending: 4,
  accepted: 9,
  declined: 2,
  athletes: [
    { id: "1", name: "Alex Thompson", sport: "Alpine Skiing" },
    { id: "2", name: "Sarah Chen", sport: "Freestyle Skiing" },
    { id: "3", name: "Jake Morrison", sport: "Snowboarding" },
    { id: "4", name: "Emily Davis", sport: "Cross-Country" },
  ],
  partners: [
    { id: "1", name: "Mountain Corp", industry: "Outdoor Recreation" },
    { id: "2", name: "Snow Gear Co", industry: "Retail" },
    { id: "3", name: "Peak Athletics", industry: "Sports & Fitness" },
    { id: "4", name: "Alpine Finance", industry: "Financial Services" },
  ],
};

export const ExpertLayoutEditor = () => {
  const { layout, loading, saving, updateTextOverride, updateTypography, saveLayout, resetLayout } =
    useDashboardLayout("expert");

  const o = layout.text_overrides;

  if (loading) return <LoadingSpinner />;

  const typographyStyle = {
    fontFamily: layout.typography.fontFamily,
    fontSize: `${layout.typography.fontSize}px`,
  };

  return (
    <div className="space-y-4" style={typographyStyle}>
      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 border gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-1 flex-wrap justify-between">
          <p className="text-sm text-muted-foreground">
            Click any text with a <span className="text-primary font-medium">pencil icon</span> to edit it. Changes
            apply to all expert dashboards.
          </p>
          
          <TypographyControls typography={layout.typography} onUpdate={updateTypography} disabled={saving} />
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={resetLayout} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={saveLayout} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Layout"}
          </Button>
        </div>
      </div>

      <section className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-background py-12 px-4 sm:px-6 lg:px-8 rounded-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
              <AvatarFallback>TM</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Welcome back, {MOCK.name.split(" ")[0]}</h1>
              <p className="text-lg text-muted-foreground">{MOCK.title}</p>
            </div>
            <Card className="hidden lg:block w-64">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      <EditableText
                        value="Profile Complete"
                        textKey="hero.profile_complete_label"
                        overrides={o}
                        onUpdate={updateTextOverride}
                      />
                    </span>
                    <span className="font-semibold">{MOCK.completeness}%</span>
                  </div>
                  <Progress value={MOCK.completeness} className="h-2" />
                  <Button variant="link" size="sm" className="p-0 h-auto">
                    <EditableText
                      value="Complete your profile"
                      textKey="hero.complete_profile_cta"
                      overrides={o}
                      onUpdate={updateTextOverride}
                    />
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto py-4">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <EditableText
                  value="Connection Activity"
                  textKey="connection_activity.title"
                  overrides={o}
                  onUpdate={updateTextOverride}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-muted-foreground">
                      <EditableText
                        value="Pending"
                        textKey="connection_activity.pending"
                        overrides={o}
                        onUpdate={updateTextOverride}
                      />
                    </span>
                  </div>
                  <span className="text-2xl font-bold">{MOCK.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-muted-foreground">
                      <EditableText
                        value="Accepted"
                        textKey="connection_activity.accepted"
                        overrides={o}
                        onUpdate={updateTextOverride}
                      />
                    </span>
                  </div>
                  <span className="text-2xl font-bold">{MOCK.accepted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-muted-foreground">
                      <EditableText
                        value="Declined"
                        textKey="connection_activity.declined"
                        overrides={o}
                        onUpdate={updateTextOverride}
                      />
                    </span>
                  </div>
                  <span className="text-2xl font-bold">{MOCK.declined}</span>
                </div>
                <Button variant="outline" className="w-full mt-2">
                  <EditableText
                    value="Manage Connections"
                    textKey="connection_activity.button"
                    overrides={o}
                    onUpdate={updateTextOverride}
                  />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <EditableText
                  value="Profile Performance"
                  textKey="profile_performance.title"
                  overrides={o}
                  onUpdate={updateTextOverride}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      <EditableText
                        value="Profile Views"
                        textKey="profile_performance.views_label"
                        overrides={o}
                        onUpdate={updateTextOverride}
                      />
                    </span>
                  </div>
                  <span className="text-4xl font-bold">{MOCK.views}</span>
                  <p className="text-muted-foreground mt-1">
                    <EditableText
                      value="All time"
                      textKey="profile_performance.views_subtitle"
                      overrides={o}
                      onUpdate={updateTextOverride}
                    />
                  </p>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground">
                      <EditableText
                        value="Completeness"
                        textKey="profile_performance.completeness_label"
                        overrides={o}
                        onUpdate={updateTextOverride}
                      />
                    </span>
                    <span className="font-semibold">{MOCK.completeness}%</span>
                  </div>
                  <Progress value={MOCK.completeness} className="h-2" />
                </div>
                <Button variant="outline" className="w-full mt-2">
                  <EditableText
                    value="Improve Profile"
                    textKey="profile_performance.button"
                    overrides={o}
                    onUpdate={updateTextOverride}
                  />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <EditableText
                  value="Quick Actions"
                  textKey="quick_actions.title"
                  overrides={o}
                  onUpdate={updateTextOverride}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  <EditableText
                    value="Browse Athlete Directory"
                    textKey="quick_actions.browse_athletes"
                    overrides={o}
                    onUpdate={updateTextOverride}
                  />
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  <EditableText
                    value="Browse Partner Directory"
                    textKey="quick_actions.browse_partners"
                    overrides={o}
                    onUpdate={updateTextOverride}
                  />
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <UserCircle className="mr-2 h-4 w-4" />
                  <EditableText
                    value="Update Profile"
                    textKey="quick_actions.update_profile"
                    overrides={o}
                    onUpdate={updateTextOverride}
                  />
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  <EditableText
                    value="View Connections"
                    textKey="quick_actions.view_connections"
                    overrides={o}
                    onUpdate={updateTextOverride}
                  />
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <EyeIcon className="mr-2 h-4 w-4" />
                  <EditableText
                    value="Preview Profile"
                    textKey="quick_actions.preview_profile"
                    overrides={o}
                    onUpdate={updateTextOverride}
                  />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                <EditableText
                  value="My Connections"
                  textKey="my_connections.title"
                  overrides={o}
                  onUpdate={updateTextOverride}
                />
              </CardTitle>
              <Button variant="link">
                <EditableText
                  value="View All"
                  textKey="my_connections.view_all"
                  overrides={o}
                  onUpdate={updateTextOverride}
                />
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {MOCK.athletes.map((a) => (
                <Card key={a.id} className="cursor-default hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback>
                          {a.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{a.name}</p>
                        <Badge variant="secondary" className="mt-2">
                          {a.sport}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                <EditableText
                  value="Featured Athletes"
                  textKey="featured_athletes.title"
                  overrides={o}
                  onUpdate={updateTextOverride}
                />
              </CardTitle>
              <Button variant="link">
                <EditableText
                  value="View All"
                  textKey="featured_athletes.view_all"
                  overrides={o}
                  onUpdate={updateTextOverride}
                />
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {MOCK.athletes.map((a) => (
                <Card key={a.id} className="cursor-default hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback>
                          {a.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{a.name}</p>
                        <Badge variant="secondary" className="mt-2">
                          {a.sport}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

      </section>
    </div>
  );
};

