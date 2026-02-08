import { Check } from 'lucide-react';

const tiers = [
  {
    name: 'Free',
    tagline: 'Occasional travel',
    description: 'For families and personal travelers who want one calm place to manage real trips.',
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
    description: 'For people who travel often and want less friction and more visibility.',
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
    description: 'For independent contractors, field teams, bands, and professionals who travel constantly.',
    features: [
      'Unlimited trips',
      'High-volume tour stops and daily movement',
      'Export-ready expense reporting',
      'Built for domestic and international travel',
    ],
    variant: 'business' as const,
  },
];

export default function LandingPlanTiers() {
  return (
    <section className="landing-tiers-section">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="landing-section-headline">
            Three tiers — based on how much you travel
          </h2>
          <p className="landing-section-subtext">
            Real Travel 2 Real Places scales with your travel demand, from occasional trips to life on the road.
          </p>
        </div>

        {/* Tier Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
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

              <p className="landing-tier-description">{tier.description}</p>

              <ul className="landing-tier-features">
                {tier.features.map((feature) => (
                  <li key={feature}>
                    <Check className="w-5 h-5 text-[hsl(var(--landing-accent))]" />
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
