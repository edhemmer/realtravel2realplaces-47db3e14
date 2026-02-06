import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin, useAdminUsers, useUpdateUserTier } from '@/hooks/useAdminUsers';
import { SubscriptionTier } from '@/types/subscription';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Shield, Users, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPlans() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: users = [], isLoading: usersLoading } = useAdminUsers();
  const updateTierMutation = useUpdateUserTier();
  
  // Confirmation dialog state for Pro → Free downgrade
  const [pendingDowngrade, setPendingDowngrade] = useState<{ userId: string; email: string } | null>(null);

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

  const handleTierChange = (userId: string, currentTier: SubscriptionTier, newTier: SubscriptionTier, email: string) => {
    // If downgrading from Pro to Free, show confirmation
    if (currentTier === 'pro' && newTier === 'free') {
      setPendingDowngrade({ userId, email });
      return;
    }
    // Otherwise, proceed directly
    executeTierChange(userId, newTier);
  };

  const executeTierChange = async (userId: string, newTier: SubscriptionTier) => {
    try {
      await updateTierMutation.mutateAsync({ userId, tier: newTier });
      toast.success(`Updated user to ${newTier} tier`);
    } catch (error) {
      console.error('Failed to update tier:', error);
      toast.error('Failed to update subscription tier');
    }
  };

  const confirmDowngrade = () => {
    if (pendingDowngrade) {
      executeTierChange(pendingDowngrade.userId, 'free');
      setPendingDowngrade(null);
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
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* Admin navigation */}
        <div className="mb-4">
          <Link 
            to="/admin/support-tickets" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Support tickets
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Admin: Plan Management</CardTitle>
                <CardDescription>
                  Beta admin dashboard for managing user subscription tiers
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
                    <TableHead className="text-right">Lifetime Trips</TableHead>
                    <TableHead className="text-right">Current Trips</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const displayName = u.first_name && u.last_name 
                      ? `${u.first_name} ${u.last_name}`
                      : null;
                    const isCurrentUser = u.email === user?.email;
                    const isProOverride = u.subscription_tier === 'pro';
                    
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
                          <div className="flex items-center gap-2">
                            <Select
                              value={u.subscription_tier}
                              onValueChange={(value: SubscriptionTier) => 
                                handleTierChange(u.user_id, u.subscription_tier, value, u.email)
                              }
                              disabled={updateTierMutation.isPending}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                              </SelectContent>
                            </Select>
                            {isProOverride && (
                              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                Admin override
                              </Badge>
                            )}
                          </div>
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pro → Free downgrade confirmation */}
      <AlertDialog open={!!pendingDowngrade} onOpenChange={(open) => !open && setPendingDowngrade(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Downgrade to Free?</AlertDialogTitle>
            <AlertDialogDescription>
              This user will lose access to Pro features.
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
    </Layout>
  );
}
