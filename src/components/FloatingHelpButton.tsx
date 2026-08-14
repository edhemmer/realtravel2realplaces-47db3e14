/**
 * FloatingHelpButton
 *
 * Persistent contextual help for authenticated pages. Tips describe only
 * currently exposed, evidence-backed behavior.
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
      'Use Add Trip to create a trip when trip creation is available on this device.',
      'Your saved trips are grouped with their date-based lifecycle state.',
      'Trips shared with your account appear in Shared With Me.',
    ],
  },
  '/account': {
    title: 'Account Settings',
    tips: [
      'Review the plan tier currently attached to your account.',
      'Save travel display defaults such as currency, date format, distance, and temperature units.',
      'Change appearance, request a password reset, or delete your account from this page.',
    ],
  },
  '/plans': {
    title: 'Plans',
    tips: [
      'This page shows the plan currently attached to your account.',
      'Paid options remain hidden until their complete purchase and feature workflows are available.',
    ],
  },
  '/reports': {
    title: 'Reports',
    tips: [
      'Reports use saved expense records from trips your account can access.',
      'Filters change the rows shown in the report and exported files.',
      'PDF and CSV exports reflect the current filtered report view.',
    ],
  },
  '/help': {
    title: 'Help Center',
    tips: [
      'Use the Help Center for guidance on currently supported workflows.',
      'If a capability is not available in the product, Help should not advertise it.',
    ],
  },
};

function getTripPageHelp(pathname: string): PageHelp | null {
  if (pathname.match(/\/trip\/[^/]+\/drive/)) {
    return {
      title: 'Drive Details',
      tips: [
        'Review the starting point and destination saved with the trip.',
        'Use the navigation handoff when an available navigation target is shown.',
        'Return to the trip to review its other saved records.',
      ],
    };
  }
  if (pathname.startsWith('/trip/')) {
    return {
      title: 'Trip Detail',
      tips: [
        'Use the trip sections to review saved reservations, timeline events, expenses, parking, packing, and travelers.',
        'Timeline shows saved trip events in date order.',
        'Places can show provider-backed results when the required location and provider data are available.',
        'Expenses and receipts stay attached to the trip record for later review.',
        'Airport links and drive navigation are shown only when the required saved trip data is available.',
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
    <div
      className="fixed right-4 bottom-[calc(var(--rt2rp-safe-bottom,env(safe-area-inset-bottom,0px))+5rem)] z-40"
    >
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
              Need help? Open the Help Center for supported guides and tips.
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
