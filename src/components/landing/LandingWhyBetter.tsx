import { Check } from 'lucide-react';

const benefits = [
  'No manual or semi-automated spreadsheets',
  'No rebuilding trips every time something changes',
  'No guessing which app has the right info',
  'More reliable than notes, docs, or travel planners',
  'Saves real time before, during, and after travel',
];

export default function LandingWhyBetter() {
  return (
    <section className="landing-whybetter-section">
      <div className="max-w-3xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Why people replace spreadsheets and other apps with this
          </h2>
        </div>

        {/* Benefits list */}
        <ul className="landing-benefits-list">
          {benefits.map((benefit) => (
            <li key={benefit} className="landing-benefit-item">
              <Check className="w-5 h-5 text-[hsl(var(--landing-accent))] flex-shrink-0" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        {/* Closer */}
        <p className="landing-whybetter-closer">
          You get your time back. That's the point.
        </p>
      </div>
    </section>
  );
}
