/**
 * Travel Education Drawer
 * 
 * Patch 2.5.0: Foundational airport and international travel context.
 * Provides static, educational information to help users understand
 * airport structure and international travel concepts.
 * 
 * No real-time data, maps, or navigation - purely informational.
 */

import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plane,
  Globe,
  Shield,
  Luggage,
  Clock,
  MapPin,
  Users,
  FileCheck,
  ArrowRight,
  X,
  Building2,
  Car,
  Info,
} from 'lucide-react';

interface TravelEducationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Initial tab to show: 'airport' or 'international' */
  initialTab?: 'airport' | 'international';
}

export function TravelEducationDrawer({
  open,
  onOpenChange,
  initialTab = 'airport',
}: TravelEducationDrawerProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader className="relative pb-2">
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
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DrawerTitle className="text-lg">Travel Guide</DrawerTitle>
                <DrawerDescription>
                  Helpful information for your journey
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

          <div className="px-4 pb-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'airport' | 'international')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="airport" className="text-sm">
                  <Plane className="mr-1.5 h-3.5 w-3.5" />
                  Airport Guide
                </TabsTrigger>
                <TabsTrigger value="international" className="text-sm">
                  <Globe className="mr-1.5 h-3.5 w-3.5" />
                  International
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[60vh] mt-4">
                <TabsContent value="airport" className="mt-0 space-y-6">
                  <AirportGuideContent />
                </TabsContent>

                <TabsContent value="international" className="mt-0 space-y-6">
                  <InternationalGuideContent />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Airport Guide Content
 * Explains airport structure, terminology, and typical layout.
 */
function AirportGuideContent() {
  return (
    <div className="space-y-6 pb-6">
      {/* Landside vs Airside */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Building2 className="h-4 w-4 text-primary" />
          Landside vs Airside
        </h3>
        <div className="rounded-lg bg-muted/50 p-4 space-y-3">
          <div>
            <p className="font-medium text-sm">Landside</p>
            <p className="text-sm text-muted-foreground">
              The public area of the airport accessible without a boarding pass. 
              Includes check-in counters, ticketing, baggage drop-off, and the main 
              entrance/exit areas.
            </p>
          </div>
          <Separator />
          <div>
            <p className="font-medium text-sm">Airside</p>
            <p className="text-sm text-muted-foreground">
              The secure area past security screening, accessible only with a valid 
              boarding pass. Contains departure gates, lounges, and duty-free shops.
            </p>
          </div>
        </div>
      </section>

      {/* Terminal vs Concourse */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <MapPin className="h-4 w-4 text-primary" />
          Terminal vs Concourse
        </h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Terminal:</span>{' '}
            A building or section of an airport where passengers check in, 
            go through security, and access gates. Large airports may have 
            multiple terminals.
          </p>
          <p>
            <span className="font-medium text-foreground">Concourse:</span>{' '}
            A corridor or hallway within a terminal that leads to departure gates. 
            Often labeled with letters (A, B, C) or numbers.
          </p>
          <p className="mt-2 text-xs italic">
            Tip: Always confirm your terminal before arriving. Some airports 
            have separate terminals far apart, requiring shuttle transportation.
          </p>
        </div>
      </section>

      {/* Security Checkpoints */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Shield className="h-4 w-4 text-primary" />
          Security Checkpoints
        </h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Security screening is required to access the airside area. You'll 
            typically go through:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Document check (ID and boarding pass verification)</li>
            <li>Body screening (metal detector or body scanner)</li>
            <li>Carry-on baggage X-ray</li>
          </ul>
          <p className="mt-2">
            <span className="font-medium text-foreground">TSA PreCheck / Global Entry:</span>{' '}
            Trusted traveler programs that offer expedited screening in the US.
          </p>
        </div>
      </section>

      {/* Baggage Claim */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Luggage className="h-4 w-4 text-primary" />
          Baggage Claim
        </h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Located on the landside after you exit the secure area. Checked bags 
            are delivered to rotating carousels, typically identified by your 
            flight number on overhead displays.
          </p>
          <p className="text-xs italic">
            Tip: Keep your baggage claim tag until you retrieve your luggage—some 
            airports require matching tags at exit.
          </p>
        </div>
      </section>

      {/* Ground Transportation */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Car className="h-4 w-4 text-primary" />
          Ground Transportation
        </h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Ground transportation options are typically located on the lower 
            level (arrivals level) outside baggage claim:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Taxis and rideshare pickup zones</li>
            <li>Rental car shuttles or on-site facilities</li>
            <li>Public transit connections (train, bus)</li>
            <li>Hotel shuttles (often at designated stops)</li>
          </ul>
        </div>
      </section>

      {/* Arrival Timing */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Clock className="h-4 w-4 text-primary" />
          Recommended Arrival Times
        </h3>
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Domestic flights</span>
            <span className="text-sm font-medium">~2 hours before departure</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm">International flights</span>
            <span className="text-sm font-medium">~3 hours before departure</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Allow extra time during peak travel periods, holidays, or if you're 
          checking bags.
        </p>
      </section>
    </div>
  );
}

/**
 * International Travel Guide Content
 * Explains passport control, customs, immigration, and time zones.
 */
function InternationalGuideContent() {
  return (
    <div className="space-y-6 pb-6">
      {/* Passport Control vs Customs */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <FileCheck className="h-4 w-4 text-primary" />
          Passport Control vs Customs
        </h3>
        <div className="rounded-lg bg-muted/50 p-4 space-y-3">
          <div>
            <p className="font-medium text-sm">Passport Control (Immigration)</p>
            <p className="text-sm text-muted-foreground">
              Verifies your identity and legal right to enter or leave a country. 
              Officers check your passport, visa (if required), and may ask about 
              the purpose of your visit.
            </p>
          </div>
          <Separator />
          <div>
            <p className="font-medium text-sm">Customs</p>
            <p className="text-sm text-muted-foreground">
              Checks what you're bringing into the country. You may need to 
              declare certain items, pay duties on goods over allowed limits, 
              or have bags inspected.
            </p>
          </div>
        </div>
      </section>

      {/* Entry vs Exit Immigration */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Users className="h-4 w-4 text-primary" />
          Entry vs Exit Immigration
        </h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Entry Immigration:</span>{' '}
            Occurs when you arrive in a new country. You'll present your passport 
            and any required visas. Officers may ask about your travel plans, 
            accommodation, and return ticket.
          </p>
          <p>
            <span className="font-medium text-foreground">Exit Immigration:</span>{' '}
            Some countries require you to pass through immigration when leaving. 
            This verifies you haven't overstayed your allowed time and officially 
            records your departure.
          </p>
          <p className="text-xs italic mt-2">
            Note: Not all countries have exit immigration (e.g., the US does not).
          </p>
        </div>
      </section>

      {/* Typical Arrival Steps */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <ArrowRight className="h-4 w-4 text-primary" />
          Typical Arrival Steps
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          When arriving in a foreign country, you'll typically proceed in this order:
        </p>
        <div className="space-y-2">
          <StepItem number={1} title="Deplane" description="Exit the aircraft and follow signs to arrivals" />
          <StepItem number={2} title="Immigration / Passport Control" description="Present passport and any required visas" />
          <StepItem number={3} title="Baggage Claim" description="Collect checked luggage from the carousel" />
          <StepItem number={4} title="Customs" description="Declare items if required, or proceed through 'Nothing to Declare'" />
          <StepItem number={5} title="Exit to Arrivals" description="Ground transportation, meeters/greeters" />
        </div>
      </section>

      {/* Time Zones */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Clock className="h-4 w-4 text-primary" />
          Time Zone Awareness
        </h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            International travel often involves crossing multiple time zones. 
            Keep these points in mind:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <span className="font-medium text-foreground">Flight times:</span>{' '}
              Departure and arrival times are usually shown in local time for 
              each location.
            </li>
            <li>
              <span className="font-medium text-foreground">Date changes:</span>{' '}
              Eastbound long-haul flights may arrive "the next day"; westbound 
              flights may arrive earlier than departure time on the same day.
            </li>
            <li>
              <span className="font-medium text-foreground">Jet lag:</span>{' '}
              Your body needs time to adjust. Allow for rest when possible, 
              especially after crossing 6+ time zones.
            </li>
          </ul>
        </div>
      </section>

      {/* Documents Checklist */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <FileCheck className="h-4 w-4 text-primary" />
          Key Documents
        </h3>
        <div className="rounded-lg border p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>Valid passport (check expiration—many countries require 6+ months validity)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>Visa or entry authorization (if required)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>Return or onward ticket</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>Accommodation details</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>Travel insurance information</span>
          </div>
        </div>
      </section>

      {/* General Tips */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Info className="h-4 w-4 text-primary" />
          General Tips
        </h3>
        <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm text-muted-foreground">
          <p>
            • Keep important documents in your carry-on, not checked luggage
          </p>
          <p>
            • Have electronic and paper copies of key documents
          </p>
          <p>
            • Know the local emergency number for your destination
          </p>
          <p>
            • Register with your embassy if traveling to unfamiliar areas
          </p>
        </div>
      </section>
    </div>
  );
}

/**
 * Step item for the arrival process
 */
function StepItem({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {number}
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
