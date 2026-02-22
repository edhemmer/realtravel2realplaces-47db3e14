/**
 * v4.4.x: Sectioned vertical feed for Explore with per-category "More" pagination
 * Clean headers, compact "More" pill per section, premium place cards
 */

import { AttractionSuggestion } from '@/types/attraction';
import { ExplorePlaceCard } from './ExplorePlaceCard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface PaginatedSection {
  id: string;
  title: string;
  items: AttractionSuggestion[];
  totalCount?: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}

interface ExploreSectionFeedProps {
  sections: PaginatedSection[];
  onNavigate: (attraction: AttractionSuggestion) => void;
  onAdd: (attraction: AttractionSuggestion) => void;
  onLoadMore?: (sectionId: string) => void;
}

export function ExploreSectionFeed({ sections, onNavigate, onAdd, onLoadMore }: ExploreSectionFeedProps) {
  if (sections.length === 0) return null;

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section.id} className="space-y-3">
          {/* Section header */}
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-semibold text-foreground">
              {section.title}
            </h3>
            {section.hasMore && section.totalCount ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs text-primary hover:text-primary/80 gap-1 font-medium"
                disabled={section.isLoadingMore}
                onClick={() => onLoadMore?.(section.id)}
              >
                {section.isLoadingMore ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  `See all ${section.totalCount}`
                )}
              </Button>
            ) : null}
          </div>

          {/* Cards */}
          <div className="grid gap-3">
            {section.items.map((item, idx) => (
              <div
                key={item.id}
                className={idx >= 3 ? 'animate-in fade-in slide-in-from-bottom-2 duration-300' : ''}
              >
                <ExplorePlaceCard
                  attraction={item}
                  onNavigate={() => onNavigate(item)}
                  onAdd={() => onAdd(item)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
