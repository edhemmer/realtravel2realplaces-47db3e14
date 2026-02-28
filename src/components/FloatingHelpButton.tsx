/**
 * FloatingHelpButton — v4.10.0
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
      'Tap "Create Trip" to start a new trip — choose Fly, Drive, or Train.',
      'Paste a confirmation or drop a screenshot to create a trip automatically.',
      'Your active, shared, and past trips all appear here.',
    ],
  },
  '/account': {
    title: 'Account Settings',
    tips: [
      'Update your profile, travel preferences, and notification timing.',
      'Set your home airport for smarter flight suggestions.',
      'Configure vehicle range (tank size, miles per tank) for Drive Trips.',
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
      'Filter by date range, category, or trip.',
      'Export reports as PDF for reimbursement.',
    ],
  },
  '/help': {
    title: 'Help Center',
    tips: [
      'Browse by section or tap a topic in the quick nav bar.',
      'Each article shows which plan tier is required.',
      'Step-by-step guides for every feature.',
    ],
  },
};

function getTripPageHelp(pathname: string): PageHelp | null {
  if (pathname.match(/\/trip\/[^/]+\/drive/)) {
    return {
      title: 'Drive Mode',
      tips: [
        'See your current route and next destination.',
        'Tap Navigate to open turn-by-turn directions.',
        'Return to NOW to see your full execution view.',
      ],
    };
  }
  if (pathname.startsWith('/trip/')) {
    return {
      title: 'Trip Detail',
      tips: [
        'NOW shows what\'s happening right now — next action, leave-by time, and quick actions.',
        'PLAN shows your full timeline with all events grouped by date.',
        'EXPLORE discovers real places nearby — tap "Add to Timeline" to schedule visits.',
        'Track expenses in EXPENSES. Upload receipt photos for automatic entry.',
        'Access Bookings, Parking, Packing, Companions, and more from the MORE menu.',
        'For Drive Trips: tap Drive Mode in NOW to access focused navigation.',
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
