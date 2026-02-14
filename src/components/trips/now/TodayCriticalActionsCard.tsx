/**
 * v3.10.9: TodayCriticalActionsCard
 *
 * Renders canonical critical actions (Checkout, Get Gas, Return Rental, Drive Smart, Flight)
 * from the canonical TODAY execution stack. No sorting — receives pre-ordered actions.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, Building2, Car, Fuel, AlertTriangle, Route, Plane, MapPin } from 'lucide-react';
import {
  buildGasSearchUrl,
  buildDriveSmartUrl,
  type TodayCriticalAction,
} from '@/lib/canonicalTodayCriticalActions';
import {
  resolveMapsDestination,
  openMapsDestination,
} from '@/lib/mapsDestination';

interface TodayCriticalActionsCardProps {
  /** Pre-sorted critical actions from buildCanonicalTodayExecutionStack */
  criticalActions: TodayCriticalAction[];
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  CHECKOUT: <Building2 className="w-4 h-4" />,
  GET_GAS: <Fuel className="w-4 h-4" />,
  RETURN_RENTAL: <Car className="w-4 h-4" />,
  DRIVE_SMART: <Route className="w-4 h-4" />,
  DRIVE_SMART_AIRPORT: <Route className="w-4 h-4" />,
  FLIGHT: <Plane className="w-4 h-4" />,
};

const ACTION_COLORS: Record<string, string> = {
  CHECKOUT: 'text-amber-600 bg-amber-500/10',
  GET_GAS: 'text-emerald-600 bg-emerald-500/10',
  RETURN_RENTAL: 'text-primary bg-primary/10',
  DRIVE_SMART: 'text-blue-600 bg-blue-500/10',
  DRIVE_SMART_AIRPORT: 'text-blue-600 bg-blue-500/10',
  FLIGHT: 'text-orange-600 bg-orange-500/10',
};

function handleNavigate(action: TodayCriticalAction) {
  if (action.actionType === 'GET_GAS') {
    const url = buildGasSearchUrl(action.navTarget);
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  if (action.actionType === 'DRIVE_SMART' || action.actionType === 'DRIVE_SMART_AIRPORT') {
    const url = buildDriveSmartUrl(action.navTarget);
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  // For checkout / return: use Maps directions
  const dest = resolveMapsDestination({
    address: action.navTarget.address,
  });
  if (dest) {
    openMapsDestination(dest);
  }
}

export function TodayCriticalActionsCard({ criticalActions }: TodayCriticalActionsCardProps) {
  if (criticalActions.length === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-background shadow-sm">
      <CardHeader className="pb-1.5 pt-3 px-4">
        <CardTitle className="text-[10px] font-semibold flex items-center gap-1.5 text-amber-600 uppercase tracking-wider">
          <AlertTriangle className="w-3 h-3" />
          Critical Today
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2.5">
        {criticalActions.map((action) => (
          <div
            key={action.id}
            className="flex items-center gap-3 py-2"
          >
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${ACTION_COLORS[action.actionType] || 'text-muted-foreground bg-muted/30'}`}>
              {ACTION_ICONS[action.actionType]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {action.label}
              </p>
              {/* v3.10.10: IATA code with pin icon — separate from confirmation */}
              {action.displayLocation && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {action.displayLocation}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {action.timeDisplay}
                {action.displaySubMeta && (
                  <span className="ml-1.5">· {action.displaySubMeta}</span>
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-8 px-3 text-xs font-medium"
              onClick={() => handleNavigate(action)}
            >
              <Navigation className="w-3 h-3 mr-1" />
              {(action.actionType === 'DRIVE_SMART' || action.actionType === 'DRIVE_SMART_AIRPORT') ? 'Route' : 'Navigate'}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
