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
    <div className="flex items-center justify-between w-full">
      {/* Brand cluster: wordmark + pill */}
      <Link
        to="/"
        className="flex items-center gap-2 sm:gap-3 flex-nowrap hover:opacity-80 transition-opacity"
        aria-label="InLight AI — RealTravel 2 RealPlaces"
      >
        <span className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2 leading-tight">
          <span
            className={`text-[10px] sm:text-xs font-medium uppercase tracking-[0.14em] ${
              isLanding ? 'text-white/60' : 'text-muted-foreground'
            }`}
          >
            InLight AI
            <span className="hidden sm:inline mx-1.5 opacity-60">—</span>
          </span>
          <span
            className={`font-semibold tracking-tight ${
              isLanding
                ? 'text-base sm:text-lg text-white'
                : 'text-sm sm:text-base text-foreground'
            }`}
          >
            RealTravel <span className="italic font-normal opacity-90">2</span> RealPlaces
          </span>
        </span>
        {!isLanding && user && <PlanPill showTripLimit className="flex-shrink-0" />}
      </Link>

      {/* Right-side controls */}
      {children}
    </div>
  );
}
