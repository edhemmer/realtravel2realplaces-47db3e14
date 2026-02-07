/**
 * Travel Help Button
 * 
 * Patch 2.5.0: Sticky help button for trip detail page.
 * Opens the Travel Education Drawer with contextual information
 * about airports and international travel.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { TravelEducationDrawer } from './TravelEducationDrawer';
import { Trip } from '@/types/database';

interface TravelHelpButtonProps {
  trip: Trip;
  /** Whether this trip includes flights (shows airport tab first) */
  hasFlights?: boolean;
  /** Whether this is an international trip */
  isInternational?: boolean;
}

export function TravelHelpButton({ 
  trip, 
  hasFlights = false, 
  isInternational = false 
}: TravelHelpButtonProps) {
  const [open, setOpen] = useState(false);

  // Determine initial tab based on context
  const initialTab = isInternational ? 'international' : 'airport';

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="rounded-full gap-1.5"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Travel Guide</span>
        <span className="sm:hidden">?</span>
      </Button>

      <TravelEducationDrawer
        open={open}
        onOpenChange={setOpen}
        initialTab={initialTab}
      />
    </>
  );
}
