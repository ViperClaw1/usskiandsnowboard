import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, AlertTriangle } from "lucide-react";

interface RoleChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  userName: string;
  role: string;
  action: 'grant' | 'revoke';
  isSelf: boolean;
}

export const RoleChangeDialog = ({
  open,
  onOpenChange,
  onConfirm,
  userName,
  role,
  action,
  isSelf,
}: RoleChangeDialogProps) => {
  const isAdminRole = role === 'admin';
  const isRevoking = action === 'revoke';

  const getTitle = () => {
    if (isSelf && isAdminRole && isRevoking) {
      return "⚠️ Warning: Cannot Remove Your Own Admin Access";
    }
    return isRevoking ? `Revoke ${role} Access?` : `Grant ${role} Access?`;
  };

  const getDescription = () => {
    if (isSelf && isAdminRole && isRevoking) {
      return "You cannot remove your own admin role to prevent account lockout. Please have another admin remove your role if needed.";
    }

    if (isAdminRole) {
      return isRevoking
        ? `Are you sure you want to revoke admin access from ${userName}? They will no longer be able to manage users or access admin features.`
        : `Are you sure you want to grant admin access to ${userName}? This will give them full access to manage all users and system settings.`;
    }

    return isRevoking
      ? `Remove ${role} role from ${userName}?`
      : `Grant ${role} role to ${userName}?`;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isAdminRole ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <Shield className="h-5 w-5 text-primary" />
            )}
            {getTitle()}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {getDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {!(isSelf && isAdminRole && isRevoking) && (
            <AlertDialogAction
              onClick={onConfirm}
              className={isAdminRole && isRevoking ? "bg-destructive" : ""}
            >
              {isRevoking ? "Revoke" : "Grant"} Role
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
