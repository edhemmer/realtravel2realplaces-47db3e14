import { Route, Users, Repeat, Layers } from 'lucide-react';

const personas = [
  { icon: Route, title: 'Multi-stop travelers', description: 'Keep every leg of a complex itinerary organized in one timeline.' },
  { icon: Users, title: 'Family travel', description: 'Share trip details and track expenses across the group.' },
  { icon: Repeat, title: 'Repeat travelers', description: 'Manage trip after trip without starting from scratch.' },
  { icon: Layers, title: 'People who prefer structure', description: 'If scattered notes and browser tabs stress you out — this is for you.' },
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
            Not everyone needs a travel dashboard. But if you do, this one is designed around how travel actually works.
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
