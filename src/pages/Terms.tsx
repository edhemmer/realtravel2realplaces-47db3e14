import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import '@/styles/landing.css';

export default function Terms() {
  return (
    <>
      <Helmet>
        <title>Terms & Conditions – Real Travel to Real Places</title>
        <meta name="description" content="Terms & Conditions for Real Travel to Real Places." />
      </Helmet>

      <div className="landing-page min-h-screen">
        <div className="landing-ambient" aria-hidden="true" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[hsl(var(--landing-text-muted))] hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-8">Terms & Conditions</h1>

          <div className="prose prose-invert prose-sm sm:prose-base max-w-none space-y-6 text-[hsl(var(--landing-text-muted))]">
            <p className="text-[hsl(var(--landing-text))]">
              <strong>Last updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">Agreement to Terms</h2>
            <p>
              By accessing or using Real Travel to Real Places, you agree to be bound by these Terms & Conditions. If you disagree with any part of the terms, you may not access the service.
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">What This Service Does</h2>
            <p>
              Real Travel to Real Places is a trip management tool. We help you organize and view your travel bookings, expenses, and packing lists. We are not a travel agency, booking service, or concierge. We do not book, modify, or cancel reservations on your behalf.
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">Your Account</h2>
            <p>
              You are responsible for maintaining the security of your account and password. You agree not to share your account credentials with others.
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">User Content</h2>
            <p>
              You retain ownership of all data you add to the service. By using the service, you grant us permission to store and process your data solely for the purpose of providing the service to you.
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">Acceptable Use</h2>
            <p>
              You agree not to use the service for any unlawful purpose or in any way that could damage, disable, or impair the service.
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">Limitation of Liability</h2>
            <p>
              The service is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of significant changes via email or in-app notification.
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">Contact</h2>
            <p>
              For questions about these terms, email us at{' '}
              <a href="mailto:support@realtravel2realplaces.com" className="text-[hsl(var(--landing-accent))] hover:underline">
                support@realtravel2realplaces.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
