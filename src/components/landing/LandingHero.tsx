import { Link } from 'react-router-dom';
import MockTripCard from './MockTripCard';

export default function LandingHero() {
  return (
    <section className="landing-hero-section">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left: Text Content */}
          <div className="text-center lg:text-left">
            {/* H1 - Made visually dominant */}
            <h1 className="landing-hero-headline">
              We don't plan your trip.
              <br />
              <span className="landing-hero-headline-accent">We manage it.</span>
            </h1>

            {/* Single short supporting paragraph */}
            <p className="landing-hero-subtext">
              Add your real travel confirmations and manage flights, stays, expenses, packing, stops, and reminders — before, during, and after your trip.
            </p>

            {/* Supporting line - who it's for */}
            <p className="landing-hero-audience">
              Built for families, frequent travelers, independent contractors, bands, and anyone who actually lives on the road.
            </p>

            {/* CTAs - Clear hierarchy */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link 
                to="/auth?tab=signup" 
                className="landing-btn-primary-hero"
              >
                Get started (Free)
              </Link>
              <Link 
                to="/auth" 
                className="landing-btn-secondary-hero"
              >
                Log in
              </Link>
            </div>

            {/* Trust text - minimal */}
            <p className="landing-trust-line">
              No credit card required · Your data stays yours
            </p>
          </div>

          {/* Right: Product Mockup */}
          <div className="relative hidden lg:block">
            {/* Subtle glow effect */}
            <div className="absolute -inset-12 bg-[radial-gradient(ellipse_at_center,hsl(var(--landing-accent)/0.1)_0%,transparent_60%)] blur-3xl" />
            <MockTripCard />
          </div>
        </div>
      </div>
    </section>
  );
}