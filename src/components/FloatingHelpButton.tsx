/**
 * FloatingHelpButton — v4.8.0
 * 
 * Persistent floating help button visible on all authenticated pages.
 * Shows contextual page-level tips in a popover, with a link to the full Help Center.
 */

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface PageHelp {
  title: string;
  tips: string[];
}

const PAGE_HELP: Record<string, PageHelp> = {
  '/dashboard': {
    title: 'Dashboard',
    tips: [
      'Tap "Create Trip" to start a new trip.',
      'Your active, shared, and past trips all appear here.',
      'Swipe left on a trip card to delete it.',
    ],
  },
  '/account': {
    title: 'Account Settings',
    tips: [
      'Update your profile, travel preferences, and notification settings.',
      'Set your home airport for smarter flight suggestions.',
      'Manage your subscription plan here.',
    ],
  },
  '/plans': {
    title: 'Plans',
    tips: [
      'Compare Free, Pro, and Business plan features.',
      'Upgrade anytime to unlock unlimited trips and advanced features.',
    ],
  },
  '/reports': {
    title: 'Reports',
    tips: [
      'View expense summaries across all your trips.',
      'Export reports as PDF for reimbursement.',
    ],
  },
  '/help': {
    title: 'Help Center',
    tips: [
      'Browse topics by section or search for keywords.',
      'Each article shows which plan tier is required.',
    ],
  },
};

function getTripPageHelp(pathname: string): PageHelp | null {
  if (pathname.startsWith('/trip/')) {
    return {
      title: 'Trip Detail',
      tips: [
        'Use NOW to see what\'s happening right now on your trip.',
        'Switch to PLAN to view your full timeline and bookings.',
        'EXPLORE discovers real places near your destination.',
        'Track expenses in the EXPENSES tab.',
        'Access Bookings, Parking, Packing, and more from the "More" menu.',
      ],
    };
  }
  return null;
}

export function FloatingHelpButton() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const pageHelp = PAGE_HELP[location.pathname] || getTripPageHelp(location.pathname);

  return (
    <div className="fixed bottom-20 right-4 z-40 md:bottom-6">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
            aria-label="Help"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          className="w-72 p-4 rounded-xl"
          sideOffset={12}
        >
          {pageHelp ? (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground">{pageHelp.title} Tips</h4>
              <ul className="space-y-1.5">
                {pageHelp.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-primary font-bold mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Need help? Visit the full Help Center for guides and tips.
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3 text-xs"
            onClick={() => {
              setOpen(false);
              navigate('/help');
            }}
          >
            Open Help Center
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
