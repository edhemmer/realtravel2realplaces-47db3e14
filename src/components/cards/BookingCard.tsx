/**
 * BookingCard - Compact presentational card for booking entities
 * 
 * v5.0.0: 40-50% height reduction — single-line metadata, tighter padding
 */

import { ReactNode, useState } from 'react';
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
  id: string;
  type: BookingCardType;
  title: string;
  subtitle?: string;
  startDatetime: string;
  endDatetime?: string | null;
  confirmationNumber?: string | null;
  displayCost?: string | null;
  myShareCost?: string | null;
  location?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  transportMode?: TransportMode | null;
  isHighlighted?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onOpenMaps?: () => void;
  onOpenLink?: () => void;
  linkUrl?: string | null;
  badge?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Traveler names for compressed display */
  travelers?: string[];
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
  travelers,
}: BookingCardProps) {
  const [showAllTravelers, setShowAllTravelers] = useState(false);

  const IconComponent = type === 'transport' && transportMode 
    ? TRANSPORT_MODE_ICONS[transportMode] 
    : TYPE_ICONS[type];

  const formatDateTime = (datetime: string) => {
    const datePart = formatLocalDateDirect(datetime);
    const timePart = hasExplicitTime(datetime)
      ? (formatLocalTimeDirect(datetime) || UNKNOWN_TIME_PLACEHOLDER)
      : UNKNOWN_TIME_PLACEHOLDER;
    return datePart ? `${datePart}, ${timePart}` : datetime;
  };

  const formatDateOnly = (datetime: string) => {
    const datePart = datetime.substring(0, 10);
    const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return datetime;
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    return `${MONTHS[month - 1]} ${day}`;
  };

  const renderDateCompact = () => {
    if (type === 'flight' || type === 'transport') {
      return formatDateTime(startDatetime) + (endDatetime ? ` → ${formatDateTime(endDatetime)}` : '');
    }
    if (type === 'stay' || type === 'car_rental') {
      return formatDateOnly(startDatetime) + (endDatetime ? ` – ${formatDateOnly(endDatetime)}` : '');
    }
    return formatDateTime(startDatetime);
  };

  const renderRoute = () => {
    if (fromLocation && toLocation) return `${fromLocation} → ${toLocation}`;
    if (location) return location;
    return null;
  };

  const renderTravelers = () => {
    if (!travelers || travelers.length === 0) return null;
    if (showAllTravelers || travelers.length <= 2) {
      return travelers.join(', ');
    }
    const visible = travelers.slice(0, 2);
    return (
      <span>
        {visible.join(', ')} 
        <button 
          onClick={(e) => { e.stopPropagation(); setShowAllTravelers(true); }}
          className="text-primary ml-1 hover:underline"
        >
          +{travelers.length - 2}
        </button>
      </span>
    );
  };

  const route = renderRoute();

  return (
    <Card 
      className={cn(
        "transition-all duration-150",
        isHighlighted && "ring-2 ring-primary animate-pulse",
        className
      )}
    >
      <CardContent className="p-2.5 sm:p-3">
        <div className="flex items-center gap-2.5">
          {/* Icon — smaller */}
          <div className={cn(
            "shrink-0 w-8 h-8 rounded-md flex items-center justify-center",
            getBookingTypeStyle(type).iconContainer
          )}>
            <IconComponent className="w-4 h-4" />
          </div>

          {/* Content — compressed */}
          <div className="flex-1 min-w-0">
            {/* Line 1: Title + confirmation */}
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm truncate">{title}</h4>
              {confirmationNumber && (
                <Badge variant="outline" className="text-[9px] font-mono h-4 px-1 shrink-0">
                  {confirmationNumber}
                </Badge>
              )}
              {badge}
            </div>
            
            {/* Line 2: Route + Date + Cost — single line */}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 truncate">
              {route && (
                <>
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{route}</span>
                  <span className="text-muted-foreground/30">·</span>
                </>
              )}
              <Clock className="w-3 h-3 shrink-0" />
              <span className="truncate">{renderDateCompact()}</span>
              {displayCost && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="font-medium text-foreground">{displayCost}</span>
                  {myShareCost && myShareCost !== displayCost && (
                    <span className="text-muted-foreground/60">({myShareCost})</span>
                  )}
                </>
              )}
            </div>

            {/* Line 3: Travelers summary (compressed) */}
            {travelers && travelers.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {renderTravelers()}
              </p>
            )}
          </div>

          {/* Actions — inline icons */}
          <div className="flex items-center gap-0.5 shrink-0">
            {onOpenMaps && location && (
              <Button variant="ghost" size="icon" onClick={onOpenMaps} className="h-7 w-7 text-primary" title="Maps">
                <Navigation className="h-3.5 w-3.5" />
              </Button>
            )}
            {onOpenLink && linkUrl && (
              <Button variant="ghost" size="icon" onClick={onOpenLink} className="h-7 w-7" title="Link">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
            {canEdit && onEdit && (
              <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7" title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {canEdit && onDelete && (
              <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-destructive" title="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Additional content */}
        {children}
      </CardContent>
    </Card>
  );
}
