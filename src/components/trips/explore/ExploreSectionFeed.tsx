/**
 * v4.4.x: Sectioned vertical feed for Explore with per-category "More" pagination
 * Clean headers, compact "More" pill per section, premium place cards
 */

import { AttractionSuggestion } from '@/types/attraction';
import { ExplorePlaceCard } from './ExplorePlaceCard';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown } from 'lucide-react';

interface PaginatedSection {
  id: string;
  title: string;
  items: AttractionSuggestion[];
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
          {/* Section header with inline More */}
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-semibold text-foreground">
              {section.title}
            </h3>
            {section.hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                disabled={section.isLoadingMore}
                onClick={() => onLoadMore?.(section.id)}
              >
                {section.isLoadingMore ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    More
                    <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Cards */}
          <div className="grid gap-3">
            {section.items.map((item) => (
              <ExplorePlaceCard
                key={item.id}
                attraction={item}
                onNavigate={() => onNavigate(item)}
                onAdd={() => onAdd(item)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
