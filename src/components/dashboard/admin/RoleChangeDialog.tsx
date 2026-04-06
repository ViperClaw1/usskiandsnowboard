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
  currentRoles?: string[];
}

export const RoleChangeDialog = ({
  open,
  onOpenChange,
  onConfirm,
  userName,
  role,
  action,
  isSelf,
  currentRoles = [],
}: RoleChangeDialogProps) => {
  const isAdminRole = role === 'admin';
  const isRevoking = action === 'revoke';
  
  // Check for conflicting roles - all roles are mutually exclusive
  const conflictingRoles: string[] = [];
  if (role === 'admin' && !isRevoking) {
    if (currentRoles.includes('athlete')) conflictingRoles.push('athlete');
    if (currentRoles.includes('employer')) conflictingRoles.push('employer');
  } else if (role === 'athlete' && !isRevoking) {
    if (currentRoles.includes('employer')) conflictingRoles.push('employer');
    if (currentRoles.includes('admin')) conflictingRoles.push('admin');
  } else if (role === 'employer' && !isRevoking) {
    if (currentRoles.includes('athlete')) conflictingRoles.push('athlete');
    if (currentRoles.includes('admin')) conflictingRoles.push('admin');
  }

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

    if (conflictingRoles.length > 0 && action === 'grant') {
      const rolesList = conflictingRoles.join(' and ');
      return `${userName} currently has the ${rolesList} role${conflictingRoles.length > 1 ? 's' : ''}. Granting ${role} access will automatically remove their ${rolesList} role${conflictingRoles.length > 1 ? 's' : ''}. Each user can only have one role (admin, athlete, or employer). Do you want to proceed?`;
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
