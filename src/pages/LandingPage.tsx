import { Helmet } from 'react-helmet-async';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import LandingProblemSolution from '@/components/landing/LandingProblemSolution';
import LandingHowItWorks from '@/components/landing/LandingHowItWorks';
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
        <title>Real Travel 2 Real Places — Travel Command Center</title>
        <meta
          name="description"
          content="Know exactly where to be and when. Real Travel 2 Real Places is a real-time travel command center for frequent travelers."
        />
      </Helmet>

      <div className="landing-page">
        {/* Ambient background effects */}
        <div className="landing-ambient" aria-hidden="true" />

        <LandingHeader />
        <main>
          <LandingHero />
          <LandingProblemSolution />
          <LandingHowItWorks />
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
