import { Plane, Hotel, Car, Clock, CloudRain } from 'lucide-react';

const stressors = [
  {
    icon: Plane,
    text: 'Flight times shift — and you find out late',
  },
  {
    icon: Hotel,
    text: 'Check-in details buried in a confirmation email',
  },
  {
    icon: Car,
    text: 'Rental car pickup instructions scattered across apps',
  },
  {
    icon: Clock,
    text: 'Leave-by timing that requires guesswork',
  },
  {
    icon: CloudRain,
    text: 'Weather and traffic changes you didn\u0027t plan for',
  },
];

export default function LandingProblem() {
  return (
    <section id="how-it-works" className="landing-problem-section">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Travel shouldn't require constant checking.
          </h2>
          <p className="landing-section-subtext mt-3">
            Between flights, stays, rental cars, traffic, timing, and weather — travel execution is stressful.
            The friction isn't in the planning. It's in the doing.
          </p>
        </div>

        <div className="landing-pain-list">
          {stressors.map((point) => (
            <div key={point.text} className="landing-pain-item">
              <div className="landing-pain-icon">
                <point.icon className="w-5 h-5" />
              </div>
              <p className="landing-pain-text">{point.text}</p>
            </div>
          ))}
        </div>

        <p className="landing-problem-transition">
          Real Travel 2 Real Places removes that friction — automatically.
        </p>
      </div>
    </section>
  );
}
