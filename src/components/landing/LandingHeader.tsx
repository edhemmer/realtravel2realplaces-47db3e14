import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import rt2rpLogo from '@/assets/rt2rp-logo.png';

export default function LandingHeader() {
  const { user } = useAuth();

  return (
    <header className="landing-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 sm:h-16 lg:h-20 flex items-center justify-between gap-4">
          {/* Brand logo */}
          <Link to="/" className="flex-shrink-0 hover:opacity-85 transition-opacity" aria-label="Real Travel 2 Real Places">
            <img src={rt2rpLogo} alt="Real Travel 2 Real Places" className="rt2rp-header-logo--landing" />
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
