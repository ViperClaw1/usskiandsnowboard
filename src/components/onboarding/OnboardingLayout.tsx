export const OnboardingLayout = ({
  currentStep,
  totalSteps,
  children,
  onNext,
  onBack,
  canGoNext,
}: OnboardingLayoutProps) => {
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
    <div className="flex flex-col bg-background">
      <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
      <div className="flex flex-col items-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}
            </p>
          </div>
          {children}
        </div>
      </div>
      <div className="text-center pb-4 text-xs text-muted-foreground">
        <p>Press Enter to continue • Esc to go back</p>
      </div>
    </div>
  );
};
