/**
 * MobileSectionHeader - Context header for secondary ("More") tabs on mobile
 *
 * v2.3.10: Shows section title + trip name when user is inside a
 * secondary tab accessed via the "More" bottom-nav menu.
 * Scrolls with content, mobile-only, no routing or state changes.
 */

import { Separator } from '@/components/ui/separator';

interface MobileSectionHeaderProps {
  sectionTitle: string;
  tripName: string;
}

export function MobileSectionHeader({ sectionTitle, tripName }: MobileSectionHeaderProps) {
  return (
    <div className="md:hidden">
      <div className="py-3 px-0.5">
        <h2 className="text-lg font-bold leading-tight text-foreground">{sectionTitle}</h2>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{tripName}</p>
      </div>
      <Separator className="mb-3" />
    </div>
  );
}
