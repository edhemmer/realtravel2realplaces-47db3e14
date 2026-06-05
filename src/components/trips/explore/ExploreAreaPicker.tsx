/**
 * v4.10.0: Pre-Explore Area Picker
 *
 * Shows all unique explorable areas from the trip's bookings.
 * Lets users tap an area to explore that location before arriving.
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plane, Building2, Car, Compass, TrainFront, MapPin } from 'lucide-react';
import type { Booking } from '@/types/database';
import { extractTripAreas, type ExplorableArea } from '@/lib/explore/extractTripAreas';

interface ExploreAreaPickerProps {
  bookings: Booking[];
  onSelectArea: (area: ExplorableArea) => void;
  /** Currently active area key */
  activeAreaKey?: string | null;
}

const AREA_ICONS: Record<ExplorableArea['type'], React.ElementType> = {
  airport: Plane,
  lodging: Building2,
  car_rental: Car,
  activity: Compass,
  transport: TrainFront,
};

const AREA_COLORS: Record<ExplorableArea['type'], string> = {
  airport: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  lodging: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  car_rental: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  activity: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  transport: 'bg-brand-signal/10 text-brand-signal-deep dark:text-brand-signal',
};

export function ExploreAreaPicker({ bookings, onSelectArea, activeAreaKey }: ExploreAreaPickerProps) {
  const areas = useMemo(() => extractTripAreas(bookings), [bookings]);

  // Only show if there are 2+ explorable areas
  if (areas.length < 2) return null;

  return (
    <div className="space-y-2 px-1">
      <div className="flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-sm font-medium text-foreground">Pre-explore an area</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Pick a location from your trip to discover what's nearby before you arrive.
      </p>
      <div className="flex flex-wrap gap-2 mt-1">
        {areas.map((area) => {
          const Icon = AREA_ICONS[area.type];
          const colorClasses = AREA_COLORS[area.type];
          const isActive = activeAreaKey === area.key;

          return (
            <Button
              key={area.key}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className={`h-auto py-2 px-3 rounded-xl text-left gap-2 ${
                isActive ? 'ring-2 ring-primary/30' : ''
              }`}
              onClick={() => onSelectArea(area)}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                isActive ? 'bg-primary-foreground/20' : colorClasses
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate leading-tight">{area.label}</p>
                <p className={`text-[10px] truncate leading-tight ${
                  isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>
                  {area.sublabel}
                </p>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
