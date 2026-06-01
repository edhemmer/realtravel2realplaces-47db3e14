import { Helmet } from 'react-helmet-async';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import LandingPain from '@/components/landing/LandingPain';
import LandingSolution from '@/components/landing/LandingSolution';
import LandingWhyDuringTrip from '@/components/landing/LandingWhyDuringTrip';
import LandingMovingParts from '@/components/landing/LandingMovingParts';
import LandingWhoItsFor from '@/components/landing/LandingWhoItsFor';
import LandingFAQ from '@/components/landing/LandingFAQ';
import LandingFinalCTA from '@/components/landing/LandingFinalCTA';
import LandingFooter from '@/components/landing/LandingFooter';
import '@/styles/landing.css';

export default function LandingPage() {
  return (
    <>
      <Helmet>
        <title>Real Travel 2 Real Places — Your travel command center</title>
        <meta
          name="description"
          content="A calm travel command center. See what's next, when to leave, and how to get there — flights, stays, drives, expenses, and packing in one place. Works offline."
        />

        {/* Open Graph */}
        <meta property="og:title" content="Real Travel 2 Real Places — Your travel command center" />
        <meta property="og:description" content="See what's next, when to leave, and how to get there. Flights, stays, drives, expenses, and packing in one calm place. Works offline." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://realtravel2realplaces.app/" />
        <meta property="og:site_name" content="Real Travel 2 Real Places" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Real Travel 2 Real Places — Your travel command center" />
        <meta name="twitter:description" content="See what's next, when to leave, and how to get there. Works offline." />
      </Helmet>

      <div className="landing-page">
        {/* Ambient background effects */}
        <div className="landing-ambient" aria-hidden="true" />

        <LandingHeader />
        <main>
          <LandingHero />
          <LandingPain />
          <LandingSolution />
          <LandingWhyDuringTrip />
          <LandingMovingParts />
          <LandingWhoItsFor />
          <LandingFAQ />
          <LandingFinalCTA />
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
