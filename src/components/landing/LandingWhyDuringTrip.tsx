import { Check } from 'lucide-react';

const reasons = [
  'See the next thing to do — and when to leave for it',
  'Open one screen instead of three apps and a text thread',
  'Get directive transport guidance, not a list of options',
  'Log expenses in any currency before you forget the details',
  'Keep working when you lose signal on a plane or in the mountains',
];

export default function LandingWhyDuringTrip() {
  return (
    <section className="landing-whoitsfor-section">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Why use it during the trip?
          </h2>
          <p className="landing-section-subtext mt-3">
            Most travel apps are useful before you leave. This one is useful while you're on the road.
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
