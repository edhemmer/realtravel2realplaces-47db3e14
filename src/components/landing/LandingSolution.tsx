import { Building2, Car, LayoutDashboard, ListChecks, Route, WifiOff } from 'lucide-react';

const capabilities = [
  { icon: LayoutDashboard, title: 'Trip home', description: 'One place for saved itinerary details, maps, movement records, airports, spend, and weather context.' },
  { icon: ListChecks, title: 'Timeline', description: 'See saved bookings and trip events in trip order on one screen.' },
  { icon: Car, title: 'Drive mode', description: 'Road-trip mode with navigation handoff, gas search, weather context, saved stops, and trip details.' },
  { icon: Building2, title: 'Airport context', description: 'Saved flight details plus airport map and parking links when the required information is available.' },
  { icon: Route, title: 'Itinerary and transit', description: 'Trip timeline and local transit context when the required location and provider data are available.' },
  { icon: WifiOff, title: 'Offline continuity', description: 'Previously loaded upcoming timeline details can remain available, and new expenses can queue for sync after reconnection.' },
];

export default function LandingSolution() {
  return (
    <section className="landing-howitworks-section">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Built for travel management, not just planning.
          </h2>
          <p className="landing-section-subtext mt-3">
            RealTravel keeps the trip details you have saved connected in one place while you travel.
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
