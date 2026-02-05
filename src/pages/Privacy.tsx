import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import '@/styles/landing.css';

export default function Privacy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy – Real Travel to Real Places</title>
        <meta name="description" content="Privacy Policy for Real Travel to Real Places." />
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

          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-8">Privacy Policy</h1>

          <div className="prose prose-invert prose-sm sm:prose-base max-w-none space-y-6 text-[hsl(var(--landing-text-muted))]">
            <p className="text-[hsl(var(--landing-text))]">
              <strong>Last updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">What We Collect</h2>
            <p>
              We collect the information you provide when you create an account (email address) and the trip data you choose to add (booking confirmations, expenses, packing lists, and notes).
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">How We Use Your Data</h2>
            <p>
              Your data is used solely to provide the trip management features you signed up for. We do not sell, rent, or share your personal information with third parties for marketing purposes.
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">Data Storage & Security</h2>
            <p>
              Your data is stored securely using industry-standard encryption. We use secure cloud infrastructure to protect your information.
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">Your Rights</h2>
            <p>
              You can access, update, or delete your account and all associated data at any time through your account settings. If you have questions, contact us at the email below.
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">Cookies</h2>
            <p>
              We use essential cookies to keep you logged in and remember your preferences. We do not use tracking cookies for advertising.
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">Contact</h2>
            <p>
              For privacy-related questions, email us at{' '}
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
