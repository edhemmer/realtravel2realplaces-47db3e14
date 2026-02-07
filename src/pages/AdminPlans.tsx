import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin, useAdminUsers, useUpdateUserTier, useDeleteUser } from '@/hooks/useAdminUsers';
import { SubscriptionTier } from '@/types/subscription';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Shield, Users, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { resolveEffectiveTier, type PlanTier } from '@/utils/planTier';

/**
 * Format last login display
 */
function formatLastLogin(lastSignInAt: string | null): string {
  if (!lastSignInAt) return 'Never';
  return format(new Date(lastSignInAt), 'MMM d, yyyy');
}

export default function AdminPlans() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: users = [], isLoading: usersLoading, refetch } = useAdminUsers();
  const updateTierMutation = useUpdateUserTier();
  const deleteUser = useDeleteUser();
  
  // Confirmation dialog state for tier downgrade
  const [pendingDowngrade, setPendingDowngrade] = useState<{ 
    userId: string; 
    email: string;
    fromTier: SubscriptionTier;
    toTier: SubscriptionTier;
  } | null>(null);
  
  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{ 
    userId: string; 
    email: string; 
    lastLogin: string | null 
  } | null>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) {
        navigate('/auth', { replace: true });
      } else if (isAdmin === false) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  const handleTierChange = (
    userId: string, 
    currentTier: SubscriptionTier, 
    newTier: SubscriptionTier, 
    email: string
  ) => {
    // If downgrading (to a lower tier), show confirmation
    const tierOrder: Record<SubscriptionTier, number> = { free: 0, pro: 1, business: 2 };
    if (tierOrder[newTier] < tierOrder[currentTier]) {
      setPendingDowngrade({ userId, email, fromTier: currentTier, toTier: newTier });
      return;
    }
    // Otherwise, proceed directly
    executeTierChange(userId, newTier);
  };

  const executeTierChange = async (userId: string, newTier: SubscriptionTier) => {
    try {
      await updateTierMutation.mutateAsync({ userId, tier: newTier });
      // Patch 2.6.18: Show confirmation that access has been refreshed
      toast.success('Plan updated. Access refreshed.');
    } catch (error) {
      console.error('Failed to update tier:', error);
      toast.error('Failed to update subscription tier');
    }
  };

  const confirmDowngrade = () => {
    if (pendingDowngrade) {
      executeTierChange(pendingDowngrade.userId, pendingDowngrade.toTier);
      setPendingDowngrade(null);
    }
  };

  const handleDeleteClick = (userId: string, email: string, lastLogin: string | null) => {
    // Prevent self-deletion
    if (userId === user?.id) {
      toast.error('You cannot delete your own account.');
      return;
    }
    setDeleteDialog({ userId, email, lastLogin });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog) return;

    try {
      const result = await deleteUser.mutateAsync(deleteDialog.userId);
      
      if (result.success) {
        toast.success(result.message || `Successfully deleted ${deleteDialog.email}`);
        refetch();
      } else {
        toast.error(result.error || 'This user cannot be deleted.');
      }
      setDeleteDialog(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user.');
      setDeleteDialog(null);
    }
  };

  // Show loading while checking auth/admin status
  if (authLoading || adminLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  // Don't render if not admin (redirect will happen)
  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Admin navigation */}
        <div className="mb-4 flex gap-4">
          <Link 
            to="/admin/users" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Users className="w-4 h-4" />
            User Management
          </Link>
          <Link 
            to="/admin/support-tickets" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Support Tickets
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Admin: Plan Management</CardTitle>
                <CardDescription>
                  Manage user subscription tiers (admin overrides, non-billed)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Lifetime Trips</TableHead>
                    <TableHead className="text-right">Current Trips</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const displayName = u.first_name && u.last_name 
                      ? `${u.first_name} ${u.last_name}`
                      : null;
                    const isCurrentUser = u.email === user?.email;
                    
                    // Patch 2.6.23: Use shared resolver for effective tier (single source of truth)
                    // The dropdown displays subscription_tier (effectiveTier = subscription now)
                    const effectiveTier = resolveEffectiveTier({
                      subscriptionTier: u.subscription_tier as PlanTier,
                    });
                    
                    return (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {displayName || u.email}
                              </span>
                              {isCurrentUser && (
                                <Badge variant="outline" className="text-xs">
                                  You
                                </Badge>
                              )}
                            </div>
                            {displayName && (
                              <span className="text-xs text-muted-foreground">
                                {u.email}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {/* Patch 2.6.22: Display effectiveTier directly, no tester/admin badges */}
                          {/* This matches the header PlanPill exactly */}
                          <Select
                            value={effectiveTier}
                            onValueChange={(value: SubscriptionTier) => 
                              handleTierChange(u.user_id, u.subscription_tier, value, u.email)
                            }
                            disabled={updateTierMutation.isPending}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="business">Business</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className={!u.last_sign_in_at ? 'text-muted-foreground italic' : ''}>
                          {formatLastLogin(u.last_sign_in_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          {u.lifetime_trip_count ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {u.current_trip_count ?? '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(parseISO(u.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(u.user_id, u.email, u.last_sign_in_at)}
                            className="text-destructive hover:text-destructive"
                            title="Delete user"
                            disabled={isCurrentUser}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Tier downgrade confirmation */}
      <AlertDialog open={!!pendingDowngrade} onOpenChange={(open) => !open && setPendingDowngrade(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Downgrade to {pendingDowngrade?.toTier ? 
                pendingDowngrade.toTier.charAt(0).toUpperCase() + pendingDowngrade.toTier.slice(1) : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This user will lose access to {pendingDowngrade?.fromTier === 'business' ? 'Business' : 'Pro'} features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDowngrade}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
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
