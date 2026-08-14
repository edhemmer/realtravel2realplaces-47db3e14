import { Button } from '@/components/ui/button';
import { MapPin, Info } from 'lucide-react';
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

interface AirportRowProps {
  display: AirportDisplay;
}

export function AirportRow({ display }: AirportRowProps) {
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

        {infoUrl && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
            <a href={infoUrl} target="_blank" rel="noopener noreferrer" title="Open official airport information">
              <Info className="h-3.5 w-3.5 text-primary" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
