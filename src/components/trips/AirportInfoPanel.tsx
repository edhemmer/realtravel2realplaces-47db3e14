import { useState } from 'react';
import { Airport, getAirportByCode, formatAirportFull } from '@/lib/airportData';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Globe, 
  Map, 
  Car, 
  ParkingCircle, 
  Clock, 
  Shield, 
  Info,
  Plane,
  X,
  BookOpen,
} from 'lucide-react';
import { TravelEducationDrawer } from './TravelEducationDrawer';

interface AirportInfoPanelProps {
  airportCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Label for context, e.g., "Origin" or "Destination" */
  label?: string;
}

export function AirportInfoPanel({ 
  airportCode, 
  open, 
  onOpenChange,
  label 
}: AirportInfoPanelProps) {
  const airport = getAirportByCode(airportCode);
  const [travelGuideOpen, setTravelGuideOpen] = useState(false);

  // Safely open external URLs
  const openUrl = (url: string | undefined) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader className="relative">
            <DrawerClose asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-2 top-2"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
            
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Plane className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                {label && (
                  <Badge variant="secondary" className="mb-1 text-xs">
                    {label}
                  </Badge>
                )}
                <DrawerTitle className="text-lg">
                  {airport ? airport.name : 'Airport Information'}
                </DrawerTitle>
                <DrawerDescription className="text-sm">
                  {airport ? (
                    <>
                      <span className="font-mono font-semibold">{airport.code}</span>
                      {' · '}
                      {formatAirportFull(airport)}
                    </>
                  ) : (
                    `Airport code: ${airportCode}`
                  )}
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 pb-6">
            {/* Official Website - Primary Action */}
            <div className="mb-6">
              {airport?.officialUrl ? (
                <Button 
                  className="w-full" 
                  onClick={() => openUrl(airport.officialUrl)}
                >
                  <Globe className="mr-2 h-4 w-4" />
                  Official Airport Website
                </Button>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  <Info className="mx-auto mb-2 h-5 w-5" />
                  Official airport information varies by location.
                </div>
              )}
            </div>

            {/* Secondary Links */}
            {airport && (airport.mapUrl || airport.transportUrl || airport.parkingUrl) && (
              <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {airport.mapUrl && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openUrl(airport.mapUrl)}
                  >
                    <Map className="mr-1.5 h-3.5 w-3.5" />
                    Map
                  </Button>
                )}
                {airport.transportUrl && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openUrl(airport.transportUrl)}
                  >
                    <Car className="mr-1.5 h-3.5 w-3.5" />
                    Transport
                  </Button>
                )}
                {airport.parkingUrl && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openUrl(airport.parkingUrl)}
                  >
                    <ParkingCircle className="mr-1.5 h-3.5 w-3.5" />
                    Parking
                  </Button>
                )}
              </div>
            )}

            <Separator className="my-4" />

            {/* Standard Airport Guidance */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Arrival Timing
              </h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Domestic flights:</span>{' '}
                  Arrive ~2 hours before departure
                </p>
                <p>
                  <span className="font-medium text-foreground">International flights:</span>{' '}
                  Arrive ~3 hours before departure
                </p>
              </div>

              <Separator />

              <h4 className="flex items-center gap-2 text-sm font-medium">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Security Note
              </h4>
              <p className="text-sm text-muted-foreground">
                Security screening is required before airside access.
              </p>

              <Separator />

              <h4 className="flex items-center gap-2 text-sm font-medium">
                <Plane className="h-4 w-4 text-muted-foreground" />
                Terminal Reminder
              </h4>
              <p className="text-sm text-muted-foreground">
                Confirm terminal details with your airline.
              </p>

              <Separator />

              {/* Landside vs Airside Explainer */}
              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="mb-2 text-sm font-medium">
                  Landside vs Airside
                </h4>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Landside</span>{' '}
                    includes check-in, ticketing, and baggage drop.
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Airside</span>{' '}
                    is past security and requires a boarding pass.
                  </p>
                </div>
              </div>

              {/* v2.5.0: Link to full Travel Guide */}
              <Separator />
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                  setTimeout(() => setTravelGuideOpen(true), 300);
                }}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                View Full Travel Guide
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>

      {/* Travel Education Drawer */}
      <TravelEducationDrawer 
        open={travelGuideOpen} 
        onOpenChange={setTravelGuideOpen}
        initialTab="airport"
      />
    </Drawer>
  );
}
