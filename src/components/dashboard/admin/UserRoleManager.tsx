import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, UserPlus, UserMinus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RoleChangeDialog } from "./RoleChangeDialog";

type AppRole = "admin" | "athlete" | "employer";

interface UserRoleManagerProps {
  userId: string;
  currentUserId: string;
  userEmail: string;
  userName: string;
  roles: AppRole[];
}

export const UserRoleManager = ({ 
  userId, 
  currentUserId, 
  userEmail, 
  userName,
  roles 
}: UserRoleManagerProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    role: AppRole;
    action: 'grant' | 'revoke';
  } | null>(null);
  const queryClient = useQueryClient();
  const isSelf = userId === currentUserId;

  const grantRoleMutation = useMutation({
    mutationFn: async (role: AppRole) => {
      const conflictingRoles: AppRole[] = [];
      
      // Admin is mutually exclusive with athlete and employer
      if (role === 'admin') {
        if (roles.includes('athlete')) conflictingRoles.push('athlete');
        if (roles.includes('employer')) conflictingRoles.push('employer');
      }
      // Athlete and employer are mutually exclusive with each other AND with admin
      else if (role === 'athlete') {
        if (roles.includes('employer')) conflictingRoles.push('employer');
        if (roles.includes('admin')) conflictingRoles.push('admin');
      }
      else if (role === 'employer') {
        if (roles.includes('athlete')) conflictingRoles.push('athlete');
        if (roles.includes('admin')) conflictingRoles.push('admin');
      }
      
      // Remove all conflicting roles
      if (conflictingRoles.length > 0) {
        for (const conflictRole of conflictingRoles) {
          const { error: revokeError } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', userId)
            .eq('role', conflictRole);
          
          if (revokeError) throw revokeError;
        }
      }
      
      // Then grant the new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      
      if (error) throw error;
      
      return { role, conflictingRoles };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      const message = data.conflictingRoles.length > 0
        ? `Switched from ${data.conflictingRoles.join(', ')} to ${data.role} for ${userName || userEmail}`
        : `${data.role} role granted to ${userName || userEmail}`;
      
      toast({
        title: "Role updated",
        description: message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revokeRoleMutation = useMutation({
    mutationFn: async (role: AppRole) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      
      if (error) throw error;
    },
    onSuccess: (_, role) => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast({
        title: "Role revoked",
        description: `${role} role revoked from ${userName || userEmail}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRoleAction = (role: AppRole, action: 'grant' | 'revoke') => {
    // Check if granting a conflicting role
    const hasConflictingRole = 
      (role === 'admin' && (roles.includes('athlete') || roles.includes('employer'))) ||
      (role === 'athlete' && (roles.includes('employer') || roles.includes('admin'))) ||
      (role === 'employer' && (roles.includes('athlete') || roles.includes('admin')));
    
    // Always show dialog for admin changes, self-changes, or conflicting roles
    if (role === 'admin' || isSelf || (action === 'grant' && hasConflictingRole)) {
      setPendingAction({ role, action });
      setDialogOpen(true);
    } else {
      if (action === 'grant') {
        grantRoleMutation.mutate(role);
      } else {
        revokeRoleMutation.mutate(role);
      }
    }
  };

  const confirmRoleAction = () => {
    if (!pendingAction) return;
    
    if (pendingAction.action === 'grant') {
      grantRoleMutation.mutate(pendingAction.role);
    } else {
      revokeRoleMutation.mutate(pendingAction.role);
    }
    
    setDialogOpen(false);
    setPendingAction(null);
  };

  const availableRoles: AppRole[] = ['admin', 'athlete', 'employer'];

  return (
    <>
      <div className="flex items-center gap-2">
        {(roles || []).map(role => (
          <Badge 
            key={role}
            variant={
              role === 'admin' ? 'destructive' :
              role === 'athlete' ? 'default' :
              'secondary'
            }
            className="flex items-center gap-1"
          >
            {role}
            {(!isSelf || role !== 'admin') && (
              <UserMinus 
                className="h-3 w-3 cursor-pointer hover:opacity-70"
                onClick={() => handleRoleAction(role, 'revoke')}
              />
            )}
          </Badge>
        ))}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <UserPlus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableRoles.filter(role => !(roles || []).includes(role)).map(role => (
              <DropdownMenuItem
                key={role}
                onClick={() => handleRoleAction(role, 'grant')}
                disabled={isSelf && role === 'admin'}
              >
                <Shield className="h-4 w-4 mr-2" />
                Grant {role} role
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <RoleChangeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={confirmRoleAction}
        userName={userName || userEmail}
        role={pendingAction?.role || 'admin'}
        action={pendingAction?.action || 'grant'}
        isSelf={isSelf}
        currentRoles={roles}
      />
    </>
  );
};
