import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface InviteCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userEmail: string;
}

export const InviteCodeDialog = ({ open, onOpenChange, userName, userEmail }: InviteCodeDialogProps) => {
  const [copied, setCopied] = useState(false);
  
  // For now, use the default invite code. In the future, this could be user-specific
  const inviteCode = "cortina26";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Invite code copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Code</DialogTitle>
          <DialogDescription>
            Share this code with {userName || userEmail} to allow them to create an account.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Invite Code</Label>
            <div className="flex gap-2">
              <Input 
                value={inviteCode} 
                readOnly 
                className="font-mono text-lg font-bold"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">User Details:</p>
            <p className="text-sm"><strong>Name:</strong> {userName || 'N/A'}</p>
            <p className="text-sm"><strong>Email:</strong> {userEmail}</p>
          </div>
          
          <p className="text-sm text-muted-foreground">
            The user will need to enter this code during the sign-up process to create their account.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
