import { Link } from 'react-router-dom';
import { getSupportContactHref, SUPPORT_CONTACT_LABEL } from '@/lib/supportContact';

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="landing-footer">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust line */}
        <p className="landing-footer-trust">
          Real Travel 2 Real Places does not sell your personal information.
        </p>

        {/* Main footer content */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          {/* Copyright */}
          <p className="landing-footer-copyright">
            © {currentYear} InLight AI, LLC. All rights reserved.
          </p>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link to="/privacy" className="landing-footer-link">
              Privacy
            </Link>
            <Link to="/terms" className="landing-footer-link">
              Terms
            </Link>
            <a href={getSupportContactHref()} aria-label={`Contact ${SUPPORT_CONTACT_LABEL}`} className="landing-footer-link">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
