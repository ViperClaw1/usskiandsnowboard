import { TextareaHTMLAttributes } from "react";
import { OnboardingStep } from "@/components/onboarding/OnboardingStep";
import { StepNavigation } from "@/components/onboarding/StepNavigation";
import { Textarea } from "@/components/ui/textarea";

interface OnboardingTextareaStepProps {
  title: string;
  description?: string;
  placeholder: string;
  textareaProps: TextareaHTMLAttributes<HTMLTextAreaElement>;
  showCharCount?: boolean;
  charCount?: number;
  charLimit?: number;
  currentStep: number;
  totalSteps: number;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
}

export const OnboardingTextareaStep = ({
  title,
  description,
  placeholder,
  textareaProps,
  showCharCount = false,
  charCount = 0,
  charLimit,
  currentStep,
  totalSteps,
  canGoNext,
  onBack,
  onNext,
}: OnboardingTextareaStepProps) => {
  return (
    <OnboardingStep title={title} description={description}>
      <Textarea
        placeholder={placeholder}
        className="min-h-32 text-lg px-4 py-3 border-2"
        {...textareaProps}
      />
      {showCharCount && typeof charLimit === "number" && (
        <p className="text-sm text-muted-foreground mt-2">
          {charCount}/{charLimit} characters
        </p>
      )}
      <StepNavigation
        currentStep={currentStep}
        totalSteps={totalSteps}
        canGoBack={true}
        canGoNext={canGoNext}
        onBack={onBack}
        onNext={onNext}
      />
    </OnboardingStep>
  );
};
