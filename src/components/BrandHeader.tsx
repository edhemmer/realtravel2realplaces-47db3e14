import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PlanPill } from '@/components/PlanPill';

interface BrandHeaderProps {
  /** "app" for light app shell, "landing" for dark marketing page */
  variant?: 'app' | 'landing';
  /** Right-side content (nav links, buttons, user menu) */
  children?: React.ReactNode;
}

export function BrandHeader({ variant = 'app', children }: BrandHeaderProps) {
  const { user } = useAuth();
  const isLanding = variant === 'landing';

  return (
    <div className="flex items-center justify-between w-full gap-2 min-w-0">
      {/* Brand cluster: wordmark + pill */}
      <Link
        to="/"
        className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3 flex-nowrap hover:opacity-80 transition-opacity"
        aria-label="InLight AI — RealTravel 2 RealPlaces"
      >
        <img
          src="/rt2rp-logo.png"
          alt=""
          aria-hidden="true"
          className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 object-contain"
        />
        <span className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2 leading-tight">
          <span
            className={`text-[10px] sm:text-xs font-medium uppercase tracking-[0.14em] ${
              isLanding ? 'text-white/60' : 'text-muted-foreground'
            }`}
          >
            InLight AI
            <span className="hidden sm:inline mx-1.5 opacity-60">—</span>
          </span>
          <span
            className={`truncate font-semibold tracking-tight ${
              isLanding
                ? 'text-base sm:text-lg text-white'
                : 'text-sm sm:text-base text-foreground'
            }`}
          >
            RealTravel <span className="italic font-normal opacity-90">2</span> RealPlaces
          </span>
        </span>
        {!isLanding && user && <PlanPill showTripLimit className="flex-shrink-0 max-[374px]:hidden" />}
      </Link>

      {/* Right-side controls */}
      {children}
    </div>
  );
}
