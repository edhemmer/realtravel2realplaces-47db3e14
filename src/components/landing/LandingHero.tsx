import { ArrowDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import MockTripCard from './MockTripCard';
export default function LandingHero() {
  const scrollToFeatures = () => {
    const element = document.getElementById('features');
    element?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  return <section className="landing-section pt-28 sm:pt-32 lg:pt-40 pb-16 lg:pb-24">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text Content */}
          <div className="text-center lg:text-left">
            {/* Pill */}
            <div className="landing-pill mb-6 inline-flex">
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--landing-accent))] animate-pulse" />
              Travel, managed automatically
            </div>

            {/* H1 */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight mb-4">
              We don't plan your trip.{' '}
              <br className="hidden sm:block" />
              We <span className="landing-gradient-text text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold">manage it.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl lg:text-2xl font-medium text-white/90 mb-4">
              You're always in control.
            </p>

            {/* Supporting text */}
            <p className="text-base sm:text-lg text-[hsl(var(--landing-text-muted))] max-w-lg mx-auto lg:mx-0 leading-relaxed mb-3">Add your travel confirmations, and we'll take it from there. We help organize and manage flights, stays, expenses, and packing in one calm, reliable view.</p>

            {/* SaaS framing line */}
            <p className="text-sm sm:text-base text-[hsl(var(--landing-text-muted))] max-w-lg mx-auto lg:mx-0 mb-8 opacity-80">Built to help you stay in control of your trip.</p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-6">
              <Link to="/auth" className="landing-btn-primary text-base px-8 py-3 text-center">
                Get started
              </Link>
              <Link to="/auth" className="landing-btn-secondary text-base px-8 py-3 text-center">
                Log in
              </Link>
            </div>

            {/* How it works */}
            <button onClick={scrollToFeatures} className="text-sm text-[hsl(var(--landing-text-muted))] hover:text-[hsl(var(--landing-accent))] transition-colors inline-flex items-center gap-1.5 mb-6">
              How it works
              <ArrowDown className="w-3.5 h-3.5" />
            </button>

            {/* Trust text */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center lg:justify-start text-sm text-[hsl(var(--landing-text-muted))]">
              <span>Free limited use.</span>
              <span className="hidden sm:block">•</span>
              <span>No ads   •    Your data stays yours.</span>
            </div>
          </div>

          {/* Right: Product Mockup */}
          <div className="relative">
            {/* Glow effect behind card */}
            <div className="absolute -inset-8 bg-[radial-gradient(ellipse_at_center,hsl(var(--landing-accent)/0.15)_0%,transparent_70%)] blur-2xl" />
            <MockTripCard />
          </div>
        </div>
      </div>
    </section>;
}