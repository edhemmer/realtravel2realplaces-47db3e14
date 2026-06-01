import { Sparkles, Compass, ListChecks, Route, WifiOff, Users } from 'lucide-react';

const capabilities = [
  { icon: Sparkles, title: 'Today', description: "What to do next and when to leave — one calm screen." },
  { icon: Compass, title: 'Move', description: 'Directive transport guidance with the two best options.' },
  { icon: ListChecks, title: 'Guide', description: 'The few alerts that actually matter, in priority order.' },
  { icon: Route, title: 'Flow', description: 'Your whole trip on one timeline — today, ahead, and behind.' },
  { icon: WifiOff, title: 'Works offline', description: 'Your trip stays usable on planes, trails, and dead zones.' },
  { icon: Users, title: 'Share with co-travelers', description: 'Invite anyone you travel with — view, expenses, lodging, stops.' },
];

export default function LandingSolution() {
  return (
    <section className="landing-howitworks-section">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Your trip, made calm.
          </h2>
          <p className="landing-section-subtext mt-3">
            Four pillars do the thinking for you — so every moment of your trip has a clear next step.
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
