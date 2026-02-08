import { Users, Briefcase, Layers, Music } from 'lucide-react';

const personas = [
  {
    icon: Users,
    title: 'Families & personal travel',
    description: 'Keep everyone aligned on flights, stays, packing, and costs without juggling texts and emails.',
  },
  {
    icon: Briefcase,
    title: 'Frequent travelers',
    description: 'Manage overlapping trips, confirmations, and expenses without rebuilding everything every time.',
  },
  {
    icon: Layers,
    title: 'Independent contractors & field professionals',
    description: 'Track travel days, locations, stops, and costs while working on the road.',
  },
  {
    icon: Music,
    title: 'Bands, crews, and touring professionals',
    description: 'Keep routes, venues, lodging, and daily movement attached to the trip — not scattered across tools.',
  },
];

export default function LandingAudience() {
  return (
    <section className="landing-audience-section">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="landing-section-headline">
            Built for real trips, real people
          </h2>
          <p className="landing-section-subtext">
            Real Travel 2 Real Places is designed for how people actually travel — not how travel apps imagine it.
          </p>
        </div>

        {/* Persona Cards */}
        <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {personas.map((persona) => (
            <div key={persona.title} className="landing-persona-card">
              <div className="landing-persona-icon">
                <persona.icon className="w-6 h-6" />
              </div>
              <h3 className="landing-persona-title">{persona.title}</h3>
              <p className="landing-persona-description">{persona.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
