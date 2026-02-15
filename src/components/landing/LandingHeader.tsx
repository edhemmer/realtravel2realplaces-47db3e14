import { Link } from 'react-router-dom';

export default function LandingHeader() {
  return (
    <header className="landing-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 sm:h-16 lg:h-20 flex items-center justify-between gap-4">
          {/* Brand wordmark */}
          <Link to="/" className="landing-wordmark text-[0.85rem] sm:text-base lg:text-lg" aria-label="Real Travel 2 Real Places">
            Real Travel 2 Real Places
          </Link>

          {/* Right-side actions */}
          <div className="flex items-center gap-4 sm:gap-5 flex-shrink-0">
            <Link 
              to="/auth" 
              className="landing-login-link"
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
