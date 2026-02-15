import { Briefcase, Route, Layers, Plane } from 'lucide-react';

const personas = [
  {
    icon: Briefcase,
    title: 'Business travelers',
    description: 'Expense tracking, itinerary clarity, and instant access to every confirmation.',
  },
  {
    icon: Route,
    title: 'Multi-stop road trips',
    description: 'Stop-by-stop timelines, gas tracking, and drive-day logistics in one view.',
  },
  {
    icon: Layers,
    title: 'Complex itineraries',
    description: 'Flights, stays, rentals, and activities — all connected to one trip timeline.',
  },
  {
    icon: Plane,
    title: 'Frequent flyers',
    description: 'TSA info, frequent flyer numbers, and departure reminders — always at hand.',
  },
];

export default function LandingWhoItsFor() {
  return (
    <section className="landing-whoitsfor-section">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Built for people who actually travel.
          </h2>
          <p className="landing-section-subtext mt-3">
            Whether you fly weekly or drive cross-country — one calm system replaces scattered notes.
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
