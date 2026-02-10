import { Link } from 'react-router-dom';
import logoImg from '@/assets/logo.png';
import logoWhiteImg from '@/assets/logo-white.png';
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
      {/* Brand cluster: logo + pill */}
      <Link
        to="/"
        className="flex items-center gap-2 sm:gap-3 flex-nowrap hover:opacity-80 transition-opacity"
      >
        <img
          src={isLanding ? logoWhiteImg : logoImg}
          alt="Real Travel 2 Real Places"
          className={`${isLanding ? 'rt2rp-header-logo--landing' : 'rt2rp-header-logo'} flex-shrink-0`}
        />
        {!isLanding && user && <PlanPill showTripLimit className="flex-shrink-0" />}
      </Link>

      {/* Right-side controls */}
      {children}
    </div>
  );
}
