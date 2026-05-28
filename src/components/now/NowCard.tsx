/**
 * NowCard — single live tile that answers "what now?" for one trip.
 *
 * Renders the canonical `useNowCard()` output. Morphs smoothly between
 * pressure shapes via framer-motion `AnimatePresence` keyed on `shapeKey`.
 *
 * Visual rules:
 *   - Premium SaaS aesthetic (light card on F6F8FB surface).
 *   - Single primary action (h-12 rounded-xl), optional secondary as link.
 *   - Pressure colour cue stays subtle — semantic tokens only.
 *   - Mobile-only call sites; safe to render on desktop too.
 */

import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Button } from '@/components/ui/button';
import { Radio, Plane, MapPin, CheckCircle2, Clock } from 'lucide-react';
import type { Trip } from '@/types/database';
import { useNowCard, type NowCardPressure } from '@/hooks/useNowCard';
import { haptic } from '@/lib/native/haptics';
import { heroMorph, commitPulse, EASE_CINEMA, DUR_BASE } from '@/lib/motion/choreography';

const PRESSURE_META: Record<NowCardPressure, { Icon: typeof Radio; tagText: string; tone: string }> = {
  'idle':           { Icon: Radio,        tagText: 'Now',         tone: 'text-primary' },
  'pre-trip-far':   { Icon: Clock,        tagText: 'Upcoming',    tone: 'text-muted-foreground' },
  'pre-trip-near':  { Icon: Clock,        tagText: 'Coming up',   tone: 'text-primary' },
  'departure-day':  { Icon: Radio,        tagText: 'Today',       tone: 'text-primary' },
  'airport-buffer': { Icon: Plane,        tagText: 'Head out',    tone: 'text-warning' },
  'in-day':         { Icon: MapPin,       tagText: 'Next',        tone: 'text-primary' },
  'next-up':        { Icon: Clock,        tagText: 'Up next',     tone: 'text-primary' },
  'post-trip':      { Icon: CheckCircle2, tagText: 'Wrap-up',     tone: 'text-success' },
};

export function NowCard({ trip, className }: { trip: Trip | null; className?: string }) {
  const navigate = useNavigate();
  const card = useNowCard(trip);

  if (!trip || card.pressure === 'idle' || !card.headline) return null;

  const meta = PRESSURE_META[card.pressure];
  const Icon = meta.Icon;

  const go = (href: string) => {
    void haptic('commit');
    navigate(href);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={card.shapeKey}
        layoutId={`now-card-${trip.id}`}
        initial={{ opacity: 0, y: -8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.99 }}
        transition={{ ...heroMorph, ease: EASE_CINEMA, duration: DUR_BASE }}
        className={`motion-cinema ${className ?? ''}`}
      >
        <GlassSurface elevation="floating" className="overflow-hidden">
          {/* Pressure-tinted top wash — gradient instead of literal border */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent ${
              card.pressure === 'airport-buffer' ? 'via-warning/70' : ''
            } ${card.pressure === 'post-trip' ? 'via-success/60' : ''}`}
          />
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b ${
              card.pressure === 'airport-buffer'
                ? 'from-warning/8'
                : card.pressure === 'post-trip'
                ? 'from-success/8'
                : 'from-primary/8'
            } to-transparent`}
          />

          <div className="relative py-4 px-4 space-y-3">
            <div className="flex items-start gap-3">
              <motion.div
                initial={false}
                variants={commitPulse}
                animate="visible"
                className="w-9 h-9 rounded-xl bg-primary/10 ring-1 ring-primary/15 flex items-center justify-center shrink-0"
              >
                <Icon className={`w-4 h-4 ${meta.tone}`} />
              </motion.div>
              <div className="min-w-0 flex-1">
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${meta.tone}`}>
                  {meta.tagText} · {trip.name || trip.destination_city || 'Trip'}
                </p>
                <p className="text-[15px] font-semibold leading-snug truncate mt-0.5">
                  {card.headline}
                </p>
                {card.subtext && (
                  <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                    {card.subtext}
                  </p>
                )}
              </div>
            </div>

            {(card.primary || card.secondary) && (
              <div className="flex gap-2">
                {card.primary && (
                  <Button
                    onClick={() => go(card.primary!.href)}
                    className="flex-1 h-12 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm active:scale-[0.98] transition-transform duration-fast ease-cinema"
                  >
                    {card.primary.label}
                  </Button>
                )}
                {card.secondary && (
                  <Button
                    onClick={() => go(card.secondary!.href)}
                    variant="outline"
                    className="h-12 rounded-xl text-sm font-semibold active:scale-[0.98] transition-transform duration-fast ease-cinema"
                  >
                    {card.secondary.label}
                  </Button>
                )}
              </div>
            )}
          </div>
        </GlassSurface>
      </motion.div>
    </AnimatePresence>
  );
}
