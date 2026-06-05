import { Check } from 'lucide-react';

const tiers = [
  {
    name: 'Free',
    tagline: 'Powerful core for occasional travel',
    features: [
      'Up to 2 lifetime trips with core features',
      'Track flights, stays, expenses, and packing',
      'Reminders and travel alerts built in',
      'One calm system instead of scattered notes',
    ],
    variant: 'free' as const,
  },
  {
    name: 'Pro',
    tagline: 'Frequent travelers',
    features: [
      'Everything in Free, plus…',
      'Unlimited trips with advanced reminders',
      'Explore tab, cost summaries, and trip health insights',
      'Priority support and early access to features',
    ],
    variant: 'pro' as const,
  },
  {
    name: 'Business',
    tagline: 'Life on the road',
    features: [
      'Everything in Pro, plus…',
      'Work-location Stops and daily movement tracking',
      'Multi-trip expense reporting for reimbursement',
      'Built for frequent domestic and international travelers',
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
              className="landing-tier-card landing-tier-card-static"
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
                    <Check className="w-4 h-4 text-[hsl(var(--landing-accent))] flex-shrink-0 mt-0.5" />
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
