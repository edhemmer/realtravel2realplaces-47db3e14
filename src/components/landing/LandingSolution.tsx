import { LayoutList, Navigation, Home, Receipt, Luggage, Compass } from 'lucide-react';

const capabilities = [
  { icon: LayoutList, title: 'Structured timeline', description: 'Every booking and stop organized by date and time.' },
  { icon: Navigation, title: 'Quick navigation', description: 'Tap to get directions to your next stop without searching.' },
  { icon: Home, title: 'Lodging details ready', description: 'Address, check-in time, and confirmation in one place.' },
  { icon: Receipt, title: 'Expense logging', description: 'Log what you spend while it\'s fresh — by trip, by category.' },
  { icon: Luggage, title: 'Packing guidance', description: 'Keep track of what to bring so nothing gets left behind.' },
  { icon: Compass, title: 'Explore nearby', description: 'Find restaurants and attractions near your trip destination.' },
];

export default function LandingSolution() {
  return (
    <section className="landing-howitworks-section">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            See your entire trip in one place.
          </h2>
          <p className="landing-section-subtext mt-3">
            Real Travel 2 Real Places gives you visibility into every part of your trip — structured, accessible, and ready when you need it.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {capabilities.map((item) => (
            <div key={item.title} className="landing-ps-solution-card">
              <div className="landing-feature-icon">
                <item.icon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="landing-feature-title">{item.title}</h3>
                <p className="landing-feature-description">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
