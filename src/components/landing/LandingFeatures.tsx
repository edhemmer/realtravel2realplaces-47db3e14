import { Plane, Receipt, Luggage } from 'lucide-react';

const features = [
  {
    icon: Plane,
    title: 'Trips from confirmations',
    description: 'Add your airline, stay, or rental confirmations and turn them into a clear, managed trip view.',
  },
  {
    icon: Receipt,
    title: 'Expenses that stay with the trip',
    description: 'Track receipts and your share so you always know what this trip really cost you.',
  },
  {
    icon: Luggage,
    title: 'Packing without the what-ifs',
    description: 'Generate packing lists that adjust to your destination and update as plans change.',
  },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="landing-features-section">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="landing-section-headline">
            What you get
          </h2>
          <p className="landing-section-subtext">
            Simple tools that help you stay on top of what you've already booked.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid sm:grid-cols-3 gap-8 max-w-5xl mx-auto">
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
