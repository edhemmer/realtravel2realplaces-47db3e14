import { Link } from 'react-router-dom';

export default function LandingFinalCTA() {
  return (
    <section className="landing-pricing-section">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="landing-section-headline">
          Travel doesn't slow down.
        </h2>
        <p className="landing-section-subtext mt-3">
          Having your trip details in one place can make it easier to keep up.
        </p>

        <div className="flex items-center justify-center gap-3 sm:gap-4 mt-8">
          <Link
            to="/auth?tab=signup"
            className="landing-btn-primary-hero"
          >
            Start a Trip
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
