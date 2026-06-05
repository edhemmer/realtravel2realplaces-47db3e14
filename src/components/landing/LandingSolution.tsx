import { Building2, Car, LayoutDashboard, ListChecks, Route, WifiOff } from 'lucide-react';

const capabilities = [
  { icon: LayoutDashboard, title: 'TravelOps', description: 'A management dashboard for the live trip: maps, movement, airports, spend, weather, and readiness.' },
  { icon: ListChecks, title: 'Today', description: 'The next action, next deadline, and next place to be - one calm screen.' },
  { icon: Car, title: 'Drive Cockpit', description: 'Road-trip mode with navigation, gas, weather, road conditions, offline state, and CarPlay-ready stops.' },
  { icon: Building2, title: 'Airport windows', description: 'Terminal maps, parking links, airport context, and flight details without digging through tabs.' },
  { icon: Route, title: 'Transit and flow', description: 'Local transit windows, movement decisions, and the full trip timeline connected together.' },
  { icon: WifiOff, title: 'Offline ready', description: 'Key trip details and expense capture stay useful when signal gets weak or disappears.' },
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
            RealTravel turns the messy travel day into operational windows you can actually use while moving.
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
