import { Link } from 'react-router-dom';

export default function LandingPricing() {
  return (
    <section className="landing-pricing-section">
      <div className="max-w-3xl mx-auto text-center">
        {/* Headline */}
        <h2 className="landing-section-headline">
          Start free. Stop managing travel the hard way.
        </h2>

        {/* Primary CTA */}
        <div className="mt-8">
          <Link to="/auth?tab=signup" className="landing-btn-primary-hero">
            Get started free
          </Link>
        </div>
      </div>
    </section>
  );
}
