import { Plane, Home, Car, TrainFront, Building2, Receipt } from 'lucide-react';

const parts = [
  { icon: Plane, title: 'Flights', description: 'Departure times, airport codes, confirmations, and flight-day context in one travel timeline.' },
  { icon: Building2, title: 'Airport maps', description: 'Official terminal maps, parking pages, and airport links where travelers need them.' },
  { icon: Home, title: 'Lodging', description: 'Addresses, check-in details, saved links, and stay costs connected to the trip.' },
  { icon: Car, title: 'Drive Cockpit', description: 'Navigation, gas, weather, road conditions, next stops, and CarPlay-ready trip context.' },
  { icon: TrainFront, title: 'Local transit', description: 'Transit map windows and route handoffs for getting around without expensive API waste.' },
  { icon: Receipt, title: 'Expenses', description: 'Offline-first expense capture, categories, totals, and business or personal trip records.' },
];

export default function LandingMovingParts() {
  return (
    <section className="landing-features-section landing-problemsolution-section">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Every travel window in one command center.
          </h2>
          <p className="landing-section-subtext mt-3">
            From simple weekends to complex business travel, the app keeps the operational pieces connected.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {parts.map((part) => (
            <div key={part.title} className="landing-persona-card-v2">
              <div className="landing-persona-icon-v2">
                <part.icon className="w-5 h-5" />
              </div>
              <h3 className="landing-persona-title-v2">{part.title}</h3>
              <p className="landing-persona-desc-v2">{part.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
