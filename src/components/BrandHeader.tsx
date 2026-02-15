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
      >
        <span className={`font-bold tracking-tight flex-shrink-0 ${
          isLanding
            ? 'text-white text-sm sm:text-base'
            : 'text-foreground text-sm sm:text-base'
        }`}>
          Real Travel 2 Real Places
        </span>
        {!isLanding && user && <PlanPill showTripLimit className="flex-shrink-0" />}
      </Link>

      {/* Right-side controls */}
      {children}
    </div>
  );
}
