/**
 * v3.6.0: Sectioned vertical feed for Explore
 * Clean headers, "See more" expand-in-place, premium place cards
 */

import { useState } from 'react';
import { AttractionSuggestion } from '@/types/attraction';
import { ExploreSection } from '@/lib/exploreRankingSections';
import { ExplorePlaceCard } from './ExplorePlaceCard';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

interface ExploreSectionFeedProps {
  sections: ExploreSection[];
  onNavigate: (attraction: AttractionSuggestion) => void;
  onAdd: (attraction: AttractionSuggestion) => void;
}

const INITIAL_SHOW = 4;

export function ExploreSectionFeed({ sections, onNavigate, onAdd }: ExploreSectionFeedProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleExpand = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  if (sections.length === 0) return null;

  return (
    <div className="space-y-8">
      {sections.map((section) => {
        const isExpanded = expandedSections.has(section.id);
        const visibleItems = isExpanded
          ? section.items
          : section.items.slice(0, INITIAL_SHOW);
        const hasMore = section.items.length > INITIAL_SHOW;

        return (
          <div key={section.id} className="space-y-3">
            {/* Section header */}
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base font-semibold text-foreground">
                {section.title}
              </h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                {section.items.length}
              </span>
            </div>

            {/* Cards */}
            <div className="grid gap-3">
              {visibleItems.map((item) => (
                <ExplorePlaceCard
                  key={item.id}
                  attraction={item}
                  onNavigate={() => onNavigate(item)}
                  onAdd={() => onAdd(item)}
                />
              ))}
            </div>

            {/* See more / less */}
            {hasMore && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => toggleExpand(section.id)}
                >
                  {isExpanded ? 'Show less' : `See ${section.items.length - INITIAL_SHOW} more`}
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
