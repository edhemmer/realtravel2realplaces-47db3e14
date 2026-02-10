import { Link } from 'react-router-dom';
import { BrandHeader } from '@/components/BrandHeader';

export default function LandingHeader() {
  return (
    <header className="landing-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 sm:h-20 flex items-center">
          <BrandHeader variant="landing">
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
          </BrandHeader>
        </div>
      </div>
    </header>
  );
}
