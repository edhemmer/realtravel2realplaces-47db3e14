import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingHeader() {
  const { user } = useAuth();

  return (
    <header className="landing-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 sm:h-16 lg:h-20 flex items-center justify-between gap-4">
          {/* Brand wordmark */}
          <Link
            to="/"
            className="flex-shrink-0 hover:opacity-85 transition-opacity flex items-center gap-2 sm:gap-3"
            aria-label="InLight AI — RealTravel 2 RealPlaces"
          >
            <img
              src="/app-icon-1024.png"
              alt=""
              aria-hidden="true"
              className="h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 flex-shrink-0"
            />
            <span className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2 leading-tight">
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.16em] text-white/60">
                InLight AI
                <span className="hidden sm:inline mx-1.5 opacity-60">—</span>
              </span>
              <span className="text-base sm:text-lg lg:text-xl font-semibold tracking-tight text-white">
                RealTravel <span className="italic font-normal opacity-90">2</span> RealPlaces
              </span>
            </span>
          </Link>

          {/* Right-side actions */}
          <div className="flex items-center gap-4 sm:gap-5 flex-shrink-0">
            {user ? (
              <Link 
                to="/dashboard" 
                className="landing-btn-header"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  to="/auth" 
                  className="landing-login-link"
                >
                  Log In
                </Link>
                <Link 
                  to="/auth?tab=signup" 
                  className="landing-btn-header"
                >
                  Start a Trip
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
