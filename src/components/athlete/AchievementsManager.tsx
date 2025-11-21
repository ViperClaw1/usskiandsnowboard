import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trophy, Plus, Trash2, Calendar, MapPin, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Achievement {
  id: string;
  title: string;
  description: string | null;
  achievement_date: string;
  category: string | null;
  location: string | null;
  result: string | null;
  created_at: string;
}

interface AchievementsManagerProps {
  athleteId: string;
}

export function AchievementsManager({ athleteId }: AchievementsManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newAchievement, setNewAchievement] = useState({
    title: "",
    description: "",
    achievement_date: "",
    category: "competition" as const,
    location: "",
    result: "",
  });
  const queryClient = useQueryClient();

  const { data: achievements, isLoading } = useQuery({
    queryKey: ["athlete-achievements", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_achievements")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("achievement_date", { ascending: false });

      if (error) throw error;
      return data as Achievement[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("athlete_achievements")
        .insert({
          athlete_id: athleteId,
          title: newAchievement.title,
          description: newAchievement.description || null,
          achievement_date: newAchievement.achievement_date,
          category: newAchievement.category,
          location: newAchievement.location || null,
          result: newAchievement.result || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete-achievements", athleteId] });
      setNewAchievement({
        title: "",
        description: "",
        achievement_date: "",
        category: "competition",
        location: "",
        result: "",
      });
      setIsAdding(false);
      toast.success("Achievement added successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add achievement: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("athlete_achievements")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete-achievements", athleteId] });
      toast.success("Achievement deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAchievement.title || !newAchievement.achievement_date) {
      toast.error("Please fill in required fields");
      return;
    }
    addMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {!isAdding ? (
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Achievement
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>New Achievement</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="achievement-title">Title *</Label>
                <Input
                  id="achievement-title"
                  value={newAchievement.title}
                  onChange={(e) => setNewAchievement({ ...newAchievement, title: e.target.value })}
                  placeholder="e.g., 1st Place - National Championship"
                  maxLength={150}
                  required
                />
              </div>

              <div>
                <Label htmlFor="achievement-description">Description</Label>
                <Textarea
                  id="achievement-description"
                  value={newAchievement.description}
                  onChange={(e) => setNewAchievement({ ...newAchievement, description: e.target.value })}
                  placeholder="Add details about this achievement..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="achievement-date">Date *</Label>
                  <Input
                    id="achievement-date"
                    type="date"
                    value={newAchievement.achievement_date}
                    onChange={(e) => setNewAchievement({ ...newAchievement, achievement_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="achievement-category">Category</Label>
                  <Select
                    value={newAchievement.category}
                    onValueChange={(value: any) => setNewAchievement({ ...newAchievement, category: value })}
                  >
                    <SelectTrigger id="achievement-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="competition">Competition</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="achievement-location">Location</Label>
                  <Input
                    id="achievement-location"
                    value={newAchievement.location}
                    onChange={(e) => setNewAchievement({ ...newAchievement, location: e.target.value })}
                    placeholder="e.g., Aspen, CO"
                    maxLength={100}
                  />
                </div>

                <div>
                  <Label htmlFor="achievement-result">Result/Placement</Label>
                  <Input
                    id="achievement-result"
                    value={newAchievement.result}
                    onChange={(e) => setNewAchievement({ ...newAchievement, result: e.target.value })}
                    placeholder="e.g., 1st Place, Gold Medal"
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Achievement"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="font-semibold">Timeline ({achievements?.length || 0})</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : achievements && achievements.length > 0 ? (
          <div className="space-y-4">
            {achievements.map((achievement, index) => (
              <div key={achievement.id} className="relative">
                {index !== achievements.length - 1 && (
                  <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border" />
                )}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Trophy className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{achievement.title}</h4>
                            {achievement.result && (
                              <p className="text-sm text-primary font-medium">{achievement.result}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(achievement.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {achievement.description && (
                          <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(achievement.achievement_date), "MMM d, yyyy")}
                          </span>
                          {achievement.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {achievement.location}
                            </span>
                          )}
                          {achievement.category && (
                            <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                              {achievement.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No achievements added yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}