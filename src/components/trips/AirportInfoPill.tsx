import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plane } from 'lucide-react';
import { AirportInfoPanel } from './AirportInfoPanel';
import { getAirportByCode } from '@/lib/airportData';

interface AirportInfoPillProps {
  airportCode: string;
  /** Label for context, e.g., "Origin" or "Destination" */
  label?: string;
}

/**
 * Clickable pill that opens airport information panel
 * Only renders if the airport code is recognized
 */
export function AirportInfoPill({ airportCode, label }: AirportInfoPillProps) {
  const [open, setOpen] = useState(false);
  
  // Only render if we have a valid airport code
  const airport = getAirportByCode(airportCode);
  if (!airport) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 px-2.5 text-xs font-normal"
        onClick={() => setOpen(true)}
      >
        <Plane className="h-3 w-3" />
        {airportCode} info
      </Button>
      
      <AirportInfoPanel
        airportCode={airportCode}
        open={open}
        onOpenChange={setOpen}
        label={label}
      />
    </>
  );
}
