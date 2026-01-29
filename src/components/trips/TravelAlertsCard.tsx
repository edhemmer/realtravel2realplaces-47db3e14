import { TravelAlert } from '@/hooks/useTravelAlerts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, Bell, Cloud, MapPin, ExternalLink, 
  Plane, Car, Hotel, Clock, Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TravelAlertsCardProps {
  alerts: TravelAlert[];
  className?: string;
}

const alertIcons: Record<TravelAlert['type'], React.ReactNode> = {
  weather_change: <Cloud className="w-4 h-4" />,
  departure_reminder: <Clock className="w-4 h-4" />,
  parking_expiry: <Car className="w-4 h-4" />,
  severe_weather: <AlertTriangle className="w-4 h-4" />,
  packing_update: <Package className="w-4 h-4" />,
};

const severityStyles: Record<TravelAlert['severity'], string> = {
  critical: 'bg-destructive/10 border-destructive/50 text-destructive',
  warning: 'bg-warning/10 border-warning/50 text-warning',
  info: 'bg-primary/10 border-primary/50 text-primary',
};

const severityBadgeStyles: Record<TravelAlert['severity'], string> = {
  critical: 'bg-destructive text-destructive-foreground',
  warning: 'bg-warning text-warning-foreground',
  info: 'bg-primary text-primary-foreground',
};

export function TravelAlertsCard({ alerts, className }: TravelAlertsCardProps) {
  if (alerts.length === 0) {
    return null;
  }

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  const infoAlerts = alerts.filter(a => a.severity === 'info');

  return (
    <Card className={cn('border-2', className, 
      criticalAlerts.length > 0 
        ? 'border-destructive/50 bg-destructive/5' 
        : warningAlerts.length > 0 
          ? 'border-warning/50 bg-warning/5'
          : 'border-primary/50 bg-primary/5'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className={cn('w-5 h-5', 
              criticalAlerts.length > 0 
                ? 'text-destructive animate-pulse' 
                : warningAlerts.length > 0 
                  ? 'text-warning' 
                  : 'text-primary'
            )} />
            Travel Alerts
          </CardTitle>
          <div className="flex gap-1">
            {criticalAlerts.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalAlerts.length} Critical
              </Badge>
            )}
            {warningAlerts.length > 0 && (
              <Badge className="text-xs bg-warning text-warning-foreground">
                {warningAlerts.length} Warning
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Active reminders and weather updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              'p-3 rounded-lg border flex gap-3 transition-colors',
              severityStyles[alert.severity]
            )}
          >
            <div className="shrink-0 mt-0.5">
              {alertIcons[alert.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{alert.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {alert.message}
              </p>
              {alert.actionLabel && alert.actionUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 mt-2 text-xs gap-1"
                  onClick={() => {
                    const url = alert.actionUrl!.startsWith('http') 
                      ? alert.actionUrl! 
                      : `https://${alert.actionUrl}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <MapPin className="w-3 h-3" />
                  {alert.actionLabel}
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
            </div>
            <Badge 
              className={cn('shrink-0 h-5 text-[10px]', severityBadgeStyles[alert.severity])}
            >
              {alert.severity}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
