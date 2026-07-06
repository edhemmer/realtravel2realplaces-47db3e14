/**
 * MobileSectionHeader - Context header for secondary ("More") tabs on mobile
 *
 * v2.3.10: Shows section title + trip name when user is inside a
 * secondary tab accessed via the "More" bottom-nav menu.
 * Scrolls with content, mobile-only, no routing or state changes.
 */

interface MobileSectionHeaderProps {
  sectionTitle: string;
  tripName: string;
}

export function MobileSectionHeader({ sectionTitle, tripName }: MobileSectionHeaderProps) {
  return (
    <div className="rt-ios-section-heading md:hidden">
      <p>{tripName}</p>
      <h2>{sectionTitle}</h2>
    </div>
  );
}
