import { Link } from 'react-router-dom';
import logoImg from '@/assets/logo-white.png';

export default function LandingHero() {
  return (
    <section className="landing-hero-section">
      <div className="max-w-4xl mx-auto text-center">
        {/* Brand logo — primary brand moment */}
        <img
          src={logoImg}
          alt="Real Travel 2 Real Places — real-time travel command center"
          className="landing-hero-logo mx-auto mb-8"
        />

        {/* H1 - Single instance */}
        <h1 className="landing-hero-headline">
          Know exactly where to be
          <br />
          <span className="landing-hero-headline-accent">and when.</span>
        </h1>

        {/* Subheadline */}
        <p className="landing-hero-subtext">
          Real Travel 2 Real Places is your real-time travel command center.
          It shows what's next, when to leave, and where to go — without digging through emails or switching apps.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
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

        {/* Trust line */}
        <p className="landing-trust-line">
          No credit card required · Your data stays yours
        </p>
      </div>
    </section>
  );
}
