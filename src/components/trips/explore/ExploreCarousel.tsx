/**
 * v3.6.0: "Right Now" horizontal carousel for Explore
 * Premium compact cards with photo, name, rating, distance, Navigate CTA
 */

import { useRef } from 'react';
import { AttractionSuggestion } from '@/types/attraction';
import { Button } from '@/components/ui/button';
import { Navigation, Star, MapPin, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface ExploreCarouselProps {
  items: AttractionSuggestion[];
  onAdd?: (attraction: AttractionSuggestion) => void;
}

export function ExploreCarousel({ items, onAdd }: ExploreCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 260;
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base font-semibold text-foreground">Right Now</h3>
        <div className="flex gap-1">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-[220px] snap-start rounded-xl overflow-hidden border border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Photo */}
            <div className="relative h-28 w-full bg-muted">
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              {/* Distance badge */}
              {item.distanceMiles !== undefined && (
                <span className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm text-xs font-medium px-2 py-0.5 rounded-full text-foreground">
                  {item.distanceMiles < 1
                    ? '< 1 mi'
                    : `${Math.round(item.distanceMiles)} mi`}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="p-3 space-y-2">
              <div>
                <h4 className="font-semibold text-sm leading-tight line-clamp-1 text-foreground">
                  {item.name}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
              </div>

              {/* Rating */}
              {item.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-warning text-warning" />
                  <span className="text-xs font-medium text-foreground">
                    {item.rating.toFixed(1)}
                  </span>
                  {item.reviewCount && (
                    <span className="text-xs text-muted-foreground">
                      ({item.reviewCount >= 1000
                        ? `${(item.reviewCount / 1000).toFixed(1)}k`
                        : item.reviewCount})
                    </span>
                  )}
                </div>
              )}

              {/* CTA */}
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs gap-1"
                  onClick={() => {
                    const query = item.locationSummary || item.name;
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`,
                      '_blank',
                      'noopener,noreferrer'
                    );
                  }}
                >
                  <Navigation className="w-3 h-3" />
                  Navigate
                </Button>
                {onAdd && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs px-2"
                    onClick={() => onAdd(item)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
