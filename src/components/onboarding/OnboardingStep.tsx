import { ReactNode } from "react";

interface OnboardingStepProps {
  title: string;
  description?: string;
  children: ReactNode;
  optional?: boolean;
}

export const OnboardingStep = ({
  title,
  description,
  children,
  optional,
}: OnboardingStepProps) => {
  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {title}
          </h2>
          {description && (
            <p className="text-base md:text-lg text-muted-foreground">
              {description}
            </p>
          )}
          {optional && (
            <p className="text-sm text-muted-foreground italic">Optional</p>
          )}
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
};
