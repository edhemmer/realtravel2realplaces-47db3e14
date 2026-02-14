/**
 * v3.8.6: TodayCriticalActionsCard
 *
 * Renders canonical critical actions (Checkout, Return Rental, Get Gas)
 * from the canonical resolver. No custom logic — purely driven by resolver output.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, Building2, Car, Fuel, AlertTriangle } from 'lucide-react';
import type { CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import {
  getTodayCriticalActions,
  buildGasSearchUrl,
  type TodayCriticalAction,
} from '@/lib/canonicalTodayCriticalActions';
import {
  resolveMapsDestination,
  openMapsDestination,
  buildMapsDirectionsUrl,
} from '@/lib/mapsDestination';

interface TodayCriticalActionsCardProps {
  timelineEvents: CanonicalTimelineEvent[];
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  CHECKOUT: <Building2 className="w-4 h-4" />,
  RETURN_RENTAL: <Car className="w-4 h-4" />,
  GET_GAS: <Fuel className="w-4 h-4" />,
};

const ACTION_COLORS: Record<string, string> = {
  CHECKOUT: 'text-amber-600 bg-amber-500/10',
  GET_GAS: 'text-emerald-600 bg-emerald-500/10',
  RETURN_RENTAL: 'text-primary bg-primary/10',
};

function handleNavigate(action: TodayCriticalAction) {
  if (action.actionType === 'GET_GAS') {
    const url = buildGasSearchUrl(action.navTarget);
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

export function TodayCriticalActionsCard({ timelineEvents }: TodayCriticalActionsCardProps) {
  const actions = useMemo(
    () => getTodayCriticalActions(timelineEvents),
    [timelineEvents]
  );

  if (actions.length === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-background shadow-sm">
      <CardHeader className="pb-1.5 pt-3 px-4">
        <CardTitle className="text-[10px] font-semibold flex items-center gap-1.5 text-amber-600 uppercase tracking-wider">
          <AlertTriangle className="w-3 h-3" />
          Critical Today
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2.5">
        {actions.map((action) => (
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
              <p className="text-xs text-muted-foreground">
                {action.timeDisplay}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-8 px-3 text-xs font-medium"
              onClick={() => handleNavigate(action)}
            >
              <Navigation className="w-3 h-3 mr-1" />
              Navigate
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
