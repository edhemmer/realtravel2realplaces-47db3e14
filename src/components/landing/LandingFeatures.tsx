import { Plane, Receipt, Luggage, MapPin, Bell } from 'lucide-react';

const features = [
  {
    icon: Plane,
    title: 'Trips created from real confirmations',
    description: 'Add your airline, hotel, or rental car confirmations and turn them into a clear, managed trip view.',
  },
  {
    icon: MapPin,
    title: 'Flights, stays, and tour stops in one timeline',
    description: 'See everything attached to the trip in one scrollable timeline — no jumping between apps.',
  },
  {
    icon: Receipt,
    title: 'Expenses that stay attached to the trip',
    description: 'Track receipts and your share so you always know what this trip really cost you.',
  },
  {
    icon: Luggage,
    title: 'Packing lists that adapt',
    description: 'Generate packing lists that adjust to your destination and dates, and update as things change.',
  },
  {
    icon: Bell,
    title: 'Travel alerts and reminders that matter',
    description: 'Get reminded about what matters on the road — not what the app thinks is clever.',
  },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="landing-features-section">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="landing-section-headline">
            What Real Travel 2 Real Places manages for you
          </h2>
          <p className="landing-section-subtext">
            Simple tools that help you stay on top of what you've already booked.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature) => (
            <div key={feature.title} className="landing-feature-card-v2">
              <div className="landing-feature-icon">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="landing-feature-title">{feature.title}</h3>
              <p className="landing-feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}