/**
 * Patch 2.1.29: First-trip completion hint
 * Shows contextual tips when a trip has minimal bookings
 * Auto-dismisses when conditions are met
 */

import { useState, useEffect } from 'react';
import { Lightbulb, X } from 'lucide-react';

interface FirstTripHintProps {
  bookingsCount: number;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Inline hint shown in Summary tab for trips with only 1 booking
 * Auto-dismisses when a second booking is added
 */
export function FirstTripHint({ bookingsCount, onDismiss, className = '' }: FirstTripHintProps) {
  const [dismissed, setDismissed] = useState(false);

  // Auto-dismiss when bookings increase beyond 1
  useEffect(() => {
    if (bookingsCount > 1) {
      setDismissed(true);
    }
  }, [bookingsCount]);

  // Don't show if dismissed or if more than 1 booking
  if (dismissed || bookingsCount !== 1) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 ${className}`}>
      <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
      <p className="text-sm text-muted-foreground flex-1">
        <span className="font-medium text-foreground">Next:</span> add your lodging, receipts, or useful places near the trip.
      </p>
      <button
        onClick={handleDismiss}
        className="p-0.5 hover:bg-muted rounded transition-colors"
        aria-label="Dismiss hint"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

interface ExploreHintProps {
  hasVisitedExplore: boolean;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Inline hint shown in Places for Pro users who haven't used it
 * Auto-dismisses on any interaction with Places
 */
export function ExploreHint({ hasVisitedExplore, onDismiss, className = '' }: ExploreHintProps) {
  const [dismissed, setDismissed] = useState(false);

  // Already visited or dismissed
  if (hasVisitedExplore || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 ${className}`}>
      <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
      <p className="text-sm text-muted-foreground flex-1">
        Open Places when you need food, services, or useful context near this trip.
      </p>
      <button
        onClick={handleDismiss}
        className="p-0.5 hover:bg-muted rounded transition-colors"
        aria-label="Dismiss hint"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
