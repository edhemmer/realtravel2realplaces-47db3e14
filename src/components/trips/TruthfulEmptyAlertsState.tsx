import { useEffect, useState } from 'react';
import { Bell, WifiOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { isOnline, subscribeToNetworkChanges } from '@/lib/networkStatus';
import { cn } from '@/lib/utils';

export function TruthfulEmptyAlertsState({ className }: { className?: string }) {
  const [online, setOnline] = useState(() => isOnline());
  useEffect(() => subscribeToNetworkChanges(setOnline), []);

  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          {online ? <Bell className="h-7 w-7 text-primary" /> : <WifiOff className="h-7 w-7 text-muted-foreground" />}
        </div>
        <h4 className="mb-1 text-base font-medium">
          {online ? 'No alerts currently recorded' : 'Offline — no new provider alerts'}
        </h4>
        <p className="max-w-sm text-sm text-muted-foreground">
          {online
            ? 'RT2RP has no alert to show from the trip data and provider results currently available. This is not a continuous-monitoring all-clear.'
            : 'Saved trip information can still be useful, but flight, weather, route, and other provider-backed changes may not be current until you reconnect.'}
        </p>
      </CardContent>
    </Card>
  );
}
