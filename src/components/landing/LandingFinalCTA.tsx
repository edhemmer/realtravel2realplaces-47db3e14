import { Link } from 'react-router-dom';

export default function LandingFinalCTA() {
  return (
    <section className="landing-pricing-section">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="landing-section-headline">
          Step out of the chaos.
        </h2>
        <p className="landing-section-subtext mt-3">
          Bring every trip into clarity with a travel operations command center built for daily use.
        </p>

        <div className="flex items-center justify-center gap-3 sm:gap-4 mt-8">
          <Link
            to="/auth?tab=signup"
            className="landing-btn-primary-hero"
          >
            Start in Clarity
          </Link>
          <Link
            to="/auth"
            className="landing-btn-secondary-hero"
          >
            Log In
          </Link>
        </div>
      </div>
    </section>
  );
}
