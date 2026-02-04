import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Shield, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPlans() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: users = [], isLoading: usersLoading } = useAdminUsers();
  const updateTierMutation = useUpdateUserTier();

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

  const handleTierChange = async (userId: string, newTier: SubscriptionTier) => {
    try {
      await updateTierMutation.mutateAsync({ userId, tier: newTier });
      toast.success(`Updated user to ${newTier} tier`);
    } catch (error) {
      console.error('Failed to update tier:', error);
      toast.error('Failed to update subscription tier');
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
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Trips</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">
                        {u.email}
                        {u.email === user?.email && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            You
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.subscription_tier}
                          onValueChange={(value: SubscriptionTier) => 
                            handleTierChange(u.user_id, value)
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
                      </TableCell>
                      <TableCell className="text-right">
                        {u.lifetime_trip_count}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(parseISO(u.created_at), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
