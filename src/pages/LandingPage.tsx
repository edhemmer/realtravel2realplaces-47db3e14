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
        <title>Real Travel 2 Real Places | Organize and Manage Your Travel Plans</title>
        <meta
          name="description"
          content="Organize flights, lodging, drives, packing, and expenses in one structured timeline. A better way to manage the chaos of travel."
        />
        <meta name="keywords" content="travel planning app, trip organizer app, travel itinerary organizer, trip management app, organize travel plans, travel timeline app, travel dashboard" />
        <link rel="canonical" href="https://realtravel2realplaces.lovable.app" />

        {/* Open Graph */}
        <meta property="og:title" content="Real Travel 2 Real Places | Organize and Manage Your Travel Plans" />
        <meta property="og:description" content="Organize flights, lodging, drives, packing, and expenses in one structured timeline. A better way to manage the chaos of travel." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://realtravel2realplaces.lovable.app" />
        <meta property="og:site_name" content="Real Travel 2 Real Places" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Real Travel 2 Real Places | Organize and Manage Your Travel Plans" />
        <meta name="twitter:description" content="Organize flights, lodging, drives, packing, and expenses in one structured timeline. A better way to manage the chaos of travel." />
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
