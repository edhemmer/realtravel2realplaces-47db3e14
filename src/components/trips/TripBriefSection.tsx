import { Button } from '@/components/ui/button';
import { AlertTriangle, Car, ChevronRight, Cloud, Info, Plane, Zap } from 'lucide-react';
import type { TripReadinessBrief, TripReadinessCard, TripReadinessCardType } from '@/lib/tripReadiness/tripReadinessEngine';

interface TripBriefSectionProps {
  brief: TripReadinessBrief;
  onAction?: (target: string) => void;
}

const CARD_ICONS: Record<TripReadinessCardType, React.ReactNode> = {
  NEXT_ACTION: <Zap className="h-4 w-4" />,
  WEATHER: <Cloud className="h-4 w-4" />,
  TRANSPORT_SUMMARY: <Plane className="h-4 w-4" />,
  DRIVE_READINESS: <Car className="h-4 w-4" />,
  DATA_FIX: <AlertTriangle className="h-4 w-4" />,
};

const CARD_TONES: Record<TripReadinessCardType, string> = {
  NEXT_ACTION: 'border-primary/20 bg-primary/8 text-primary',
  WEATHER: 'border-sky-500/20 bg-sky-500/8 text-sky-600 dark:text-sky-300',
  TRANSPORT_SUMMARY: 'border-brand-champagne/30 bg-brand-champagne/10 text-brand-champagne',
  DRIVE_READINESS: 'border-emerald-500/20 bg-emerald-500/8 text-emerald-600 dark:text-emerald-300',
  DATA_FIX: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
};

function BriefCard({ card, onAction }: { card: TripReadinessCard; onAction?: (target: string) => void }) {
  return (
    <div className="group rounded-2xl border border-border/45 bg-card/70 p-3 shadow-sm transition-colors hover:border-primary/25">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${CARD_TONES[card.type]}`}>
          {CARD_ICONS[card.type]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-foreground">{card.title}</p>
          {card.subtitle && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.subtitle}</p>
          )}
          {card.details && card.details.length > 0 && (
            <div className="mt-2 space-y-1">
              {card.details.slice(0, 3).map((detail, index) => (
                <p key={`${card.type}-${index}`} className="text-xs leading-relaxed text-muted-foreground">
                  {detail}
                </p>
              ))}
            </div>
          )}
          {card.actionLabel && card.actionTarget && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-8 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-primary/8 hover:text-primary"
              onClick={() => onAction?.(card.actionTarget!)}
            >
              {card.actionLabel}
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function TripBriefSection({ brief, onAction }: TripBriefSectionProps) {
  if (!brief || brief.cards.length === 0) return null;

  const focusCards = brief.cards.slice(0, 3);

  return (
    <section className="rounded-[22px] border border-border/45 bg-card/55 p-3 shadow-elevation-raised">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Operating brief</p>
          <h3 className="text-base font-bold leading-tight text-foreground">What needs attention</h3>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 text-primary">
          <Info className="h-4 w-4" />
        </div>
      </div>

      <div className="space-y-2">
        {focusCards.map((card, index) => (
          <BriefCard key={`${card.type}-${index}`} card={card} onAction={onAction} />
        ))}
      </div>
    </section>
  );
}
