import { Helmet } from 'react-helmet-async';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import LandingSocialProof from '@/components/landing/LandingSocialProof';
import LandingProblemSolution from '@/components/landing/LandingProblemSolution';
import LandingHowItWorks from '@/components/landing/LandingHowItWorks';
import LandingComparison from '@/components/landing/LandingComparison';
import LandingWhoItsFor from '@/components/landing/LandingWhoItsFor';
import LandingPlanTiers from '@/components/landing/LandingPlanTiers';
import LandingFAQ from '@/components/landing/LandingFAQ';
import LandingPricing from '@/components/landing/LandingPricing';
import LandingFooter from '@/components/landing/LandingFooter';
import '@/styles/landing.css';

export default function LandingPage() {
  return (
    <>
      <Helmet>
        <title>Real Travel 2 Real Places — Know Exactly Where to Be and When</title>
        <meta
          name="description"
          content="The real-time travel command center for frequent travelers. Track flights, stays, expenses, and logistics — all in one place. Free to start."
        />
        <meta name="keywords" content="travel management app, trip organizer, itinerary tracker, expense tracking, travel command center, TripIt alternative" />
        <link rel="canonical" href="https://realtravel2realplaces.lovable.app" />

        {/* Open Graph */}
        <meta property="og:title" content="Real Travel 2 Real Places — Travel Command Center" />
        <meta property="og:description" content="Know exactly where to be and when. Track flights, stays, expenses, and logistics in real-time." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://realtravel2realplaces.lovable.app" />
        <meta property="og:site_name" content="Real Travel 2 Real Places" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Real Travel 2 Real Places — Travel Command Center" />
        <meta name="twitter:description" content="Know exactly where to be and when. The real-time travel command center." />
      </Helmet>

      <div className="landing-page">
        {/* Ambient background effects */}
        <div className="landing-ambient" aria-hidden="true" />

        <LandingHeader />
        <main>
          <LandingHero />
          <LandingSocialProof />
          <LandingProblemSolution />
          <LandingHowItWorks />
          <LandingComparison />
          <LandingWhoItsFor />
          <LandingPlanTiers />
          <LandingFAQ />
          <LandingPricing />
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
