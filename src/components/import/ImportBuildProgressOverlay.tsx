/**
 * ImportBuildProgressOverlay — Premium plane-orbiting-globe progress indicator.
 * Driven exclusively by canonical buildStatus from the import session.
 *
 * v3.9.45: Single overlay rendered at the import flow level.
 * - 300ms anti-flicker delay
 * - Plane icon angled/profile for orbiting effect
 * - "Still working" after 20s
 *
 * v3.9.26: Added build_failed / build_timeout states with recovery UI.
 */

import { useState, useEffect, useRef } from 'react';
import { Globe, Plane, AlertTriangle, RotateCcw, PenLine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type BuildStatus =
  | 'idle'
  | 'parsing'
  | 'merging'
  | 'computing_meta'
  | 'ready'
  | 'needs_input'
  | 'creating_trip'
  | 'trip_created'
  | 'build_failed'
  | 'build_timeout';

const PHASE_TEXT: Record<string, string> = {
  parsing: 'Reading confirmations…',
  merging: 'Merging bookings…',
  computing_meta: 'Extracting trip details…',
  creating_trip: 'Building your timeline…',
};

const ACTIVE_STATUSES: BuildStatus[] = ['parsing', 'merging', 'computing_meta', 'creating_trip'];
const ERROR_STATUSES: BuildStatus[] = ['build_failed', 'build_timeout'];

interface ImportBuildProgressOverlayProps {
  buildStatus: BuildStatus;
  onCancel?: () => void;
  onRetry?: () => void;
  onCreateManually?: () => void;
}

export function ImportBuildProgressOverlay({ buildStatus, onCancel, onRetry, onCreateManually }: ImportBuildProgressOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [showSlowMessage, setShowSlowMessage] = useState(false);
  const flickerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActive = ACTIVE_STATUSES.includes(buildStatus);
  const isError = ERROR_STATUSES.includes(buildStatus);

  // Anti-flicker: only show after 300ms of active status; show immediately for errors
  useEffect(() => {
    if (isError) {
      setVisible(true);
      setShowSlowMessage(false);
      if (flickerTimerRef.current) clearTimeout(flickerTimerRef.current);
    } else if (isActive) {
      flickerTimerRef.current = setTimeout(() => setVisible(true), 300);
    } else {
      setVisible(false);
      setShowSlowMessage(false);
      if (flickerTimerRef.current) clearTimeout(flickerTimerRef.current);
    }
    return () => {
      if (flickerTimerRef.current) clearTimeout(flickerTimerRef.current);
    };
  }, [isActive, isError]);

  // "Still working" message after 20s
  useEffect(() => {
    if (visible && isActive) {
      slowTimerRef.current = setTimeout(() => setShowSlowMessage(true), 20000);
    } else {
      setShowSlowMessage(false);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    }
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [visible, isActive]);

  if (!visible) return null;

  // ── Error / Timeout state ──
  if (isError) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
        <div className="flex flex-col items-center gap-4 px-6 py-8 max-w-xs text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-foreground">We couldn't finish building your trip.</p>
            <p className="text-xs text-muted-foreground">
              Your confirmations are saved. Try again, or create the trip from the wizard.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            {onRetry && (
              <Button size="sm" onClick={onRetry} className="w-full gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                Try Again
              </Button>
            )}
            {onCreateManually && (
              <Button size="sm" variant="outline" onClick={onCreateManually} className="w-full gap-1.5">
                <PenLine className="w-3.5 h-3.5" />
                Create Manually
              </Button>
            )}
            {onCancel && (
              <Button size="sm" variant="ghost" onClick={onCancel} className="w-full gap-1.5 text-muted-foreground">
                <X className="w-3.5 h-3.5" />
                Close
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Active / Building state ──
  const phaseText = PHASE_TEXT[buildStatus] || 'Processing…';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
      <div className="flex flex-col items-center gap-5 px-6 py-8 max-w-xs text-center">
        {/* Globe + orbiting plane */}
        <div className="relative w-20 h-20">
          {/* Globe */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Globe className="w-10 h-10 text-primary/30" />
          </div>
          {/* Orbiting plane — angled/profile for flight effect */}
          <div
            className="absolute inset-0 animate-[orbit_3s_linear_infinite]"
          >
            <Plane className="w-5 h-5 text-primary absolute -top-1 left-1/2 -translate-x-1/2 rotate-[-30deg]" />
          </div>
        </div>

        {/* Phase text */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{phaseText}</p>

          {/* Indeterminate progress bar */}
          <div className="w-48 h-1 rounded-full bg-muted overflow-hidden mx-auto">
            <div
              className="h-full w-1/3 rounded-full bg-primary/60 animate-[shimmer_1.5s_ease-in-out_infinite]"
            />
          </div>

          {showSlowMessage && (
            <p className="text-xs text-muted-foreground mt-2">
              Still working — complex itineraries can take a bit longer.
            </p>
          )}
        </div>

        {/* Cancel button */}
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Orbit animation keyframes */}
      <style>{`
        @keyframes orbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
