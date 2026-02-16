/**
 * MembersTab — v3.8.4: Trip Members + Invite Member UI
 * 
 * Shows trip_members list (Owner/Guest badges).
 * Owner-only: Invite Member modal, Pending Invites with Revoke.
 * No Date() usage. No backend changes.
 */

import { useState, useCallback } from 'react';
import { useTripMembers, useTripInvites, useCreateTripInvite, useRevokeTripInvite, type InvitePermissions } from '@/hooks/useTripMembers';
import { useTripPermission } from '@/pages/TripDetail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Users, UserPlus, Copy, Check, Shield, User, 
  Clock, CheckCircle2, XCircle, Ban
} from 'lucide-react';
import { toast } from 'sonner';

interface MembersTabProps {
  tripId: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case 'accepted':
      return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50"><CheckCircle2 className="w-3 h-3 mr-1" />Accepted</Badge>;
    case 'expired':
      return <Badge variant="outline" className="text-muted-foreground"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
    case 'revoked':
      return <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5"><Ban className="w-3 h-3 mr-1" />Revoked</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

/** v2.2.8: Map stored permission flags to human-readable label */
function getPermissionLabel(member: { read_only: boolean; can_expenses: boolean; can_stay: boolean }): string {
  if (member.can_expenses && member.can_stay) return 'Can Add Expenses + Lodging';
  if (member.can_expenses) return 'Can Add Expenses';
  if (member.can_stay) return 'Can Add Lodging';
  return 'Read Only';
}

export function MembersTab({ tripId }: MembersTabProps) {
  const { isOwner } = useTripPermission();
  const { data: members = [], isLoading: membersLoading } = useTripMembers(tripId);
  const { data: invites = [], isLoading: invitesLoading } = useTripInvites(tripId);
  const createInvite = useCreateTripInvite();
  const revokeInvite = useRevokeTripInvite();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [permissions, setPermissions] = useState<InvitePermissions>({
    read_only: true,
    can_expenses: false,
    can_stay: false,
  });

  const handleCreateInvite = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inviteEmail.trim();
    if (!trimmed) return;

    try {
      const result = await createInvite.mutateAsync({ tripId, email: trimmed, permissions });
      setInviteToken(result.invite_token);
      setInviteEmail('');
    } catch {
      // Error handled by mutation
    }
  }, [inviteEmail, tripId, createInvite, permissions]);

  // v2.2.7: Permission toggle handlers with interlock logic
  const handleToggleExpenses = useCallback((checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      can_expenses: checked,
      // If any write perm is on, force read_only off
      read_only: (checked || prev.can_stay) ? false : true,
    }));
  }, []);

  const handleToggleStay = useCallback((checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      can_stay: checked,
      // If any write perm is on, force read_only off
      read_only: (prev.can_expenses || checked) ? false : true,
    }));
  }, []);

  const handleToggleReadOnly = useCallback((checked: boolean) => {
    // Can only toggle read_only when no write perms are on
    setPermissions(prev => {
      if (prev.can_expenses || prev.can_stay) return prev; // locked
      return { ...prev, read_only: checked };
    });
  }, []);

  const handleCopyLink = useCallback(async () => {
    if (!inviteToken) return;
    const link = `${window.location.origin}/invite?token=${inviteToken}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Invite link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [inviteToken]);

  const handleCloseInviteDialog = useCallback(() => {
    setInviteDialogOpen(false);
    setInviteEmail('');
    setInviteToken(null);
    setCopied(false);
    setPermissions({ read_only: true, can_expenses: false, can_stay: false });
  }, []);

  const handleRevoke = useCallback((inviteId: string) => {
    revokeInvite.mutate({ inviteId, tripId });
  }, [revokeInvite, tripId]);

  if (membersLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Separate owner and guests
  const owner = members.find(m => m.role === 'owner');
  const guests = members.filter(m => m.role === 'guest');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Trip Members</h3>
          <p className="text-sm text-muted-foreground">
            {members.length} member{members.length !== 1 ? 's' : ''} on this trip
          </p>
        </div>
        {isOwner && (
          <Button onClick={() => setInviteDialogOpen(true)} className="bg-gradient-ocean hover:opacity-90 min-h-[44px]">
             <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Members List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Members
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Owner */}
          {owner && (
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-ocean flex items-center justify-center text-white font-semibold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {owner.display_name || 'Trip Owner'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="secondary" className="text-[10px]">Owner</Badge>
                    <span className="text-[10px] text-muted-foreground">Full Access</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Guests */}
          {guests.map(guest => (
            <div key={guest.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {guest.display_name || 'Guest'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[10px]">Guest</Badge>
                    <span className="text-[10px] text-muted-foreground">{getPermissionLabel(guest)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {guests.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No guests yet. {isOwner ? 'Invite a member to get started.' : ''}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pending Invites — Owner Only */}
      {isOwner && !invitesLoading && invites.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Invites
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-semibold shrink-0">
                    {invite.invitee_email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{invite.invitee_email}</p>
                    <div className="mt-0.5">
                      {getStatusBadge(invite.status)}
                    </div>
                  </div>
                </div>
                {invite.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 min-h-[44px]"
                    onClick={() => handleRevoke(invite.id)}
                    disabled={revokeInvite.isPending}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invite Companion Dialog — Owner Only */}
      <Dialog open={inviteDialogOpen} onOpenChange={(open) => { if (!open) handleCloseInviteDialog(); else setInviteDialogOpen(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              Send a secure invite link to grant access to this trip.
            </DialogDescription>
          </DialogHeader>

          {!inviteToken ? (
            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div className="space-y-2">
                <Label>Email address</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="companion@email.com"
                  required
                  maxLength={255}
                  className="min-h-[44px]"
                />
              </div>

              {/* v2.2.7: Permission toggles with interlock */}
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Guest Permissions</p>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-readonly" className="text-sm cursor-pointer">Read-only</Label>
                  <Switch
                    id="perm-readonly"
                    checked={permissions.read_only}
                    onCheckedChange={handleToggleReadOnly}
                    disabled={permissions.can_expenses || permissions.can_stay}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-expenses" className="text-sm cursor-pointer">Can add expenses</Label>
                  <Switch
                    id="perm-expenses"
                    checked={permissions.can_expenses}
                    onCheckedChange={handleToggleExpenses}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-stay" className="text-sm cursor-pointer">Can add lodging</Label>
                  <Switch
                    id="perm-stay"
                    checked={permissions.can_stay}
                    onCheckedChange={handleToggleStay}
                  />
                </div>

                {(permissions.can_expenses || permissions.can_stay) && (
                  <p className="text-[11px] text-muted-foreground">
                    Read-only is disabled when write permissions are granted.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-ocean hover:opacity-90 min-h-[44px]"
                disabled={createInvite.isPending || !inviteEmail.trim()}
              >
                {createInvite.isPending ? 'Creating...' : 'Send Invite'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-800">Invite created!</p>
                <p className="text-xs text-green-600 mt-1">
                  Copy the link below and share it. The link expires in 7 days.
                </p>
              </div>
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="w-full min-h-[44px]"
              >
                {copied ? (
                  <><Check className="w-4 h-4 mr-2" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4 mr-2" /> Copy Invite Link</>
                )}
              </Button>
              <Button
                onClick={handleCloseInviteDialog}
                variant="ghost"
                className="w-full min-h-[44px]"
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
