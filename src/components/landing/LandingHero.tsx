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
              A better way to manage
              <br />
              <span className="text-[hsl(var(--landing-accent))]">the Travel chaos.</span>
            </h1>

            <p className="landing-hero-subtext">
              A calm command center for your trip. See what's next, when to leave, and how to get there — flights, stays, drives, expenses, and packing in one place. Works offline.
            </p>

            {/* CTAs */}
            <div className="flex items-center gap-3 sm:gap-4 mt-6 sm:mt-8">
              <Link
                to="/auth?tab=signup"
                className="landing-btn-primary-hero">

                Start a Trip
              </Link>
              <Link
                to="/auth"
                className="landing-btn-secondary-hero">

                Log In
              </Link>
            </div>
          </div>

          {/* Right — Product preview */}
          <div className="landing-hero-visual" aria-label="Product preview">
            <div className="landing-hero-visual-frame">
              <MockTripCard />
            </div>
          </div>
        </div>
      </div>
    </section>);

}