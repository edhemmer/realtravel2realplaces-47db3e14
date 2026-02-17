/**
 * v3.12.0: Trip Brief Section
 *
 * Renders TripReadinessBrief cards in fixed order.
 * Pure presentational component — no data fetching.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Zap, Cloud, Plane, Car, AlertTriangle, Info,
} from 'lucide-react';
import type { TripReadinessBrief, TripReadinessCard, TripReadinessCardType } from '@/lib/tripReadiness/tripReadinessEngine';

interface TripBriefSectionProps {
  brief: TripReadinessBrief;
  onAction?: (target: string) => void;
}

const CARD_ICONS: Record<TripReadinessCardType, React.ReactNode> = {
  NEXT_ACTION: <Zap className="w-4 h-4 text-primary" />,
  WEATHER: <Cloud className="w-4 h-4 text-sky-500" />,
  TRANSPORT_SUMMARY: <Plane className="w-4 h-4 text-primary" />,
  DRIVE_READINESS: <Car className="w-4 h-4 text-emerald-600" />,
  DATA_FIX: <AlertTriangle className="w-4 h-4 text-amber-500" />,
};

function BriefCard({ card, onAction }: { card: TripReadinessCard; onAction?: (t: string) => void }) {
  const icon = CARD_ICONS[card.type];

  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 border-b border-border/20 last:border-b-0">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight">{card.title}</p>
        {card.subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</p>
        )}
        {card.details && card.details.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {card.details.map((d, i) => (
              <p key={i} className="text-xs text-muted-foreground">{d}</p>
            ))}
          </div>
        )}
        {card.actionLabel && card.actionTarget && (
          <Button
            variant="link"
            size="sm"
            className="px-0 h-auto text-xs mt-1 text-primary"
            onClick={() => onAction?.(card.actionTarget!)}
          >
            {card.actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export function TripBriefSection({ brief, onAction }: TripBriefSectionProps) {
  if (!brief || brief.cards.length === 0) return null;

  return (
    <Card className="border-border/40 shadow-sm">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Trip Brief</h3>
        </div>
        <div className="divide-y-0">
          {brief.cards.map((card, i) => (
            <BriefCard key={`${card.type}-${i}`} card={card} onAction={onAction} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
