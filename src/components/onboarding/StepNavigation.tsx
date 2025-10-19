import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
  nextLabel?: string;
}

export const StepNavigation = ({
  currentStep,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  onSkip,
  isLoading,
  nextLabel = "Next",
}: StepNavigationProps) => {
  return (
    <div className="flex items-center justify-between w-full mt-8">
      <div>
        {canGoBack && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onBack}
            disabled={isLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {onSkip && (
          <Button
            type="button"
            variant="link"
            onClick={onSkip}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          onClick={onNext}
          disabled={!canGoNext || isLoading}
          className="h-12 px-8 text-lg"
        >
          {nextLabel}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
