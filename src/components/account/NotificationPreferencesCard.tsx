/**
 * NotificationPreferencesCard - User-configurable notification settings
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Bell, Plane, Receipt, CircleParking, MapPin, Ticket } from 'lucide-react';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { toast } from 'sonner';

export function NotificationPreferencesCard() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  const handleUpdate = (updates: Parameters<typeof update.mutate>[0]) => {
    update.mutate(updates, {
      onSuccess: () => toast.success('Notification preferences updated'),
      onError: () => toast.error('Failed to update preferences'),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse h-32 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // Defaults if no prefs exist yet
  const departure_enabled = prefs?.departure_enabled ?? true;
  const departure_hours_before = prefs?.departure_hours_before ?? 24;
  const expense_nudge_enabled = prefs?.expense_nudge_enabled ?? true;
  const parking_expiry_enabled = prefs?.parking_expiry_enabled ?? true;
  const parking_expiry_minutes_before = prefs?.parking_expiry_minutes_before ?? 15;
  const stop_reminder_enabled = prefs?.stop_reminder_enabled ?? true;
  const stop_reminder_minutes_before = prefs?.stop_reminder_minutes_before ?? 60;
  const ticket_reminder_enabled = prefs?.ticket_reminder_enabled ?? true;
  const ticket_reminder_days_before = prefs?.ticket_reminder_days_before ?? 3;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="w-5 h-5 text-primary" />
          Notifications
        </CardTitle>
        <CardDescription>Choose which reminders you receive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Departure reminders */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Plane className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <Label className="text-sm font-medium">Departure reminders</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get notified before your flights depart
              </p>
              {departure_enabled && (
                <Select
                  value={String(departure_hours_before)}
                  onValueChange={(val) => handleUpdate({ departure_hours_before: Number(val) })}
                >
                  <SelectTrigger className="w-32 h-8 text-xs mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 hours before</SelectItem>
                    <SelectItem value="12">12 hours before</SelectItem>
                    <SelectItem value="24">24 hours before</SelectItem>
                    <SelectItem value="48">48 hours before</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <Switch
            checked={departure_enabled}
            onCheckedChange={(checked) => handleUpdate({ departure_enabled: checked })}
          />
        </div>

        {/* Expense nudges */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Receipt className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <Label className="text-sm font-medium">Expense logging nudges</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Daily reminder to log expenses during active trips
              </p>
            </div>
          </div>
          <Switch
            checked={expense_nudge_enabled}
            onCheckedChange={(checked) => handleUpdate({ expense_nudge_enabled: checked })}
          />
        </div>

        {/* Parking expiration */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <CircleParking className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <Label className="text-sm font-medium">Parking expiration</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Alert before your parking expires
              </p>
              {parking_expiry_enabled && (
                <Select
                  value={String(parking_expiry_minutes_before)}
                  onValueChange={(val) => handleUpdate({ parking_expiry_minutes_before: Number(val) })}
                >
                  <SelectTrigger className="w-36 h-8 text-xs mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes before</SelectItem>
                    <SelectItem value="30">30 minutes before</SelectItem>
                    <SelectItem value="60">1 hour before</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <Switch
            checked={parking_expiry_enabled}
            onCheckedChange={(checked) => handleUpdate({ parking_expiry_enabled: checked })}
          />
        </div>

        {/* Stop reminders */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <Label className="text-sm font-medium">Tour stop reminders</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get reminded before your scheduled stops
              </p>
              {stop_reminder_enabled && (
                <Select
                  value={String(stop_reminder_minutes_before)}
                  onValueChange={(val) => handleUpdate({ stop_reminder_minutes_before: Number(val) })}
                >
                  <SelectTrigger className="w-36 h-8 text-xs mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes before</SelectItem>
                    <SelectItem value="30">30 minutes before</SelectItem>
                    <SelectItem value="60">1 hour before</SelectItem>
                    <SelectItem value="120">2 hours before</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <Switch
            checked={stop_reminder_enabled}
            onCheckedChange={(checked) => handleUpdate({ stop_reminder_enabled: checked })}
          />
        </div>

        {/* Ticket purchase reminders */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Ticket className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <Label className="text-sm font-medium">Ticket purchase reminders</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Remind me to buy tickets for activities that need advance booking
              </p>
              {ticket_reminder_enabled && (
                <Select
                  value={String(ticket_reminder_days_before)}
                  onValueChange={(val) => handleUpdate({ ticket_reminder_days_before: Number(val) })}
                >
                  <SelectTrigger className="w-36 h-8 text-xs mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day before</SelectItem>
                    <SelectItem value="3">3 days before</SelectItem>
                    <SelectItem value="5">5 days before</SelectItem>
                    <SelectItem value="7">7 days before</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <Switch
            checked={ticket_reminder_enabled}
            onCheckedChange={(checked) => handleUpdate({ ticket_reminder_enabled: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
