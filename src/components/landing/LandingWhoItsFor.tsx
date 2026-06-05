import { BriefcaseBusiness, Car, Repeat, Users } from 'lucide-react';

const personas = [
  { icon: BriefcaseBusiness, title: 'Business travelers', description: 'Keep bookings, expenses, receipts, transport, and daily movement decisions organized.' },
  { icon: Car, title: 'Road-trip travelers', description: 'Use Drive Cockpit, gas search, weather, road context, and next stops from one place.' },
  { icon: Users, title: 'Families and groups', description: 'Share trip details, divide expenses, and keep everyone aligned without text-thread chaos.' },
  { icon: Repeat, title: 'Frequent travelers', description: 'Manage trip after trip with a familiar command center for airports, lodging, transit, and spend.' },
];

export default function LandingWhoItsFor() {
  return (
    <section className="landing-whoitsfor-section">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Simple enough for weekends. Strong enough for business travel.
          </h2>
          <p className="landing-section-subtext mt-3">
            RealTravel is built for travelers who need the trip to stay usable after booking is done.
          </p>
        </div>

        <div className="landing-persona-row">
          {personas.map((p) => (
            <div key={p.title} className="landing-persona-card-v2">
              <div className="landing-persona-icon-v2">
                <p.icon className="w-5 h-5" />
              </div>
              <h3 className="landing-persona-title-v2">{p.title}</h3>
              <p className="landing-persona-desc-v2">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
