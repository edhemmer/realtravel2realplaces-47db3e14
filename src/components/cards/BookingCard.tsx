/**
 * BookingCard - Shared presentational card for booking entities
 * 
 * Patch 2.2.3: Mobile-first layout shell & shared cards
 * 
 * A "dumb" component that receives typed props and renders UI.
 * Does NOT call domain hooks - receives all data from containers.
 * 
 * Design principles:
 * - Mobile-first with touch-friendly targets
 * - Consistent padding and spacing
 * - Clear visual hierarchy
 */

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getBookingTypeStyle } from '@/lib/bookingTypeColors';
import { 
  Plane, 
  Building2, 
  Car, 
  PartyPopper, 
  TrainFront,
  Bus,
  TramFront,
  Ship,
  Compass,
  Navigation,
  Pencil,
  Trash2,
  ExternalLink,
  Clock,
  MapPin
} from 'lucide-react';
import { formatLocalTimeDirect, formatLocalDateDirect } from '@/lib/canonicalTimeNormalizer';
import { hasExplicitTime, UNKNOWN_TIME_PLACEHOLDER } from '@/lib/datetimeIntegrity';

export type BookingCardType = 'flight' | 'stay' | 'car_rental' | 'activity' | 'transport';
export type TransportMode = 'train' | 'bus' | 'metro' | 'ferry' | 'other';

export interface BookingCardProps {
  /** Unique identifier */
  id: string;
  /** Type of booking */
  type: BookingCardType;
  /** Primary display name (vendor, airline, property) */
  title: string;
  /** Secondary info line */
  subtitle?: string;
  /** Start datetime ISO string */
  startDatetime: string;
  /** End datetime ISO string (optional) */
  endDatetime?: string | null;
  /** Confirmation number */
  confirmationNumber?: string | null;
  /** Display cost (already formatted, e.g., "$150.00") */
  displayCost?: string | null;
  /** My share cost if different from total */
  myShareCost?: string | null;
  /** Location/address */
  location?: string | null;
  /** For transport: from location */
  fromLocation?: string | null;
  /** For transport: to location */
  toLocation?: string | null;
  /** Transport mode for transport bookings */
  transportMode?: TransportMode | null;
  /** Whether this card is highlighted (drill-through) */
  isHighlighted?: boolean;
  /** Can user edit this booking */
  canEdit?: boolean;
  /** Callback for edit action */
  onEdit?: () => void;
  /** Callback for delete action */
  onDelete?: () => void;
  /** Callback for maps navigation */
  onOpenMaps?: () => void;
  /** Callback for external link */
  onOpenLink?: () => void;
  /** External link URL (for showing link icon) */
  linkUrl?: string | null;
  /** Additional badge content */
  badge?: ReactNode;
  /** Additional content to render in card body */
  children?: ReactNode;
  /** Additional class names */
  className?: string;
}

const TYPE_ICONS: Record<BookingCardType, React.ComponentType<{ className?: string }>> = {
  flight: Plane,
  stay: Building2,
  car_rental: Car,
  activity: Compass,
  transport: TrainFront,
};

const TRANSPORT_MODE_ICONS: Record<TransportMode, React.ComponentType<{ className?: string }>> = {
  train: TrainFront,
  bus: Bus,
  metro: TramFront,
  ferry: Ship,
  other: TrainFront,
};

export function BookingCard({
  id,
  type,
  title,
  subtitle,
  startDatetime,
  endDatetime,
  confirmationNumber,
  displayCost,
  myShareCost,
  location,
  fromLocation,
  toLocation,
  transportMode,
  isHighlighted = false,
  canEdit = false,
  onEdit,
  onDelete,
  onOpenMaps,
  onOpenLink,
  linkUrl,
  badge,
  children,
  className,
}: BookingCardProps) {
  // Determine the icon to use
  const IconComponent = type === 'transport' && transportMode 
    ? TRANSPORT_MODE_ICONS[transportMode] 
    : TYPE_ICONS[type];

  // Format dates for display
  // v2.2.4: Use direct digit extraction to avoid browser timezone shifts.
  const formatDateTime = (datetime: string) => {
    const datePart = formatLocalDateDirect(datetime);
    const timePart = hasExplicitTime(datetime)
      ? (formatLocalTimeDirect(datetime) || UNKNOWN_TIME_PLACEHOLDER)
      : UNKNOWN_TIME_PLACEHOLDER;
    return datePart ? `${datePart}, ${timePart}` : datetime;
  };

  const formatDateOnly = (datetime: string) => {
    // Extract YYYY-MM-DD and format without Date object
    const datePart = datetime.substring(0, 10);
    const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return datetime;
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    return `${MONTHS[month - 1]} ${day}, ${match[1]}`;
  };

  // Determine date display based on booking type
  const renderDateInfo = () => {
    if (type === 'flight' || type === 'transport') {
      return (
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDateTime(startDatetime)}
          {endDatetime && ` → ${formatDateTime(endDatetime)}`}
        </span>
      );
    }
    
    if (type === 'stay' || type === 'car_rental') {
      return (
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDateOnly(startDatetime)}
          {endDatetime && ` – ${formatDateOnly(endDatetime)}`}
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {formatDateTime(startDatetime)}
      </span>
    );
  };

  // Render location info
  const renderLocation = () => {
    if (fromLocation && toLocation) {
      return (
        <span className="flex items-center gap-1 truncate">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{fromLocation} → {toLocation}</span>
        </span>
      );
    }
    
    if (location) {
      return (
        <span className="flex items-center gap-1 truncate">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{location}</span>
        </span>
      );
    }

    return null;
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-200",
        "hover:shadow-md",
        isHighlighted && "ring-2 ring-primary animate-pulse",
        className
      )}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
            getBookingTypeStyle(type).iconContainer
          )}>
            <IconComponent className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Title row with badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-sm sm:text-base truncate">{title}</h4>
                {subtitle && (
                  <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                )}
              </div>
              {badge}
            </div>

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {renderDateInfo()}
              {renderLocation()}
              {confirmationNumber && (
                <Badge variant="outline" className="text-[10px] font-mono">
                  {confirmationNumber}
                </Badge>
              )}
            </div>

            {/* Cost display */}
            {(displayCost || myShareCost) && (
              <div className="flex items-center gap-2 text-sm font-medium">
                {displayCost && <span>{displayCost}</span>}
                {myShareCost && myShareCost !== displayCost && (
                  <span className="text-muted-foreground text-xs">
                    (Your share: {myShareCost})
                  </span>
                )}
              </div>
            )}

            {/* Additional content */}
            {children}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {onOpenMaps && location && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenMaps}
                className="h-8 w-8 text-primary hover:text-primary"
                title="Open in Maps"
              >
                <Navigation className="h-4 w-4" />
              </Button>
            )}
            {onOpenLink && linkUrl && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenLink}
                className="h-8 w-8"
                title="Open booking link"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            {canEdit && onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="h-8 w-8"
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canEdit && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-8 w-8 text-destructive hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
