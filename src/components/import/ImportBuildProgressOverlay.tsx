/**
 * ImportBuildProgressOverlay — Simple "building your trip" indicator.
 * v3.9.50: Cleaned up to a minimal spinner + message.
 */

import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

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

const ACTIVE_STATUSES: BuildStatus[] = ['parsing', 'merging', 'computing_meta', 'creating_trip'];
const ERROR_STATUSES: BuildStatus[] = ['build_failed', 'build_timeout'];

interface ImportBuildProgressOverlayProps {
  buildStatus: BuildStatus;
  onCancel?: () => void;
  onRetry?: () => void;
  onCreateManually?: () => void;
}

export function ImportBuildProgressOverlay({ buildStatus }: ImportBuildProgressOverlayProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActive = ACTIVE_STATUSES.includes(buildStatus);
  const isError = ERROR_STATUSES.includes(buildStatus);

  useEffect(() => {
    if (isActive || isError) {
      timerRef.current = setTimeout(() => setVisible(true), 300);
    } else {
      setVisible(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isActive, isError]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
      <div className="flex flex-col items-center gap-3 px-6 py-6 text-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <p className="text-sm font-medium text-foreground">
          {isError ? 'Something went wrong — please try again.' : 'Building your trip…'}
        </p>
      </div>
    </div>
  );
}
