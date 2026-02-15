import { Link } from 'react-router-dom';

export default function LandingHeader() {
  return (
    <header className="landing-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 sm:h-20 flex items-center justify-between">
          {/* Brand wordmark — left on mobile, optically centered on desktop via spacer */}
          <Link to="/" className="landing-wordmark flex-shrink-0" aria-label="Real Travel 2 Real Places">
            Real Travel 2 Real Places
          </Link>

          {/* Right-side actions */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
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
