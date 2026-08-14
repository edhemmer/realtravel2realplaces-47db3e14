import { Check } from 'lucide-react';

const reasons = [
  'Keep saved bookings, locations, and trip events together',
  'Open available airport, parking, transit, and map links from the trip',
  'Use saved route and stop details during drive trips',
  'Track expenses and attach receipt photos while traveling',
  'Review cached upcoming timeline details after trip data has been loaded',
  'Manage personal and business trip records from the same account',
];

export default function LandingWhyDuringTrip() {
  return (
    <section className="landing-whoitsfor-section">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Useful before and during the trip.
          </h2>
          <p className="landing-section-subtext mt-3">
            Keep the travel details you saved organized and accessible from one trip.
          </p>
        </div>

        <ul className="flex flex-col gap-2.5">
          {reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-3 text-sm text-[hsl(var(--landing-text))]">
              <Check className="w-4 h-4 mt-0.5 text-[hsl(var(--landing-accent))] flex-shrink-0" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
