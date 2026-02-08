import { FileCheck, Link2, Route, DollarSign, Bell } from 'lucide-react';

const features = [
  {
    icon: FileCheck,
    title: 'Trips created from real confirmations',
    description: 'Drop in airline, hotel, or rental confirmations. We organize them — you don\'t rebuild trips by hand.',
  },
  {
    icon: Link2,
    title: 'Everything stays attached to the trip',
    description: 'Flights, stays, stops, expenses, packing, reminders — nothing floats off into another app.',
  },
  {
    icon: Route,
    title: 'Built for real movement, not perfect plans',
    description: 'Trips change. Stops move. Times shift. The system holds together when that happens.',
  },
  {
    icon: DollarSign,
    title: 'Expenses that make sense later',
    description: 'Costs stay tied to the trip so you know what it actually cost — not what you think it did.',
  },
  {
    icon: Bell,
    title: 'Reminders that matter',
    description: 'Check-ins, departures, next stops — not noise.',
  },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="landing-features-section">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            What Real Travel 2 Real Places does for you
          </h2>
        </div>

        {/* Feature Cards */}
        <div className="landing-features-grid">
          {features.map((feature) => (
            <div key={feature.title} className="landing-feature-card">
              <div className="landing-feature-icon">
                <feature.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="landing-feature-title">{feature.title}</h3>
                <p className="landing-feature-description">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
