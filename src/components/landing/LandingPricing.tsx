import { Link } from 'react-router-dom';

export default function LandingPricing() {
  return (
    <section className="landing-pricing-section">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="landing-section-headline">
            Start free. Grow when your travel grows.
          </h2>
          <p className="landing-section-subtext">
            Begin with Free. Upgrade to Pro or Business only when your travel demand increases.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="text-center">
          <Link to="/auth?tab=signup" className="landing-btn-primary-hero">
            Get started (Free)
          </Link>
        </div>
      </div>
    </section>
  );
}