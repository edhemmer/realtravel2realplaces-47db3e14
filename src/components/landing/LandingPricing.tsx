import { Link } from 'react-router-dom';

export default function LandingPricing() {
  return (
    <section className="landing-pricing-section">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="landing-section-headline">
          Start with a real trip.
        </h2>
        <p className="landing-section-subtext mt-4">
          The Free plan includes up to 2 lifetime trips so you can use RT2RP with your own travel details before deciding whether it belongs in your travel routine.
        </p>

        <div className="mt-6">
          <Link to="/auth?tab=signup" className="landing-btn-primary-hero">
            Start Free
          </Link>
        </div>

        <p className="landing-trust-line">
          No credit card required - Free plan includes 2 trips
        </p>
      </div>
    </section>
  );
}
