import { Plane, Home, Car, TrainFront, Building2, Receipt } from 'lucide-react';

const parts = [
  { icon: Plane, title: 'Flights', description: 'Saved departure times, airport codes, confirmations, and flight records in the trip timeline.' },
  { icon: Building2, title: 'Airport maps', description: 'Terminal maps, parking pages, and airport links when the required airport information is available.' },
  { icon: Home, title: 'Lodging', description: 'Addresses, check-in details, saved links, and stay costs connected to the trip.' },
  { icon: Car, title: 'Driving Mode', description: 'Navigation handoff, gas search, weather context, and saved road-trip stops.' },
  { icon: TrainFront, title: 'Local transit', description: 'Transit context and route handoffs when the required location and provider data are available.' },
  { icon: Receipt, title: 'Expenses', description: 'Trip expense capture, categories, totals, and queued offline capture with sync after reconnection.' },
];

export default function LandingMovingParts() {
  return (
    <section className="landing-features-section landing-problemsolution-section">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">The trip records that move with you.</h2>
          <p className="landing-section-subtext mt-3">
            Keep supported travel details connected instead of spread across separate notes and records.
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
