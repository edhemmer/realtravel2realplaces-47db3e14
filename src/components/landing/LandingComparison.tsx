import { Check, X, Minus } from 'lucide-react';

type FeatureStatus = 'yes' | 'no' | 'partial' | 'pro';

const features: { name: string; us: FeatureStatus; maps: FeatureStatus; airline: FeatureStatus; booking: FeatureStatus }[] = [
  { name: 'One trip record across flights, lodging, driving, transit, parking, expenses, and notes', us: 'yes', maps: 'no', airline: 'no', booking: 'partial' },
  { name: 'Trip timeline built from saved bookings and trip events', us: 'yes', maps: 'partial', airline: 'partial', booking: 'partial' },
  { name: 'Driving Mode with saved stops, gas shortcut, weather context, and navigation handoff', us: 'yes', maps: 'partial', airline: 'no', booking: 'no' },
  { name: 'Airport, transit, weather, and parking context when the required data is available', us: 'yes', maps: 'partial', airline: 'partial', booking: 'no' },
  { name: 'Business/personal expense capture and trip reporting', us: 'yes', maps: 'no', airline: 'no', booking: 'partial' },
  { name: 'Invitation-based trip sharing with permission-aware actions', us: 'yes', maps: 'partial', airline: 'no', booking: 'partial' },
  { name: 'Cached upcoming timeline plus queued expense capture after connectivity drops', us: 'yes', maps: 'partial', airline: 'partial', booking: 'partial' },
  { name: 'Supported confirmations and receipts can become reviewable trip records', us: 'yes', maps: 'no', airline: 'partial', booking: 'partial' },
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
          <h2 className="landing-section-headline">Why use another travel app?</h2>
          <p className="landing-section-subtext mt-3">
            Map apps, airline apps, and booking sites each hold part of the trip. RealTravel2RealPlaces keeps supported trip records together so they are easier to find and use while traveling.
          </p>
        </div>

        <div className="landing-value-grid">
          <div className="landing-value-card">
            <span className="landing-value-kicker">Map apps</span>
            <h3>Focus on routes.</h3>
            <p>RT2RP keeps route context beside saved lodging, parking, flight, expense, and trip records.</p>
          </div>
          <div className="landing-value-card">
            <span className="landing-value-kicker">Airline apps</span>
            <h3>Focus on airline travel.</h3>
            <p>RT2RP can keep air-travel records beside lodging, driving, parking, transit context, and trip expenses.</p>
          </div>
          <div className="landing-value-card">
            <span className="landing-value-kicker">Booking apps</span>
            <h3>Focus on reservations.</h3>
            <p>RT2RP connects supported reservations with the rest of the saved trip record and expense history.</p>
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
