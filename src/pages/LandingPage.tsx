import { Helmet } from 'react-helmet-async';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import LandingProblem from '@/components/landing/LandingProblem';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingWhyBetter from '@/components/landing/LandingWhyBetter';
import LandingAudience from '@/components/landing/LandingAudience';
import LandingProof from '@/components/landing/LandingProof';
import LandingPlanTiers from '@/components/landing/LandingPlanTiers';
import LandingPricing from '@/components/landing/LandingPricing';
import LandingFooter from '@/components/landing/LandingFooter';
import '@/styles/landing.css';

export default function LandingPage() {
  return (
    <>
      <Helmet>
        <title>Real Travel 2 Real Places — Manage Real Trips, Not Plans</title>
        <meta
          name="description"
          content="Manage real travel with Real Travel 2 Real Places. Track flights, stays, expenses, packing, and on-the-road travel in one calm, reliable system."
        />
      </Helmet>

      <div className="landing-page">
        {/* Ambient background effects */}
        <div className="landing-ambient" aria-hidden="true" />

        <LandingHeader />
        <main>
          <LandingHero />
          <LandingProblem />
          <LandingFeatures />
          <LandingWhyBetter />
          <LandingAudience />
          <LandingProof />
          <LandingPlanTiers />
          <LandingPricing />
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
