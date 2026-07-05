import { Check } from 'lucide-react';

const outcomes = [
  'Instant Next Up clarity so you always know what is coming',
  'Leave-by timing based on your schedule and estimated travel duration',
  'Navigation-ready addresses for stops, lodging, airports, and destinations',
  'Configurable reminders for check-ins, departures, parking, and receipts',
  'Places nearby for food, services, and useful arrival context',
  'Less scrambling, more confidence before and during the trip',
];

export default function LandingAudience() {
  return (
    <section className="landing-audience-section">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <h2 className="landing-section-headline">
            Most travel apps help you plan.
            <br />
            <span className="landing-hero-headline-accent">Real Travel 2 Real Places helps you operate.</span>
          </h2>
        </div>

        <ul className="landing-benefits-list">
          {outcomes.map((outcome) => (
            <li key={outcome} className="landing-benefit-item">
              <Check className="h-5 w-5 flex-shrink-0 text-[hsl(var(--landing-accent))]" />
              <span>{outcome}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
