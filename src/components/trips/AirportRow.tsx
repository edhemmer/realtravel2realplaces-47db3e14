import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, Info, Sparkles } from 'lucide-react';
import { Airport } from '@/lib/airportData';

export interface AirportDisplay {
  code: string;
  label: string;
  airport?: Airport;
}

function getGoogleMapsUrl(code: string, name?: string): string {
  const query = name ? `${name} Airport ${code}` : `${code} Airport`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function InlineAirportInfo({ infoUrl, isPro }: { infoUrl?: string; isPro: boolean }) {
  const [open, setOpen] = useState(false);

  if (isPro && infoUrl) {
    return (
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
        <a href={infoUrl} target="_blank" rel="noopener noreferrer" title="View airport info">
          <Info className="h-3.5 w-3.5 text-primary" />
        </a>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Airport info">
          <Info className="h-3.5 w-3.5 text-primary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-64 p-3">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Airport Tools</p>
            <p className="text-xs text-muted-foreground">
              Airport details and tools are available on Pro and Business plans.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface AirportRowProps {
  display: AirportDisplay;
  isPro: boolean;
}

export function AirportRow({ display, isPro }: AirportRowProps) {
  const mapsUrl = getGoogleMapsUrl(display.code, display.airport?.name);
  const infoUrl = display.airport?.officialUrl;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm min-w-0">
        <span className="font-medium">{display.code}</span>
        <span className="text-muted-foreground">–</span>
        <span className="truncate text-muted-foreground">{display.label}</span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" title="View airport on map">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
          </a>
        </Button>
        <InlineAirportInfo infoUrl={infoUrl} isPro={isPro} />
      </div>
    </div>
  );
}
