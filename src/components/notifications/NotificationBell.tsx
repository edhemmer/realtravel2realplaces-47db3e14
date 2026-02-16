/**
 * NotificationBell - Bell icon with unread count badge + dropdown of notifications
 *
 * Reads ONLY from canonical notifications output (useNotifications hook).
 * No independent suppression or filtering — all preference enforcement
 * happens in the canonical reminders engine (server-side).
 */

import { useState } from 'react';
import { Bell, Check, X, Plane, Receipt, CircleParking, MapPin, Ticket, Hotel, Car, MailOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllRead,
  useDismissNotification,
  type Notification,
} from '@/hooks/useNotifications';
import { usePendingInviteCount } from '@/hooks/usePendingTripInvites';
import { TripInvitesDialog } from '@/components/notifications/TripInvitesInbox';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

/** Map canonical reminder types to icons */
function getNotificationIcon(type: string) {
  switch (type) {
    case 'departure':
      return <Plane className="w-4 h-4 text-primary shrink-0" />;
    case 'expense_nudge':
      return <Receipt className="w-4 h-4 text-amber-500 shrink-0" />;
    case 'parking_expiration':
    case 'parking_expiry': // legacy compat
      return <CircleParking className="w-4 h-4 text-destructive shrink-0" />;
    case 'tour_start':
    case 'next_stop':
    case 'stop_reminder': // legacy compat
      return <MapPin className="w-4 h-4 text-primary shrink-0" />;
    case 'ticket_required':
    case 'ticket_reminder': // legacy compat
      return <Ticket className="w-4 h-4 text-emerald-500 shrink-0" />;
    case 'lodging_checkin':
      return <Hotel className="w-4 h-4 text-primary shrink-0" />;
    case 'car_pickup':
      return <Car className="w-4 h-4 text-primary shrink-0" />;
    default:
      return <Bell className="w-4 h-4 text-muted-foreground shrink-0" />;
  }
}

function NotificationItem({
  notification,
  onRead,
  onDismiss,
  onNavigate,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onNavigate: (n: Notification) => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(notification.scheduled_for), { addSuffix: true });

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-3 py-2.5 border-b border-border/30 last:border-b-0 transition-colors',
        !notification.is_read && 'bg-primary/5'
      )}
    >
      <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
      <button
        className="flex-1 min-w-0 text-left"
        onClick={() => {
          if (!notification.is_read) onRead(notification.id);
          onNavigate(notification);
        }}
      >
        <p className="text-sm font-medium leading-snug text-foreground">{notification.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo}</p>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
        className="text-muted-foreground/50 hover:text-foreground transition-colors p-1 shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function NotificationBell() {
  const { data: notifications = [] } = useNotifications();
  const unreadCount = useUnreadCount();
  const inviteCount = usePendingInviteCount();
  const totalBadge = unreadCount + inviteCount;
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const dismiss = useDismissNotification();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);

  const handleNavigate = (notification: Notification) => {
    if (notification.trip_id && notification.link_tab) {
      navigate(`/trip/${notification.trip_id}`);
    }
    setOpen(false);
  };

  return (
    <>
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full relative overflow-visible">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {totalBadge > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-[10px] font-bold bg-destructive text-destructive-foreground border-2 border-card z-50 pointer-events-none">
              {totalBadge > 9 ? '9+' : totalBadge}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        {inviteCount > 0 && (
          <button
            onClick={() => { setOpen(false); setInvitesOpen(true); }}
            className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50 w-full text-left hover:bg-primary/5 transition-colors"
          >
            <MailOpen className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-primary flex-1">
              {inviteCount} trip invite{inviteCount > 1 ? 's' : ''} pending
            </span>
            <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold bg-primary text-primary-foreground">
              {inviteCount}
            </Badge>
          </button>
        )}

        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <ScrollArea className="max-h-[360px]">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={(id) => markRead.mutate(id)}
                onDismiss={(id) => dismiss.mutate(id)}
                onNavigate={handleNavigate}
              />
            ))}
          </ScrollArea>
        )}

        {notifications.length > 0 && (
          <div className="px-3 py-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => {
                navigate('/account');
                setOpen(false);
              }}
            >
              Notification Settings
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>

    <TripInvitesDialog open={invitesOpen} onOpenChange={setInvitesOpen} />
    </>
  );
}
