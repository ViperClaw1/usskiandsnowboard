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

  return (
    <Card className="shadow-elegant">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Profile Completeness</span>
          <span className="text-2xl font-bold">{completeness}%</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Progress value={completeness} className="h-3" />
          <div className="absolute top-0 left-0 right-0 flex justify-between px-1 -mt-6">
            <div className={cn("flex flex-col items-center", getMilestoneColor(50))}>
              {getMilestoneIcon(50)}
              <span className="text-xs mt-1">50%</span>
            </div>
            <div className={cn("flex flex-col items-center", getMilestoneColor(75))}>
              {getMilestoneIcon(75)}
              <span className="text-xs mt-1">75%</span>
            </div>
            <div className={cn("flex flex-col items-center", getMilestoneColor(100))}>
              {getMilestoneIcon(100)}
              <span className="text-xs mt-1">100%</span>
            </div>
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
