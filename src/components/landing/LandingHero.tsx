import { Link } from 'react-router-dom';
import ProductTripCard from './ProductTripCard';

export default function LandingHero() {
  return (
    <section className="landing-hero-section">
      <div className="max-w-6xl mx-auto">
        <div className="landing-hero-split">
          <div className="landing-hero-copy">
            <div className="landing-hero-kicker">
              <span>Chaos to Clarity</span>
              <span className="landing-hero-kicker-dot" />
              <span>Trip Management</span>
            </div>

            <h1 className="landing-hero-headline">
              Find clarity in
              <br />
              <span className="landing-hero-headline-accent">the travel chaos.</span>
            </h1>

            <p className="landing-hero-subtext">
              RealTravel2RealPlaces gives the trip one organized home for saved reservations, timeline details, driving context, airport links when available, weather context, expenses, and trip records.
            </p>

            <div className="landing-hero-proof-row" aria-label="Product capabilities">
              <span>Saved trip records</span>
              <span>Driving Mode</span>
              <span>Timeline + expenses</span>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 mt-6 sm:mt-8">
              <Link to="/auth?tab=signup" className="landing-btn-primary-hero">
                Create Your Trip Hub
              </Link>
              <Link to="/auth" className="landing-btn-secondary-hero">
                Log In
              </Link>
            </div>
          </div>

          <div className="landing-hero-visual" aria-label="Trip management view">
            <div className="landing-hero-visual-frame">
              <ProductTripCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
