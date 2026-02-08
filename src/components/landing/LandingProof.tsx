import { Link } from 'react-router-dom';
import MockTripCard from './MockTripCard';

export default function LandingProof() {
  return (
    <section className="landing-proof-section">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="landing-section-headline">
            This isn't a mockup
          </h2>
          <p className="landing-section-subtext">
            This is the actual app. Real trips, real confirmations, real control.
          </p>
        </div>

        {/* Large framed screenshot showcase */}
        <div className="landing-proof-showcase">
          {/* Browser frame wrapper */}
          <div className="landing-browser-frame">
            <div className="landing-browser-bar">
              <div className="landing-browser-dots">
                <span /><span /><span />
              </div>
              <div className="landing-browser-url">
                realtravel2realplaces.lovable.app
              </div>
            </div>
            <div className="landing-browser-content">
              <MockTripCard />
            </div>
          </div>
          
          {/* Caption */}
          <p className="landing-proof-caption">
            Your trip dashboard — flights, stays, expenses, and packing in one view
          </p>
        </div>

        {/* CTA after proof */}
        <div className="text-center mt-16">
          <Link 
            to="/auth?tab=signup" 
            className="landing-btn-primary-hero"
          >
            Start managing your trips
          </Link>
        </div>
      </div>
    </section>
  );
}
