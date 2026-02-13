/**
 * v2.6.12: Back-to-top button for mobile NOW tab
 * 
 * Appears after ~1 screen of scrolling (300px).
 * Non-intrusive, positioned to avoid overlap with bottom nav and primary actions.
 * Uses throttled scroll listener for performance.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  const handleScroll = useCallback(() => {
    setVisible(window.scrollY > 300);
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [handleScroll]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      variant="secondary"
      className={cn(
        "fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom,0px)+0.5rem)] z-40",
        "w-9 h-9 rounded-full shadow-md",
        "opacity-80 hover:opacity-100 transition-opacity duration-150",
        "md:hidden"
      )}
      aria-label="Back to top"
    >
      <ArrowUp className="w-4 h-4" />
    </Button>
  );
}
