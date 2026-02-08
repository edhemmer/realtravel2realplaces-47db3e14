import { Users, Briefcase, Layers, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

const scenarios = [
  {
    icon: Users,
    title: 'Traveling with family',
    description: "Keep everyone's flights, stays, and expenses in one place without the chaos of group chats.",
  },
  {
    icon: Briefcase,
    title: 'Living on the road for work',
    description: 'Track receipts and manage overlapping bookings without losing your mind or your data.',
  },
  {
    icon: Layers,
    title: 'Managing overlapping trips',
    description: "See what's coming up across multiple trips so nothing falls through the cracks.",
  },
  {
    icon: Globe,
    title: 'Touring across cities and countries',
    description: 'Add confirmations as you go and keep your entire journey organized in one view.',
  },
];

export default function LandingWhoItsFor() {
  return (
    <section className="landing-who-section">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="landing-section-headline">
            Built for how you actually travel
          </h2>
          <p className="landing-section-subtext">
            Whether you are coordinating family trips or managing back-to-back business travel, this app keeps you in control.
          </p>
        </div>

        {/* Scenario Cards */}
        <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {scenarios.map((scenario) => (
            <div key={scenario.title} className="landing-scenario-card">
              <div className="landing-scenario-icon">
                <scenario.icon className="w-6 h-6" />
              </div>
              <h3 className="landing-scenario-title">{scenario.title}</h3>
              <p className="landing-scenario-description">{scenario.description}</p>
            </div>
          ))}
        </div>

        {/* CTA after who section */}
        <div className="text-center mt-16">
          <Link 
            to="/auth?tab=signup" 
            className="landing-btn-primary-hero"
          >
            Get started (Free)
          </Link>
        </div>
      </div>
    </section>
  );
}
