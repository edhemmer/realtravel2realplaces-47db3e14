import { Check } from 'lucide-react';

const tiers = [
  {
    name: 'Free',
    tagline: 'Occasional travel',
    features: [
      'Up to 5 lifetime trips',
      'Flights, stays, stops, expenses, packing',
      'Core reminders and travel alerts',
    ],
    variant: 'free' as const,
  },
  {
    name: 'Pro',
    tagline: 'Frequent travelers',
    features: [
      'Unlimited trips',
      'Smarter reminders and alerts',
      'Advanced expense insights and exports',
    ],
    variant: 'pro' as const,
  },
  {
    name: 'Business',
    tagline: 'Life on the road',
    features: [
      'Unlimited trips',
      'High-volume stops and daily movement',
      'Export-ready expense reporting',
      'Built for domestic and international travel',
    ],
    variant: 'business' as const,
  },
];

export default function LandingPlanTiers() {
  return (
    <section className="landing-tiers-section">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Three tiers — based on how much you travel
          </h2>
        </div>

        {/* Tier Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div 
              key={tier.name} 
              className={`landing-tier-card ${tier.variant === 'business' ? 'landing-tier-card-featured' : ''}`}
            >
              <div className="landing-tier-header">
                <span className={`landing-tier-badge landing-tier-badge-${tier.variant}`}>
                  {tier.name}
                </span>
                <p className="landing-tier-tagline">{tier.tagline}</p>
              </div>

              <ul className="landing-tier-features">
                {tier.features.map((feature) => (
                  <li key={feature}>
                    <Check className="w-4 h-4 text-[hsl(var(--landing-accent))] flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
