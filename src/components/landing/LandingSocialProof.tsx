import { Star, Quote } from 'lucide-react';

const stats = [
  { value: '2,400+', label: 'Trips managed' },
  { value: '98%', label: 'On-time departures' },
  { value: '4.9', label: 'User rating', icon: true },
  { value: '$0', label: 'Setup cost' },
];

const testimonials = [
  {
    quote: "I stopped missing check-in times. Everything I need is right there — no more digging through emails at the airport.",
    name: 'Sarah M.',
    role: 'Business Traveler',
    trips: '47 trips',
  },
  {
    quote: "We drove 6 states in 10 days. Every gas stop, every hotel check-in, every expense — tracked without a spreadsheet.",
    name: 'Jake & Emily R.',
    role: 'Road Trip Family',
    trips: '12 trips',
  },
  {
    quote: "TripIt never showed me when to leave. This app tells me exactly when to walk out the door. That's the difference.",
    name: 'Carlos D.',
    role: 'Frequent Flyer',
    trips: '83 trips',
  },
];

export default function LandingSocialProof() {
  return (
    <section className="landing-socialproof-section">
      <div className="max-w-6xl mx-auto">
        {/* Stats Bar */}
        <div className="landing-stats-bar">
          {stats.map((stat) => (
            <div key={stat.label} className="landing-stat-item">
              <div className="landing-stat-value">
                {stat.icon && <Star className="w-4 h-4 text-[hsl(35_100%_60%)] inline mr-1" />}
                {stat.value}
              </div>
              <div className="landing-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="text-center mb-10 mt-16">
          <h2 className="landing-section-headline">
            Trusted by travelers who don't wing it.
          </h2>
          <p className="landing-section-subtext mt-3">
            Real people. Real trips. Real clarity.
          </p>
        </div>

        <div className="landing-testimonial-grid">
          {testimonials.map((t) => (
            <div key={t.name} className="landing-testimonial-card">
              <Quote className="w-5 h-5 text-[hsl(var(--landing-accent)/0.3)] mb-3 flex-shrink-0" />
              <p className="landing-testimonial-quote">{t.quote}</p>
              <div className="landing-testimonial-author">
                <div className="landing-testimonial-avatar">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="landing-testimonial-name">{t.name}</p>
                  <p className="landing-testimonial-role">{t.role} · {t.trips}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
