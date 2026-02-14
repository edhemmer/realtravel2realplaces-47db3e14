/**
 * v3.6.0: Premium place card for Explore feed
 * Photo, name, category, distance, rating + reviews, Navigate + Save CTAs
 */

import { AttractionSuggestion } from '@/types/attraction';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Navigation, Bookmark, Ticket } from 'lucide-react';

interface ExplorePlaceCardProps {
  attraction: AttractionSuggestion;
  onNavigate: () => void;
  onSave: () => void;
}

function getPriceBadgeClasses(priceLevel: string): string {
  switch (priceLevel) {
    case 'free':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case '$':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case '$$':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case '$$$':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function ExplorePlaceCard({ attraction, onNavigate, onSave }: ExplorePlaceCardProps) {
  const showTicketBadge =
    attraction.bookingInfo.ticketRequired || attraction.bookingInfo.advanceRecommended;

  return (
    <div className="flex gap-3 p-3 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-shadow">
      {/* Thumbnail */}
      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
        {attraction.thumbnailUrl ? (
          <img
            src={attraction.thumbnailUrl}
            alt={attraction.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {/* Name + category */}
          <h4 className="font-semibold text-sm leading-tight line-clamp-1 text-foreground">
            {attraction.name}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">{attraction.category}</span>
            {attraction.distanceMiles !== undefined && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {attraction.distanceMiles < 1
                    ? '< 1 mi'
                    : `${Math.round(attraction.distanceMiles)} mi`}
                </span>
              </>
            )}
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 ${getPriceBadgeClasses(attraction.priceLevel)}`}
            >
              {attraction.priceLevel === 'free' ? 'Free' : attraction.priceLevel}
            </Badge>
            {showTicketBadge && (
              <Ticket className="w-3 h-3 text-amber-500" />
            )}
          </div>

          {/* Rating */}
          {attraction.rating && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 fill-warning text-warning" />
              <span className="text-xs font-medium text-foreground">
                {attraction.rating.toFixed(1)}
              </span>
              {attraction.reviewCount && (
                <span className="text-xs text-muted-foreground">
                  ({attraction.reviewCount >= 1000
                    ? `${(attraction.reviewCount / 1000).toFixed(1)}k`
                    : attraction.reviewCount}
                  )
                </span>
              )}
            </div>
          )}
        </div>

        {/* CTAs */}
        <div className="flex gap-1.5 mt-2">
          <Button
            size="sm"
            className="h-7 text-xs gap-1 px-3"
            onClick={onNavigate}
          >
            <Navigation className="w-3 h-3" />
            Navigate
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 px-2"
            onClick={onSave}
          >
            <Bookmark className="w-3 h-3" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
