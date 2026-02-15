import { Check } from 'lucide-react';

const outcomes = [
  'Instant "Next Up" clarity — always know what\'s coming',
  'Leave-by timing based on live traffic conditions',
  'Navigation-ready addresses for every stop',
  'Smart reminders for check-ins, departures, and parking',
  'Location-aware suggestions when plans shift',
  'Fewer missed details, less stress on the road',
];

export default function LandingAudience() {
  return (
    <section className="landing-audience-section">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Most travel apps help you plan.
            <br />
            <span className="landing-hero-headline-accent">Real Travel 2 Real Places helps you move.</span>
          </h2>
        </div>

        <ul className="landing-benefits-list">
          {outcomes.map((outcome) => (
            <li key={outcome} className="landing-benefit-item">
              <Check className="w-5 h-5 text-[hsl(var(--landing-accent))] flex-shrink-0" />
              <span>{outcome}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
