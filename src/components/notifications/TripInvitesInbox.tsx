/**
 * TripInvitesInbox — v3.9.0: In-app pending trip invites panel
 *
 * Lightweight modal showing pending invites with Accept/Decline actions.
 * Uses canonical usePendingTripInvites hook (SSOT).
 */

import { useState } from 'react';
import { MailOpen, Check, X, MapPin, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  usePendingTripInvites,
  usePendingInviteCount,
  useAcceptTripInviteById,
  useDeclineTripInvite,
  getPermissionSummary,
  type PendingTripInvite,
} from '@/hooks/usePendingTripInvites';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

function InviteItem({
  invite,
  onAccept,
  onDecline,
  isAccepting,
  isDeclining,
}: {
  invite: PendingTripInvite;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  isAccepting: boolean;
  isDeclining: boolean;
}) {
  const timeAgo = formatDistanceToNow(new Date(invite.created_at), { addSuffix: true });
  const permSummary = getPermissionSummary(invite);

  return (
    <div className="p-4 border-b border-border/30 last:border-b-0 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {invite.trip_name || 'Trip Invite'}
          </p>
          {invite.inviter_display_name && (
            <p className="text-xs text-muted-foreground mt-0.5">
              from {invite.inviter_display_name}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="outline" className="text-[10px]">
              <Shield className="w-3 h-3 mr-1" />
              {permSummary}
            </Badge>
            <span className="text-[10px] text-muted-foreground/60">{timeAgo}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 bg-gradient-ocean hover:opacity-90 min-h-[36px]"
          onClick={() => onAccept(invite.id)}
          disabled={isAccepting || isDeclining}
        >
          <Check className="w-4 h-4 mr-1" />
          {isAccepting ? 'Accepting…' : 'Accept'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 min-h-[36px]"
          onClick={() => onDecline(invite.id)}
          disabled={isAccepting || isDeclining}
        >
          <X className="w-4 h-4 mr-1" />
          {isDeclining ? 'Declining…' : 'Decline'}
        </Button>
      </div>
    </div>
  );
}

export function TripInvitesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: invites = [] } = usePendingTripInvites();
  const acceptMutation = useAcceptTripInviteById();
  const declineMutation = useDeclineTripInvite();
  const navigate = useNavigate();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (inviteId: string) => {
    setProcessingId(inviteId);
    try {
      const tripId = await acceptMutation.mutateAsync(inviteId);
      // If only one invite and it was accepted, close and navigate
      if (invites.length <= 1) {
        onOpenChange(false);
        if (tripId) {
          navigate(`/trip/${tripId}`);
        }
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (inviteId: string) => {
    setProcessingId(inviteId);
    try {
      await declineMutation.mutateAsync(inviteId);
      if (invites.length <= 1) {
        onOpenChange(false);
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Trip Invites
          </DialogTitle>
        </DialogHeader>

        {invites.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No pending invites
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            {invites.map((invite) => (
              <InviteItem
                key={invite.id}
                invite={invite}
                onAccept={handleAccept}
                onDecline={handleDecline}
                isAccepting={processingId === invite.id && acceptMutation.isPending}
                isDeclining={processingId === invite.id && declineMutation.isPending}
              />
            ))}
          </ScrollArea>
        )}

        <div className="px-4 pb-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
