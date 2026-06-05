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

const seoTitle = 'Real Travel 2 Real Places | Chaos to Clarity Travel Management App';
const seoDescription = 'Find clarity in the travel chaos. RealTravel2RealPlaces is a premium travel operations app for trips, Drive Cockpit, airport maps, transit, weather, expenses, and offline details.';

export default function LandingPage() {
  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta
          name="keywords"
          content="travel management app, trip management app, travel command center, itinerary management, drive cockpit, airport maps, local transit maps, travel expenses, offline travel app, business travel app, road trip management"
        />
        <link rel="canonical" href="https://realtravel2realplaces.app/" />

        <meta property="og:title" content="Real Travel 2 Real Places | Chaos to Clarity Travel Management" />
        <meta property="og:description" content="A premium travel operations app for trips, Drive Cockpit, airport maps, local transit, weather, expenses, offline details, and the next clear move." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://realtravel2realplaces.app/" />
        <meta property="og:site_name" content="Real Travel 2 Real Places" />
        <meta property="og:image" content="https://realtravel2realplaces.app/pwa-icon-512.png" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Real Travel 2 Real Places | Chaos to Clarity" />
        <meta name="twitter:description" content="A premium travel operations app for trips, Drive Cockpit, airport maps, transit, weather, expenses, and offline details." />
        <meta name="twitter:image" content="https://realtravel2realplaces.app/pwa-icon-512.png" />

        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Real Travel 2 Real Places',
            alternateName: 'RT2RP',
            url: 'https://realtravel2realplaces.app/',
            applicationCategory: 'TravelApplication',
            operatingSystem: 'Web, iOS',
            description: seoDescription,
            featureList: [
              'TravelOps command dashboard',
              'Today view for next actions and leave-by timing',
              'Drive Cockpit for road trips and CarPlay-ready stops',
              'Airport map and parking links',
              'Local transit map and routing windows',
              'Offline trip details and expense capture',
              'Multi-currency travel expenses',
              'Trip sharing with scoped permissions',
              'Business and personal trip management',
            ],
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
            author: {
              '@type': 'Organization',
              name: 'InLight AI, LLC',
            },
          })}
        </script>
      </Helmet>

      <div className="landing-page">
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
