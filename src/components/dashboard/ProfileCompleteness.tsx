import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileCompletenessProps {
  completeness: number;
  missingFields?: {
    label: string;
    completed: boolean;
  }[];
}

export const ProfileCompleteness = ({
  completeness,
  missingFields = [],
}: ProfileCompletenessProps) => {
  const getMilestoneColor = (milestone: number) => {
    if (completeness >= milestone) return "text-primary";
    return "text-muted-foreground";
  };

  const getMilestoneIcon = (milestone: number) => {
    if (completeness >= milestone) {
      return <Check className="h-4 w-4" />;
    }
    return <Circle className="h-4 w-4" />;
  };

  const milestones = [0, 50, 100];

  return (
    <Card className="shadow-elegant">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Portfolio Completeness - {completeness}%</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative pt-3 pb-6">
          <Progress value={completeness} className="h-3" />
          
          {/* Circle markers on the bar */}
          <div className="absolute top-0 left-0 right-0 flex justify-between">
            {milestones.map((milestone) => (
              <div
                key={milestone}
                className={cn(
                  "flex flex-col items-center -translate-x-2 first:translate-x-0 last:translate-x-0",
                  getMilestoneColor(milestone)
                )}
                style={{ 
                  marginLeft: milestone === 0 ? '0' : milestone === 50 ? 'calc(50% - 8px)' : 'auto',
                  marginRight: milestone === 100 ? '0' : 'auto'
                }}
              >
                <div className="bg-background rounded-full p-0.5">
                  {getMilestoneIcon(milestone)}
                </div>
                <span className="text-xs font-medium mt-4">{milestone}%</span>
              </div>
            ))}
          </div>
        </div>

        {missingFields.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium">Complete your profile:</p>
            <div className="space-y-1">
              {missingFields.map((field, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm"
                >
                  {field.completed ? (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={field.completed ? "text-muted-foreground" : ""}>
                    {field.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {completeness === 100 && (
          <div className="bg-primary/10 text-primary p-3 rounded-lg text-sm text-center font-medium animate-fade-in">
            🎉 Profile Complete! You're ready to connect!
          </div>
        )}
      </CardContent>
    </Card>
  );
};
