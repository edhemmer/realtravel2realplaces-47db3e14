import { Link } from 'react-router-dom';

export default function LandingHeader() {
  return (
    <header className="landing-header-blur fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand */}
          <Link to="/" className="flex flex-col">
            <span className="text-base sm:text-lg font-semibold text-white tracking-tight">
              Real Travel <span className="italic">to Real Places</span>
            </span>
            <span className="text-[10px] sm:text-xs text-[hsl(var(--landing-text-muted))] -mt-0.5">
              For travelers who actually go.
            </span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/auth"
              className="text-sm sm:text-base font-medium text-[hsl(var(--landing-text))] hover:text-[hsl(var(--landing-accent))] transition-colors px-2 py-2"
            >
              Log in
            </Link>
            <Link
              to="/auth"
              className="landing-btn-primary text-sm px-3 py-2 sm:px-6 sm:py-2.5"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
