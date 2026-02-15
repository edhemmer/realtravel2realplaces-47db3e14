import { Star, Quote } from 'lucide-react';

const stats = [
  { value: 'Free', label: 'To get started' },
  { value: '3', label: 'Trips on free plan' },
  { value: '∞', label: 'Trips on Pro' },
  { value: '$0', label: 'Setup cost' },
];

const testimonials = [
  {
    quote: "I stopped missing check-in times. Everything I need is right there — no more digging through emails at the airport.",
    name: 'Sarah M.',
    role: 'Business Traveler',
  },
  {
    quote: "We drove 6 states in 10 days. Every gas stop, every hotel check-in, every expense — tracked without a spreadsheet.",
    name: 'Jake & Emily R.',
    role: 'Road Trip Family',
  },
  {
    quote: "Most apps help you plan. This one actually tells me when to walk out the door. That's the difference.",
    name: 'Carlos D.',
    role: 'Frequent Flyer',
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
                {stat.value}
              </div>
              <div className="landing-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="text-center mb-10 mt-16">
          <h2 className="landing-section-headline">
            What travelers are saying.
          </h2>
          <p className="landing-section-subtext mt-3">
            Early feedback from real users.
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
                  <p className="landing-testimonial-role">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
