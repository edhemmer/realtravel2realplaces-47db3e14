import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useIsAdmin, useAdminUsers, useUpdateUserName, useDeleteUser } from '@/hooks/useAdminUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Pencil, Trash2, Users, Loader2, Clock, Filter } from 'lucide-react';
import { format, differenceInMonths } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface EditUserData {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

// Inactivity threshold in months
const INACTIVE_THRESHOLD_MONTHS = 9;

/**
 * Patch 2.6.11: Check if user is inactive (9+ months since last login or never logged in)
 */
function isUserInactive(lastSignInAt: string | null, createdAt: string): boolean {
  if (!lastSignInAt) {
    // Never logged in - check if account is older than threshold
    const monthsSinceCreation = differenceInMonths(new Date(), new Date(createdAt));
    return monthsSinceCreation >= INACTIVE_THRESHOLD_MONTHS;
  }
  const monthsSinceLogin = differenceInMonths(new Date(), new Date(lastSignInAt));
  return monthsSinceLogin >= INACTIVE_THRESHOLD_MONTHS;
}

/**
 * Format last login display
 */
function formatLastLogin(lastSignInAt: string | null): string {
  if (!lastSignInAt) return 'Never';
  return format(new Date(lastSignInAt), 'MMM d, yyyy');
}

/**
 * Get tier badge styling
 */
function getTierBadgeVariant(tier: string): 'default' | 'secondary' | 'outline' {
  switch (tier) {
    case 'pro':
      return 'default';
    case 'business':
      return 'default';
    default:
      return 'secondary';
  }
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin();
  const { data: users, isLoading: loadingUsers, refetch } = useAdminUsers();
  const updateUserName = useUpdateUserName();
  const deleteUser = useDeleteUser();

  const [editDialog, setEditDialog] = useState<EditUserData | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ userId: string; email: string; lastLogin: string | null } | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);

  // Filter users based on inactivity toggle
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!showInactiveOnly) return users;
    return users.filter(user => isUserInactive(user.last_sign_in_at, user.created_at));
  }, [users, showInactiveOnly]);

  // Count inactive users for badge
  const inactiveCount = useMemo(() => {
    if (!users) return 0;
    return users.filter(user => isUserInactive(user.last_sign_in_at, user.created_at)).length;
  }, [users]);

  // Show loading while checking admin status
  if (checkingAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  // Redirect non-admins
  if (!isAdmin) {
    return (
      <Layout>
        <Card className="max-w-md mx-auto mt-12">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const handleEditClick = (user: EditUserData) => {
    setEditDialog(user);
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
  };

  const handleEditSave = async () => {
    if (!editDialog) return;

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || !trimmedLast) {
      toast({
        title: 'Validation Error',
        description: 'First name and last name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateUserName.mutateAsync({
        userId: editDialog.userId,
        firstName: trimmedFirst,
        lastName: trimmedLast,
      });
      toast({
        title: 'User Updated',
        description: `Successfully updated name for ${editDialog.email}`,
      });
      setEditDialog(null);
      refetch();
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update user name.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (userId: string, email: string, lastLogin: string | null) => {
    // Prevent self-deletion
    if (userId === currentUser?.id) {
      toast({
        title: 'Cannot Delete',
        description: 'You cannot delete your own account.',
        variant: 'destructive',
      });
      return;
    }
    setDeleteDialog({ userId, email, lastLogin });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog) return;

    try {
      const result = await deleteUser.mutateAsync(deleteDialog.userId);
      
      if (result.success) {
        toast({
          title: 'User Deleted',
          description: result.message || `Successfully deleted ${deleteDialog.email}`,
        });
        refetch();
      } else {
        toast({
          title: 'Cannot Delete User',
          description: result.error || 'This user cannot be deleted.',
          variant: 'destructive',
        });
      }
      setDeleteDialog(null);
    } catch (error: any) {
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete user.',
        variant: 'destructive',
      });
      setDeleteDialog(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Admin: User Management
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage user accounts, view activity, and remove inactive users
            </p>
          </div>
        </div>

        {/* Admin Navigation */}
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/admin/users')}
          >
            Users
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/plans')}
          >
            Plans
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/support-tickets')}
          >
            Support Tickets
          </Button>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  {filteredUsers?.length || 0} user{filteredUsers?.length !== 1 ? 's' : ''}
                  {showInactiveOnly && ' (inactive only)'}
                </CardDescription>
              </div>
              <Button
                variant={showInactiveOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowInactiveOnly(!showInactiveOnly)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Inactive ({inactiveCount})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !filteredUsers?.length ? (
              <p className="text-muted-foreground text-center py-8">
                {showInactiveOnly ? 'No inactive users found.' : 'No users found.'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const inactive = isUserInactive(user.last_sign_in_at, user.created_at);
                    return (
                      <TableRow 
                        key={user.user_id}
                        className={cn(inactive && 'bg-muted/30')}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {user.first_name || user.last_name
                              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                              : <span className="text-muted-foreground italic">No name</span>}
                            {inactive && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getTierBadgeVariant(user.subscription_tier)}>
                            {user.subscription_tier.charAt(0).toUpperCase() + user.subscription_tier.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn(!user.last_sign_in_at && 'text-muted-foreground italic')}>
                          {formatLastLogin(user.last_sign_in_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick({
                                userId: user.user_id,
                                firstName: user.first_name || '',
                                lastName: user.last_name || '',
                                email: user.email,
                              })}
                              title="Edit name"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(user.user_id, user.email, user.last_sign_in_at)}
                              className="text-destructive hover:text-destructive"
                              title="Delete user"
                              disabled={user.user_id === currentUser?.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Name Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Name</DialogTitle>
            <DialogDescription>
              Update the display name for {editDialog?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditSave}
              disabled={updateUserName.isPending}
            >
              {updateUserName.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog - Patch 2.6.11: Enhanced with clear explanations */}
      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to delete <strong>{deleteDialog?.email}</strong>?
                </p>
                <div className="bg-muted/50 rounded-md p-3 text-sm space-y-2">
                  <p className="font-medium">This action will:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Prevent this user from logging in</li>
                    <li>Remove their profile data</li>
                    <li>Archive/remove their data according to retention policy</li>
                  </ul>
                </div>
                {deleteDialog?.lastLogin && (
                  <p className="text-xs text-muted-foreground">
                    Last login: {formatLastLogin(deleteDialog.lastLogin)}
                  </p>
                )}
                <p className="text-sm font-medium text-destructive">
                  Users with existing trips cannot be deleted.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}