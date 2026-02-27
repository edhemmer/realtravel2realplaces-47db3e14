/**
 * Patch 2.1.17 / v2.6.21: Attraction card component for Explore tab
 * v2.6.21: Navigate uses canonical openNavTarget (iframe-safe)
 */

import { AttractionSuggestion } from '@/types/attraction';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, MapPin, Plus, Ticket, Clock, Navigation } from 'lucide-react';
import { buildNavTarget, openNavTarget } from '@/lib/location/navigationTargets';

interface AttractionCardProps {
  attraction: AttractionSuggestion;
  onAddToTrip: (attraction: AttractionSuggestion) => void;
}

function getTicketSummary(attraction: AttractionSuggestion): string {
  const { ticketRequired, advanceRecommended, bookingPattern } = attraction.bookingInfo;
  
  if (!ticketRequired && !advanceRecommended) {
    return 'Walk-in';
  }
  
  const parts: string[] = [];
  
  if (ticketRequired) {
    parts.push('Ticket required');
  } else if (advanceRecommended) {
    parts.push('Reservation recommended');
  }
  
  if (bookingPattern && bookingPattern !== 'unknown') {
    const patternLabel = {
      'first-come': 'First-come',
      'time-slot': 'Timed entry',
      'lottery': 'Lottery',
    }[bookingPattern];
    if (patternLabel) parts.push(patternLabel);
  }
  
  return parts.join(' · ');
}

function getPriceBadgeColor(priceLevel: string): string {
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

export function AttractionCard({ attraction, onAddToTrip }: AttractionCardProps) {
  const ticketSummary = getTicketSummary(attraction);
  const showTicketIcon = attraction.bookingInfo.ticketRequired || attraction.bookingInfo.advanceRecommended;
  const bookingUrl = attraction.bookingInfo.officialBookingUrl || attraction.websiteUrl;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row">
        {/* Thumbnail */}
        <div className="w-full sm:w-32 h-32 sm:h-auto flex-shrink-0">
          {attraction.thumbnailUrl ? (
            <img
              src={attraction.thumbnailUrl}
              alt={attraction.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <MapPin className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>

        <CardContent className="flex-1 p-4">
          <div className="flex flex-col gap-2">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-semibold text-base leading-tight">{attraction.name}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm text-muted-foreground">{attraction.category}</span>
                  <span className="text-muted-foreground">·</span>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getPriceBadgeColor(attraction.priceLevel)}`}
                  >
                    {attraction.priceLevel === 'free' ? 'Free' : attraction.priceLevel}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground line-clamp-2">
              {attraction.shortDescription}
            </p>

            {/* Ticket info */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-sm">
                {showTicketIcon ? (
                  <Ticket className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-green-600" />
                )}
                <span className={showTicketIcon ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'}>
                  {ticketSummary}
                </span>
              </div>
              {/* v2.1.19: Ticket clarity helper text */}
              {showTicketIcon && (
                <p className="text-xs text-muted-foreground pl-5">
                  Tickets often sell out. We'll remind you, but availability isn't guaranteed.
                </p>
              )}
            </div>

            {/* Location */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{attraction.locationSummary}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* v2.6.20: Navigate — immediate directions to this place */}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  const target = buildNavTarget({
                    kind: 'PLACE',
                    key: attraction.name,
                    label: attraction.name,
                    address: attraction.locationSummary || undefined,
                  });
                  if (target) openNavTarget(target);
                }}
              >
                <Navigation className="w-3.5 h-3.5" />
                Navigate
              </Button>

              <Button
                size="sm"
                onClick={() => onAddToTrip(attraction)}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add to trip
              </Button>
              
              {bookingUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(bookingUrl, '_blank', 'noopener,noreferrer')}
                  className="gap-1 text-muted-foreground"
                >
                  More details
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
