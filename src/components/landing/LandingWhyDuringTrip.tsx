import { Check } from 'lucide-react';

const reasons = [
  'See the next thing to do, where it is, and when to leave for it',
  'Open airport maps, parking, local transit, and drive navigation from the trip',
  'Use Drive Cockpit for road conditions, gas, weather, next stops, and offline context',
  'Track expenses in the moment before receipts and details disappear',
  'Keep the trip usable on planes, in garages, in airports, and in weak service areas',
  'Manage simple family trips and complex business travel from the same operating layer',
];

export default function LandingWhyDuringTrip() {
  return (
    <section className="landing-whoitsfor-section">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Useful before, during, and between every move.
          </h2>
          <p className="landing-section-subtext mt-3">
            Planning tools help before you leave. RealTravel keeps working when the trip becomes real.
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
