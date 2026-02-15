import { Link } from 'react-router-dom';
import MockTripCard from './MockTripCard';

export default function LandingHero() {
  return (
    <section className="landing-hero-section">
      <div className="max-w-6xl mx-auto">
        <div className="landing-hero-split">
          {/* Left — Messaging */}
          <div className="landing-hero-copy">
            <h1 className="landing-hero-headline">
              Know exactly where to be
              <br />
              <span className="landing-hero-headline-accent">and when.</span>
            </h1>

            <p className="landing-hero-subtext">
              A real-time travel command center that shows what's next, when to leave, and where to go — without digging through emails.
            </p>

            {/* CTAs — inline on all viewports */}
            <div className="flex items-center gap-3 sm:gap-4 mt-6 sm:mt-8">
              <Link
                to="/auth?tab=signup"
                className="landing-btn-primary-hero"
              >
                Start Free
              </Link>
              <a
                href="#how-it-works"
                className="landing-btn-secondary-hero"
              >
                See How It Works
              </a>
            </div>

            <p className="landing-trust-line">
              No credit card · Free forever
            </p>
          </div>

          {/* Right — Product preview */}
          <div className="landing-hero-visual" aria-label="Product preview">
            <div className="landing-hero-visual-frame">
              <MockTripCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
