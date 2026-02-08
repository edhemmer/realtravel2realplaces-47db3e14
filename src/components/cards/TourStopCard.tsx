/**
 * TourStopCard - Shared presentational card for tour stop/engagement entities
 * 
 * Patch 2.2.3: Mobile-first layout shell & shared cards
 * 
 * A "dumb" component that receives typed props and renders UI.
 * Does NOT call domain hooks - receives all data from containers.
 * 
 * Tours/Engagements are NON-MONETARY - never show cost fields.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MapPin, Clock, Navigation, Pencil, Trash2, Store, Bell } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export interface TourStopCardProps {
  /** Unique identifier */
  id: string;
  /** Stop name */
  name: string;
  /** Date (YYYY-MM-DD) */
  date: string;
  /** Start time (HH:MM:SS) */
  startTime: string;
  /** End time (HH:MM:SS) - optional */
  endTime?: string | null;
  /** Location name */
  location?: string | null;
  /** Full address */
  address?: string | null;
  /** Store/location number */
  storeNumber?: string | null;
  /** Notes */
  notes?: string | null;
  /** Origin: parsed or manual */
  origin?: 'parsed' | 'manual';
  /** Whether a reminder is set */
  hasReminder?: boolean;
  /** Whether this card is highlighted (drill-through) */
  isHighlighted?: boolean;
  /** Can user edit this stop */
  canEdit?: boolean;
  /** Callback for edit action */
  onEdit?: () => void;
  /** Callback for delete action */
  onDelete?: () => void;
  /** Callback for maps navigation */
  onOpenMaps?: () => void;
  /** Additional class names */
  className?: string;
}

export function TourStopCard({
  id,
  name,
  date,
  startTime,
  endTime,
  location,
  address,
  storeNumber,
  notes,
  origin,
  hasReminder,
  isHighlighted = false,
  canEdit = false,
  onEdit,
  onDelete,
  onOpenMaps,
  className,
}: TourStopCardProps) {
  // Format time for display (HH:MM:SS -> h:mm a)
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const dateObj = new Date();
    dateObj.setHours(hours, minutes, 0);
    return format(dateObj, 'h:mm a');
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEE, MMM d');
    } catch {
      return dateStr;
    }
  };

  const displayLocation = address || location;
  const hasLocation = Boolean(displayLocation);

  return (
    <Card 
      className={cn(
        "transition-all duration-200",
        "hover:shadow-sm",
        isHighlighted && "ring-2 ring-primary animate-pulse",
        className
      )}
    >
      <CardContent className="py-2.5 px-3 sm:py-3 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header row with name + badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-medium text-sm truncate">{name}</h4>
              
              {/* Store number pill */}
              {storeNumber && (
                <Badge 
                  variant="outline" 
                  className="text-[10px] font-medium px-1.5 py-0 h-4 bg-muted/50 border-muted-foreground/20 gap-0.5"
                >
                  <Store className="w-2.5 h-2.5" />
                  #{storeNumber}
                </Badge>
              )}
              
              {/* Origin badge */}
              {origin === 'parsed' && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  Parsed
                </Badge>
              )}

              {/* Reminder indicator */}
              {hasReminder && (
                <Bell className="w-3 h-3 text-primary" />
              )}
            </div>

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(date)} at {formatTime(startTime)}
                {endTime && ` – ${formatTime(endTime)}`}
              </span>
              
              {hasLocation && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[180px]">{displayLocation}</span>
                </span>
              )}
            </div>

            {/* Notes */}
            {notes && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {notes}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 shrink-0">
            {hasLocation && onOpenMaps && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenMaps}
                className="h-7 w-7 sm:h-8 sm:w-8 text-primary hover:text-primary"
                title="Open in Maps"
              >
                <Navigation className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
            {canEdit && onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="h-7 w-7 sm:h-8 sm:w-8"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
            {canEdit && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
