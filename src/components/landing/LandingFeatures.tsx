import { Zap, Clock, MapPin, Bell } from 'lucide-react';

const pillars = [
  {
    icon: Zap,
    title: 'What\'s next',
    description: 'Your upcoming flight, check-in, or stop — surfaced instantly without searching.',
  },
  {
    icon: Clock,
    title: 'When to leave',
    description: 'Leave-by timing that accounts for real conditions so you arrive on time, every time.',
  },
  {
    icon: MapPin,
    title: 'Where to go',
    description: 'Navigation-ready addresses and directions for every stop, hotel, and terminal.',
  },
  {
    icon: Bell,
    title: 'What needs attention',
    description: 'Smart reminders for check-ins, departures, parking, and anything you can\'t afford to miss.',
  },
];

export default function LandingFeatures() {
  return (
    <section className="landing-features-section">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Stop organizing. Start executing.
          </h2>
          <p className="landing-section-subtext mt-3">
            Real Travel 2 Real Places is an execution layer — not a scrapbook or itinerary organizer.
            It tells you exactly what matters right now.
          </p>
        </div>

        <div className="landing-features-grid">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="landing-feature-card">
              <div className="landing-feature-icon">
                <pillar.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="landing-feature-title">{pillar.title}</h3>
                <p className="landing-feature-description">{pillar.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
