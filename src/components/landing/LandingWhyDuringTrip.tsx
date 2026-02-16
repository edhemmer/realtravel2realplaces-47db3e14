import { Check } from 'lucide-react';

const reasons = [
  'Get directions to your next stop without searching',
  'Pull up your lodging address instantly',
  'Log expenses before you forget the details',
  'See what\'s next in seconds — no digging through emails',
  'Have your whole trip laid out clearly in one view',
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
