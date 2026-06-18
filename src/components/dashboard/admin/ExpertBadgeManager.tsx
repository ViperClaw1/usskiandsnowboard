import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Award, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Affiliate = "Athlete Alum" | "Trustee" | "Ambassador" | "Next Gen";

const AFFILIATE_OPTIONS: Affiliate[] = ["Athlete Alum", "Trustee", "Ambassador", "Next Gen"];

interface ExpertBadgeManagerProps {
  userId: string;
  userName: string;
  currentAffiliate: string | null;
}

export const ExpertBadgeManager = ({ userId, userName, currentAffiliate }: ExpertBadgeManagerProps) => {
  const queryClient = useQueryClient();

  const setBadgeMutation = useMutation({
    mutationFn: async (affiliate: Affiliate | null) => {
      const { error } = await supabase
        .from("expert_profiles")
        .update({
          ussa_affiliate: affiliate,
          is_alum: affiliate === "Athlete Alum",
        })
        .eq("user_id", userId);

      if (error) throw error;
      return affiliate;
    },
    onSuccess: (affiliate) => {
      queryClient.invalidateQueries({ queryKey: ["all-users-full"] });
      queryClient.invalidateQueries({ queryKey: ["expert-profiles"] });
      toast({
        title: affiliate ? "Badge updated" : "Badge removed",
        description: affiliate
          ? `Set "${affiliate}" for ${userName}`
          : `Cleared expert badge for ${userName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update badge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const current = (currentAffiliate || "").trim();
  const hasBadge = AFFILIATE_OPTIONS.includes(current as Affiliate);

  return (
    <div className="flex items-center gap-1.5">
      {hasBadge ? (
        <Badge variant="outline" className="flex items-center gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300">
          <Award className="h-3 w-3" />
          {current}
          <X
            className="h-3 w-3 cursor-pointer hover:opacity-70"
            onClick={() => setBadgeMutation.mutate(null)}
            aria-label="Remove badge"
          />
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground">No badge</span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={setBadgeMutation.isPending}
            aria-label="Change expert badge"
          >
            <Award className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {AFFILIATE_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option}
              onClick={() => setBadgeMutation.mutate(option)}
              disabled={current === option}
            >
              <Award className="h-4 w-4 mr-2" />
              {option}
            </DropdownMenuItem>
          ))}
          {hasBadge && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setBadgeMutation.mutate(null)}
                className="text-destructive focus:text-destructive"
              >
                <X className="h-4 w-4 mr-2" />
                Remove badge
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
