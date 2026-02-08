import { Link } from 'react-router-dom';

export default function LandingHeader() {
  return (
    <header className="landing-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand */}
          <Link to="/" className="flex flex-col">
            <span className="text-base sm:text-lg font-semibold text-white tracking-tight">
              Real Travel <span className="italic">2 Real Places</span>
            </span>
            <span className="text-[10px] sm:text-xs text-[hsl(var(--landing-text-muted))] -mt-0.5">
              For Real Travel going to Real Places
            </span>
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
