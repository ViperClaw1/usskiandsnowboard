import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { UserRoleManager } from "./UserRoleManager";
import { Search, Trash2, UserPlus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export const FullUserManagementTable = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string; name: string } | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "athlete" as "athlete" | "employer" | "admin",
  });
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["all-users-full"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: allRoles, error: rolesError } = await supabase.from("user_roles").select("*");

      if (rolesError) throw rolesError;

      const { data: employers, error: employersError } = await supabase
        .from("employer_profiles")
        .select("user_id, company_name");

      if (employersError) throw employersError;

      const employerByUserId = (employers ?? []).reduce<Record<string, string>>((acc, row) => {
        acc[row.user_id] = row.company_name ?? "";
        return acc;
      }, {});

      // Fetch auth users to get email confirmation status
      const { data: { users: authUsers } = { users: [] }, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) {
        console.error("Error fetching auth users:", authError);
      }

      return (
        profiles?.map((profile) => {
          const userRoles = allRoles.filter((r) => r.user_id === profile.id).map((r) => r.role);

          const authUser = authUsers?.find((u: any) => u.id === profile.id);
          const isEmployer = userRoles.includes("employer");

          return {
            ...profile,
            roles: userRoles.length > 0 ? userRoles : [],
            emailConfirmed: authUser?.email_confirmed_at != null,
            companyName: isEmployer ? (employerByUserId[profile.id] ?? null) : null,
          };
        }) || []
      );
    },
  });

  // Removed temp password functionality - using single invite code instead

  const inviteUserMutation = useMutation({
    mutationFn: async (userData: typeof inviteForm) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("invite-user", {
        body: userData,
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      return response.data;
    },
    onSuccess: () => {
      toast.success("User invited successfully! They will receive an email to set their password.");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setIsInviteDialogOpen(false);
      setInviteForm({
        email: "",
        firstName: "",
        lastName: "",
        role: "athlete",
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to invite user: ${error.message}`);
    },
  });

  const resendConfirmationMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await supabase.functions.invoke("resend-confirmation", {
        body: { email },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
    },
    onSuccess: () => {
      toast.success("Confirmation email sent successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to resend confirmation: ${error.message}`);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      return response.data;
    },
    onSuccess: () => {
      toast.success("User deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete user: ${error.message}`);
    },
  });

  const handleDeleteUser = (userId: string, userEmail: string, userName: string) => {
    setUserToDelete({ id: userId, email: userEmail, name: userName });
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  const handleInviteUser = () => {
    if (!inviteForm.email || !inviteForm.role) {
      toast.error("Email and role are required");
      return;
    }
    inviteUserMutation.mutate(inviteForm);
  };

  const companyOptions = users
    ? [
        ...new Set(
          users
            .filter(
              (u) => (u.roles as string[]).includes("employer") && (u as { companyName?: string | null }).companyName,
            )
            .map((u) => (u as { companyName: string }).companyName),
        ),
      ].sort()
    : [];

  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === "all" ||
      (user.roles as string[]).includes(roleFilter) ||
      (roleFilter === "none" && user.roles.length === 0);

    const matchesCompany =
      roleFilter !== "employer" ||
      companyFilter === "all" ||
      (user as { companyName?: string | null }).companyName === companyFilter;

    return matchesSearch && matchesRole && matchesCompany;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between my-[5px] gap-0">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user roles and access permissions</CardDescription>
          </div>
          <Button onClick={() => setIsInviteDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>

        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v);
              if (v !== "employer") setCompanyFilter("all");
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="athlete">Athlete</SelectItem>
              <SelectItem value="employer">Employer</SelectItem>
              <SelectItem value="none">No Role</SelectItem>
            </SelectContent>
          </Select>

          {roleFilter === "employer" && (
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companyOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Company Name</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredUsers && filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name || "N/A"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {currentUser && (
                      <UserRoleManager
                        userId={user.id}
                        currentUserId={currentUser.id}
                        userEmail={user.email}
                        userName={user.full_name || ""}
                        roles={user.roles as ("admin" | "athlete" | "employer")[]}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {(user as { companyName?: string | null }).companyName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(user.created_at), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {!user.emailConfirmed && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => resendConfirmationMutation.mutate(user.email)}
                          disabled={resendConfirmationMutation.isPending}
                          title="Resend confirmation email"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUser(user.id, user.email, user.full_name || "")}
                        disabled={currentUser?.id === user.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.name || userToDelete?.email}</strong>? This action
              cannot be undone and will permanently delete all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Send an invitation email to a new user. They'll receive a link to set their password.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={inviteForm.firstName}
                onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={inviteForm.lastName}
                onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value: "athlete" | "employer" | "admin") =>
                  setInviteForm({ ...inviteForm, role: value })
                }
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="athlete">Athlete</SelectItem>
                  <SelectItem value="employer">Employer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteUser} disabled={inviteUserMutation.isPending}>
              {inviteUserMutation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
