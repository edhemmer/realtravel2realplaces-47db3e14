import { Link } from 'react-router-dom';

export default function LandingHeader() {
  return (
    <header className="landing-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 sm:h-20 flex items-center justify-between">
          {/* Visually hidden brand text for SEO / accessibility */}
          <span className="sr-only">Real Travel 2 Real Places</span>

          {/* Right-side actions */}
          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
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
