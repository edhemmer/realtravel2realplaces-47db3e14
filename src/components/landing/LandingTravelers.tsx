import { Briefcase, Route, Layers, Plane } from 'lucide-react';

const personas = [
  {
    icon: Briefcase,
    title: 'Business travelers',
    description: 'Expense tracking, itinerary clarity, and instant access to every confirmation.',
  },
  {
    icon: Route,
    title: 'Multi-stop road travel',
    description: 'Stop-by-stop timelines, gas tracking, and drive-day logistics in one view.',
  },
  {
    icon: Layers,
    title: 'Layered itineraries',
    description: 'Flights, stays, rentals, and activities — all connected to one trip timeline.',
  },
  {
    icon: Plane,
    title: 'Frequent flyers',
    description: 'TSA info, frequent flyer numbers, and departure reminders — always at hand.',
  },
];

export default function LandingTravelers() {
  return (
    <section className="landing-features-section">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Built for frequent travelers.
          </h2>
          <p className="landing-section-subtext mt-3">
            Whether you fly weekly or drive cross-country, Real Travel 2 Real Places keeps every detail organized and accessible.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {personas.map((persona) => (
            <div key={persona.title} className="landing-feature-card">
              <div className="landing-feature-icon">
                <persona.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="landing-feature-title">{persona.title}</h3>
                <p className="landing-feature-description">{persona.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
