import { Helmet } from 'react-helmet-async';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import LandingProof from '@/components/landing/LandingProof';
import LandingWhoItsFor from '@/components/landing/LandingWhoItsFor';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingPricing from '@/components/landing/LandingPricing';
import LandingFooter from '@/components/landing/LandingFooter';
import '@/styles/landing.css';

export default function LandingPage() {
  return (
    <>
      <Helmet>
        <title>Real Travel to Real Places – We don't plan your trip. We manage it.</title>
        <meta
          name="description"
          content="Real Travel to Real Places helps you manage real trips: add your travel confirmations and keep flights, stays, expenses, and packing in one calm, reliable view."
        />
      </Helmet>

      <div className="landing-page">
        {/* Ambient background effects */}
        <div className="landing-ambient" aria-hidden="true" />

        <LandingHeader />
        <main>
          <LandingHero />
          <LandingProof />
          <LandingWhoItsFor />
          <LandingFeatures />
          <LandingPricing />
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
