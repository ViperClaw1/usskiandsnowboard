import { Button } from "@/components/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, Sparkles } from "lucide-react";

interface ProfileCompletionChoiceDialogProps {
  onChooseAI: () => void;
  onChooseManual: () => void;
  onSkip: () => void;
  title?: string;
  description?: string;
}

export const ProfileCompletionChoiceDialog = ({
  onChooseAI,
  onChooseManual,
  onSkip,
  title = "Complete Your Profile",
  description = "Choose how you'd like to get started",
}: ProfileCompletionChoiceDialogProps) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {title}
        </DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3 pt-2">
        <Button onClick={onChooseAI}>
          <Sparkles className="mr-2 h-4 w-4" />
          Complete with AI
        </Button>
        <Button variant="outline" onClick={onChooseManual}>
          <ClipboardList className="mr-2 h-4 w-4" />
          Complete Manually
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
      </div>
    </>
  );
};
