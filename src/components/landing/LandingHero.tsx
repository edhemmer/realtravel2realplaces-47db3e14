import { Link } from 'react-router-dom';
import logoImg from '@/assets/logo-white.png';

export default function LandingHero() {
  return (
    <section className="landing-hero-section">
      <div className="max-w-4xl mx-auto text-center">
        {/* Brand logo — primary brand moment */}
        <div className="flex justify-center mb-10 mt-2">
          <img
            src={logoImg}
            alt="Real Travel 2 Real Places"
            className="landing-hero-logo"
          />
        </div>

        {/* H1 - Primary headline */}
        <h1 className="landing-hero-headline">
          We don't plan your trip.
          <br />
          <span className="landing-hero-headline-accent">We manage everything after it's booked.</span>
        </h1>

        {/* Subheadline */}
        <p className="landing-hero-subtext">
          Real Travel 2 Real Places keeps all your travel details in one place — flights, stays, stops, expenses, and reminders — so nothing gets missed and you stop managing travel by memory.
        </p>

        {/* Support copy - the problem */}
        <p className="landing-hero-support">
          Most people end up tracking trips with emails, screenshots, spreadsheets, and notes.
          <br className="hidden sm:block" />
          That breaks the moment plans change. We replace that with one reliable system.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link 
            to="/auth?tab=signup" 
            className="landing-btn-primary-hero"
          >
            Get started free
          </Link>
          <Link 
            to="/auth" 
            className="landing-btn-secondary-hero"
          >
            Log in
          </Link>
        </div>

        {/* Trust line */}
        <p className="landing-trust-line">
          No credit card required · Your data stays yours
        </p>
      </div>
    </section>
  );
}
