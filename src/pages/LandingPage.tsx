import { Helmet } from 'react-helmet-async';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import LandingPain from '@/components/landing/LandingPain';
import LandingSolution from '@/components/landing/LandingSolution';
import LandingWhyDuringTrip from '@/components/landing/LandingWhyDuringTrip';
import LandingMovingParts from '@/components/landing/LandingMovingParts';
import LandingComparison from '@/components/landing/LandingComparison';
import LandingWhoItsFor from '@/components/landing/LandingWhoItsFor';
import LandingPlanTiers from '@/components/landing/LandingPlanTiers';
import LandingPricing from '@/components/landing/LandingPricing';
import LandingFAQ from '@/components/landing/LandingFAQ';
import LandingFinalCTA from '@/components/landing/LandingFinalCTA';
import LandingFooter from '@/components/landing/LandingFooter';
import '@/styles/landing.css';

const seoTitle = 'Real Travel 2 Real Places | Chaos to Clarity Travel Management App';
const seoDescription = 'Find clarity in the travel chaos. RealTravel2RealPlaces connects trip details, timeline, lodging, driving, weather context, expenses, cached upcoming timeline data, and reports into one trip home.';

export default function LandingPage() {
  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta
          name="keywords"
          content="travel management app, trip management app, itinerary management, travel organizer, manage trips booked anywhere, driving mode, airport maps, local transit, travel expenses, cached trip timeline, business travel app, road trip management"
        />
        <link rel="canonical" href="https://realtravel2realplaces.app/" />

        <meta property="og:title" content="Real Travel 2 Real Places | Chaos to Clarity Travel Management" />
        <meta property="og:description" content="A connected trip-management layer for next steps, driving, airport and transit context, expenses, cached timeline access, and reports." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://realtravel2realplaces.app/" />
        <meta property="og:site_name" content="Real Travel 2 Real Places" />
        <meta property="og:image" content="https://realtravel2realplaces.app/pwa-icon-512.png" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Real Travel 2 Real Places | Chaos to Clarity" />
        <meta name="twitter:description" content="Connect trip details, timeline, driving, weather context, expenses, cached timeline access, and reports in one place." />
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
              'Today view for next actions from saved trip details',
              'Trip timeline for bookings and trip events',
              'Driving Mode for road trips, route context, and next stops',
              'Airport map and parking links when available',
              'Local transit context when required provider data is available',
              'Cached upcoming trip timeline after connectivity drops',
              'Queued expense capture while offline with sync after reconnection',
              'Multi-currency expense fields',
              'Invitation-based trip sharing with permission-aware actions',
              'Business and personal trip records',
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
          <LandingComparison />
          <LandingWhoItsFor />
          <LandingPlanTiers />
          <LandingPricing />
          <LandingFAQ />
          <LandingFinalCTA />
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
