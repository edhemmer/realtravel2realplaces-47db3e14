import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const freePlanFeatures = [
  'Manage up to 5 real trips',
  'Add travel confirmations',
  'Track receipts and expenses',
  'Build packing lists',
  'Access from any device',
];

const proPlanFeatures = [
  'Advanced expense insights',
  'Smarter reminders',
  'More automation',
  'Priority support',
];

export default function LandingPricing() {
  return (
    <section className="landing-pricing-section">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="landing-section-headline">
            Simple pricing
          </h2>
          <p className="landing-section-subtext">
            Start free. Upgrade when you need more.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Plan */}
          <div className="landing-pricing-card-v2">
            <div className="landing-pricing-header">
              <span className="landing-pricing-badge">Free</span>
              <p className="landing-pricing-tagline">
                Everything you need to get started
              </p>
            </div>

            <ul className="landing-pricing-features">
              {freePlanFeatures.map((feature) => (
                <li key={feature}>
                  <Check className="w-5 h-5 text-[hsl(var(--landing-accent))]" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link to="/auth?tab=signup" className="landing-btn-primary-pricing">
              Get started (Free)
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="landing-pricing-card-v2 landing-pricing-card-pro">
            <div className="landing-pricing-header">
              <span className="landing-pricing-badge-pro">Pro</span>
              <p className="landing-pricing-tagline">
                Coming soon for frequent travelers
              </p>
            </div>

            <ul className="landing-pricing-features">
              {proPlanFeatures.map((feature) => (
                <li key={feature}>
                  <Check className="w-5 h-5 text-[hsl(var(--landing-accent))]" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button 
              disabled 
              className="landing-btn-secondary-pricing"
            >
              Coming soon
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
