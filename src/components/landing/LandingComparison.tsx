import { Check, X, Minus } from 'lucide-react';

type FeatureStatus = 'yes' | 'no' | 'partial' | 'pro';

const features: { name: string; us: FeatureStatus; maps: FeatureStatus; airline: FeatureStatus; booking: FeatureStatus }[] = [
  { name: 'One operating view across flights, lodging, drive, transit, parking, expenses, and notes', us: 'yes', maps: 'no', airline: 'no', booking: 'partial' },
  { name: 'Real-time "what do I do next?" flow before and during travel', us: 'yes', maps: 'partial', airline: 'partial', booking: 'no' },
  { name: 'Drive Cockpit with trip stops, gas shortcut, weather, road context, and offline details', us: 'yes', maps: 'partial', airline: 'no', booking: 'no' },
  { name: 'Airport, local transit, weather, and parking windows in the trip context', us: 'yes', maps: 'partial', airline: 'partial', booking: 'no' },
  { name: 'Business/personal expense capture, splitting, and export-ready reports', us: 'yes', maps: 'no', airline: 'no', booking: 'partial' },
  { name: 'Companion sharing with scoped permissions and privacy masking', us: 'yes', maps: 'partial', airline: 'no', booking: 'partial' },
  { name: 'Offline trip record when service is weak or gone', us: 'yes', maps: 'partial', airline: 'partial', booking: 'partial' },
  { name: 'Turns confirmations and receipts into managed trip data', us: 'yes', maps: 'no', airline: 'partial', booking: 'partial' },
  { name: 'Designed for the whole travel period, not just planning or one vendor', us: 'yes', maps: 'no', airline: 'no', booking: 'no' },
];

function StatusIcon({ status }: { status: FeatureStatus }) {
  if (status === 'yes') return <Check className="w-4 h-4 text-[hsl(160_70%_45%)]" />;
  if (status === 'no') return <X className="w-4 h-4 text-[hsl(var(--landing-text-muted)/0.3)]" />;
  if (status === 'pro') return <span className="text-[0.625rem] font-semibold text-[hsl(280_70%_75%)] bg-[hsl(280_60%_55%/0.15)] px-1.5 py-0.5 rounded">PRO</span>;
  return <Minus className="w-4 h-4 text-[hsl(var(--landing-text-muted)/0.4)]" />;
}

export default function LandingComparison() {
  return (
    <section className="landing-comparison-section">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Why pay when you already have travel apps?
          </h2>
          <p className="landing-section-subtext mt-3">
            Google Maps, airline apps, and booking sites are excellent at their own lanes. RealTravel2RealPlaces is the paid operations layer that connects the lanes and tells you what matters next.
          </p>
        </div>

        <div className="landing-value-grid">
          <div className="landing-value-card">
            <span className="landing-value-kicker">Google Maps</span>
            <h3>Knows the route.</h3>
            <p>It does not know your hotel check-in, parking expiration, flight timing, receipts, companions, or business report.</p>
          </div>
          <div className="landing-value-card">
            <span className="landing-value-kicker">Airline apps</span>
            <h3>Know one airline.</h3>
            <p>They do not manage your lodging, rental car, local transit, road trip, packing, expenses, or non-airline stops.</p>
          </div>
          <div className="landing-value-card">
            <span className="landing-value-kicker">Expedia and booking apps</span>
            <h3>Know the reservation.</h3>
            <p>They do not run the trip day by day, preserve offline context, split costs, or produce operational reports.</p>
          </div>
        </div>

        <div className="landing-comparison-table-wrap">
          <table className="landing-comparison-table">
            <thead>
              <tr>
                <th className="landing-ct-feature-col">Feature</th>
                <th className="landing-ct-brand-col landing-ct-highlight">RT2RP</th>
                <th className="landing-ct-brand-col">Maps</th>
                <th className="landing-ct-brand-col">Airline apps</th>
                <th className="landing-ct-brand-col">Booking apps</th>
              </tr>
            </thead>
            <tbody>
              {features.map((f) => (
                <tr key={f.name} className="landing-ct-row">
                  <td className="landing-ct-feature">{f.name}</td>
                  <td className="landing-ct-cell landing-ct-highlight"><StatusIcon status={f.us} /></td>
                  <td className="landing-ct-cell"><StatusIcon status={f.maps} /></td>
                  <td className="landing-ct-cell"><StatusIcon status={f.airline} /></td>
                  <td className="landing-ct-cell"><StatusIcon status={f.booking} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
