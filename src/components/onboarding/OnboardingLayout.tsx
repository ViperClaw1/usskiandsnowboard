import { ReactNode, useEffect } from "react";
import { ProgressBar } from "./ProgressBar";

interface OnboardingLayoutProps {
  currentStep: number;
  totalSteps: number;
  children: ReactNode;
  onNext: () => void;
  onBack: () => void;
  canGoNext: boolean;
}

export const OnboardingLayout = ({
  currentStep,
  totalSteps,
  children,
  onNext,
  onBack,
  canGoNext,
}: OnboardingLayoutProps) => {
  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter" && canGoNext && !e.shiftKey) {
        e.preventDefault();
        onNext();
      }
      if (e.key === "Escape" && currentStep > 0) {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentStep, canGoNext, onNext, onBack]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />

      <div className="flex-1 flex flex-col items-center justify-center p-4 pt-16">
        <div className="w-full max-w-1xl">
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}
            </p>
          </div>

          {children}
        </div>
      </div>

      <div className="text-center pb-8 text-xs text-muted-foreground">
        <p>Press Enter to continue • Esc to go back</p>
      </div>
    </div>
  );
};
