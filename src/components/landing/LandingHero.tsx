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
              <span>Travel Operations</span>
            </div>

            <h1 className="landing-hero-headline">
              Find clarity in
              <br />
              <span className="landing-hero-headline-accent">the travel chaos.</span>
            </h1>

            <p className="landing-hero-subtext">
              RealTravel2RealPlaces turns every moving part of the trip into a live travel operations layer: flights, lodging, Drive Cockpit, airport maps, local transit, weather, expenses, offline details, and the next clear move.
            </p>

            <div className="landing-hero-proof-row" aria-label="Product capabilities">
              <span>TravelOps dashboard</span>
              <span>Drive Cockpit</span>
              <span>Airport + transit windows</span>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 mt-6 sm:mt-8">
              <Link to="/auth?tab=signup" className="landing-btn-primary-hero">
                Start in Clarity
              </Link>
              <Link to="/auth" className="landing-btn-secondary-hero">
                Log In
              </Link>
            </div>
          </div>

          <div className="landing-hero-visual" aria-label="Travel operations command view">
            <div className="landing-hero-visual-frame">
              <ProductTripCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
