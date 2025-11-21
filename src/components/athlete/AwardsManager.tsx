import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Award, Plus, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface AwardData {
  id: string;
  title: string;
  description: string | null;
  issuer: string;
  award_date: string;
  image_url: string | null;
  created_at: string;
}

interface AwardsManagerProps {
  athleteId: string;
}

export function AwardsManager({ athleteId }: AwardsManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newAward, setNewAward] = useState({
    title: "",
    description: "",
    issuer: "",
    award_date: "",
  });
  const queryClient = useQueryClient();

  const { data: awards, isLoading } = useQuery({
    queryKey: ["athlete-awards", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_awards")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("award_date", { ascending: false });

      if (error) throw error;
      return data as AwardData[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("athlete_awards")
        .insert({
          athlete_id: athleteId,
          title: newAward.title,
          description: newAward.description || null,
          issuer: newAward.issuer,
          award_date: newAward.award_date,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete-awards", athleteId] });
      setNewAward({
        title: "",
        description: "",
        issuer: "",
        award_date: "",
      });
      setIsAdding(false);
      toast.success("Award added successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add award: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("athlete_awards")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete-awards", athleteId] });
      toast.success("Award deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAward.title || !newAward.issuer || !newAward.award_date) {
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
          Add Award
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>New Award</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="award-title">Award Title *</Label>
                <Input
                  id="award-title"
                  value={newAward.title}
                  onChange={(e) => setNewAward({ ...newAward, title: e.target.value })}
                  placeholder="e.g., Athlete of the Year"
                  maxLength={150}
                  required
                />
              </div>

              <div>
                <Label htmlFor="award-issuer">Issuer/Organization *</Label>
                <Input
                  id="award-issuer"
                  value={newAward.issuer}
                  onChange={(e) => setNewAward({ ...newAward, issuer: e.target.value })}
                  placeholder="e.g., U.S. Ski & Snowboard"
                  maxLength={150}
                  required
                />
              </div>

              <div>
                <Label htmlFor="award-date">Date Received *</Label>
                <Input
                  id="award-date"
                  type="date"
                  value={newAward.award_date}
                  onChange={(e) => setNewAward({ ...newAward, award_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="award-description">Description</Label>
                <Textarea
                  id="award-description"
                  value={newAward.description}
                  onChange={(e) => setNewAward({ ...newAward, description: e.target.value })}
                  placeholder="Add details about this award..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Award"}
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
        <h3 className="font-semibold">Awards & Recognition ({awards?.length || 0})</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : awards && awards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {awards.map((award) => (
              <Card key={award.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Award className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{award.title}</h4>
                        <p className="text-sm text-muted-foreground">{award.issuer}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(award.award_date), "MMMM yyyy")}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(award.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {award.description && (
                    <p className="text-sm text-muted-foreground">{award.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No awards added yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}