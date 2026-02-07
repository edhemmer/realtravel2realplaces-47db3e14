import { useState } from 'react';
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
import { ArrowLeft, Pencil, Trash2, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface EditUserData {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin();
  const { data: users, isLoading: loadingUsers, refetch } = useAdminUsers();
  const updateUserName = useUpdateUserName();
  const deleteUser = useDeleteUser();

  const [editDialog, setEditDialog] = useState<EditUserData | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ userId: string; email: string } | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

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

  const handleDeleteClick = (userId: string, email: string) => {
    // Prevent self-deletion
    if (userId === currentUser?.id) {
      toast({
        title: 'Cannot Delete',
        description: 'You cannot delete your own account.',
        variant: 'destructive',
      });
      return;
    }
    setDeleteDialog({ userId, email });
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
              Admin: Users
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage user accounts and display names
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
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              {users?.length || 0} registered user{users?.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !users?.length ? (
              <p className="text-muted-foreground text-center py-8">
                No users found.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        {user.first_name || user.last_name
                          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                          : <span className="text-muted-foreground italic">No name</span>}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
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
                            onClick={() => handleDeleteClick(user.user_id, user.email)}
                            className="text-destructive hover:text-destructive"
                            title="Delete user"
                            disabled={user.user_id === currentUser?.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDialog?.email}</strong>?
              <br /><br />
              This action cannot be undone. Users with existing trips cannot be deleted.
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
