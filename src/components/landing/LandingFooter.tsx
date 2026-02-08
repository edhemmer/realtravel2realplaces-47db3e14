import { Link } from 'react-router-dom';

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="landing-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust line */}
        <p className="landing-footer-trust">
          Your data stays yours. We don't sell personal information.
        </p>

        {/* Main footer content */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <p className="landing-footer-copyright">
            © {currentYear} Real Travel to Real Places
          </p>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link to="/privacy" className="landing-footer-link">
              Privacy
            </Link>
            <Link to="/terms" className="landing-footer-link">
              Terms
            </Link>
            <a href="mailto:support@realtravel2realplaces.com" className="landing-footer-link">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
