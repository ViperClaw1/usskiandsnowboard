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

  const milestones = [
    { value: 0, position: '0%' },
    { value: 50, position: '50%' },
    { value: 100, position: '100%' }
  ];

  return (
    <Card className="shadow-elegant">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Portfolio Completeness - {completeness}%</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative pt-3 pb-6">
          <Progress value={completeness} className="h-3" />
          
          {/* Circle markers on the bar */}
          {milestones.map((milestone) => (
            <div
              key={milestone.value}
              className={cn(
                "absolute top-0 flex flex-col items-center -translate-x-2",
                getMilestoneColor(milestone.value)
              )}
              style={{ left: milestone.position }}
            >
              <div className="bg-background rounded-full p-0.5">
                <Circle className="h-4 w-4 fill-current" />
              </div>
              <span className="text-xs font-medium mt-4">{milestone.value}%</span>
            </div>
          ))}
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
