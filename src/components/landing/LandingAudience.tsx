import { Users, Briefcase, Layers, Music, MapPin } from 'lucide-react';

const personas = [
  {
    icon: Users,
    title: 'Families managing shared trips',
  },
  {
    icon: Briefcase,
    title: 'Frequent travelers juggling overlapping plans',
  },
  {
    icon: Layers,
    title: 'Independent contractors and field professionals',
  },
  {
    icon: Music,
    title: 'Bands, crews, and touring teams',
  },
  {
    icon: MapPin,
    title: 'Anyone who lives part-time or full-time on the road',
  },
];

export default function LandingAudience() {
  return (
    <section className="landing-audience-section">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Built for people who actually travel
          </h2>
        </div>

        {/* Persona list */}
        <div className="landing-audience-grid">
          {personas.map((persona) => (
            <div key={persona.title} className="landing-audience-card">
              <div className="landing-audience-icon">
                <persona.icon className="w-5 h-5" />
              </div>
              <span className="landing-audience-title">{persona.title}</span>
            </div>
          ))}
        </div>

        {/* Support line */}
        <p className="landing-audience-support">
          If travel is part of your life — not just a vacation — this is for you.
        </p>
      </div>
    </section>
  );
}
