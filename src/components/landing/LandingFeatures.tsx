import { Plane, Receipt, Luggage } from 'lucide-react';

const features = [
  {
    icon: Plane,
    title: 'Trips from confirmations',
    description:
      'Add your airline, stay, or rental confirmations and turn them into a clear, managed trip view—without rebuilding itineraries by hand.',
  },
  {
    icon: Receipt,
    title: 'Expenses that stay with the trip',
    description:
      'Track receipts, expenses, and your share so you always know what this trip really cost you.',
  },
  {
    icon: Luggage,
    title: 'Packing with fewer what-ifs',
    description:
      'Generate packing lists that adjust to your destination and trip length, and update them as plans change.',
  },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="landing-section">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
            Built for real trips, not wishlists
          </h2>
          <p className="text-base sm:text-lg text-[hsl(var(--landing-text-muted))] max-w-2xl mx-auto">
            We don't replace how you plan. We help you stay on top of what you've already booked.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="landing-card landing-feature-card p-6 sm:p-8"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-[hsl(var(--landing-accent)/0.1)] border border-[hsl(var(--landing-accent)/0.2)] flex items-center justify-center mb-5">
                <feature.icon className="w-6 h-6 text-[hsl(var(--landing-accent))]" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-white mb-3">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-sm sm:text-base text-[hsl(var(--landing-text-muted))] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
