import { Link } from 'react-router-dom';

export default function LandingPricing() {
  return (
    <section className="landing-pricing-section">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="landing-section-headline">
          Travel without uncertainty.
        </h2>
        <p className="landing-section-subtext mt-4">
          Confidence comes from knowing — not guessing.
          Real Travel 2 Real Places gives you clarity before, during, and after every trip.
        </p>

        <p className="mt-8 text-lg font-semibold text-[hsl(var(--landing-text))]">
          Stay ahead of your trip.
        </p>

        <div className="mt-6">
          <Link to="/auth?tab=signup" className="landing-btn-primary-hero">
            Start Free
          </Link>
        </div>

        <p className="landing-trust-line">
          No credit card required · Free plan with core features, forever
        </p>
      </div>
    </section>
  );
}
