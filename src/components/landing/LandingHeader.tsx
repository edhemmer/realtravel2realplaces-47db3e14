import { Link } from 'react-router-dom';
import logoWhiteImg from '@/assets/logo-white.png';

export default function LandingHeader() {
  return (
    <header className="landing-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand */}
          <Link to="/" className="flex items-center">
            <img
              src={logoWhiteImg}
              alt="Real Travel 2 Real Places"
              className="rt2rp-landing-logo flex-shrink-0"
            />
          </Link>

          {/* Actions - Sticky header CTA (small, unobtrusive) */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link 
              to="/auth" 
              className="text-sm text-[hsl(var(--landing-text-muted))] hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link 
              to="/auth?tab=signup" 
              className="landing-btn-header"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
