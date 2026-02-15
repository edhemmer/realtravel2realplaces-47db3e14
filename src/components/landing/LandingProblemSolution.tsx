import { Plane, Hotel, Car, Clock, CloudRain, Zap, MapPin, Bell } from 'lucide-react';

const painPoints = [
  { icon: Plane, text: 'Flight times shift — and you find out late' },
  { icon: Hotel, text: 'Check-in details buried in confirmation emails' },
  { icon: Car, text: 'Rental pickup instructions scattered across apps' },
  { icon: Clock, text: 'Leave-by timing that requires guesswork' },
  { icon: CloudRain, text: 'Weather and traffic changes you didn\'t plan for' },
];

const solutions = [
  {
    icon: Zap,
    title: 'What\'s next',
    description: 'Your upcoming flight, check-in, or stop — surfaced instantly without searching.',
  },
  {
    icon: Clock,
    title: 'When to leave',
    description: 'Leave-by timing based on your schedule and estimated travel duration.',
  },
  {
    icon: MapPin,
    title: 'Where to go',
    description: 'Navigation-ready addresses and directions for stops, hotels, and terminals.',
  },
  {
    icon: Bell,
    title: 'What needs attention',
    description: 'Configurable reminders for check-ins, departures, parking, and deadlines.',
  },
];

export default function LandingProblemSolution() {
  return (
    <section id="how-it-works" className="landing-problemsolution-section">
      <div className="max-w-6xl mx-auto">
        {/* Pain — left column on desktop */}
        <div className="landing-ps-grid">
          <div className="landing-ps-pain">
            <h2 className="landing-section-headline">
              Travel shouldn't require<br className="hidden sm:block" /> constant checking.
            </h2>
            <p className="landing-section-subtext mt-3 mb-6" style={{ margin: '0.75rem 0 1.5rem' }}>
              The friction isn't in the planning. It's in the doing.
            </p>
            <div className="landing-ps-pain-list">
              {painPoints.map((point) => (
                <div key={point.text} className="landing-ps-pain-item">
                  <point.icon className="w-4 h-4 text-[hsl(0_60%_65%)] flex-shrink-0" />
                  <span>{point.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Solution — right column on desktop */}
          <div className="landing-ps-solution">
            <p className="landing-ps-solution-label">Real Travel 2 Real Places gives you:</p>
            <div className="landing-ps-solution-grid">
              {solutions.map((s) => (
                <div key={s.title} className="landing-ps-solution-card">
                  <div className="landing-feature-icon">
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="landing-feature-title">{s.title}</h3>
                    <p className="landing-feature-description">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
