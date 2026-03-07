/**
 * v4.0.2: Network Status Indicator
 * 
 * Small, non-intrusive dot + label showing online/offline state.
 * Reads from src/lib/networkStatus.ts.
 */

import { useState, useEffect } from 'react';
import { isOnline, subscribeToNetworkChanges } from '@/lib/networkStatus';

export function NetworkStatusIndicator() {
  const [online, setOnline] = useState(isOnline);

  useEffect(() => {
    setOnline(isOnline());
    return subscribeToNetworkChanges(setOnline);
  }, []);

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          online ? 'bg-emerald-500' : 'bg-orange-400'
        }`}
      />
      <span className="hidden sm:inline">{online ? 'Online' : 'Offline'}</span>
    </div>
  );
}
