import { Link } from 'react-router-dom';

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[hsl(var(--landing-border)/0.3)] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust line */}
        <p className="text-center text-sm text-[hsl(var(--landing-text-muted))] mb-6">
          Your data stays yours. We don't sell personal information.
        </p>

        {/* Main footer content */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <p className="text-sm text-[hsl(var(--landing-text-muted))]">
            © {currentYear} Real Travel to Real Places. All rights reserved.
          </p>

          {/* Links */}
          <div className="flex items-center gap-4 sm:gap-6 text-sm">
            <Link
              to="/privacy"
              className="text-[hsl(var(--landing-text-muted))] hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-[hsl(var(--landing-text-muted))] hover:text-white transition-colors"
            >
              Terms & Conditions
            </Link>
            <a
              href="mailto:support@realtravel2realplaces.com"
              className="text-[hsl(var(--landing-text-muted))] hover:text-white transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
