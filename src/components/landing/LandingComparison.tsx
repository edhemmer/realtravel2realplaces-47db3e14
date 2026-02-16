import { Check, X, Minus } from 'lucide-react';

type FeatureStatus = 'yes' | 'no' | 'partial' | 'pro';

const features: { name: string; us: FeatureStatus; tripit: FeatureStatus; wanderlog: FeatureStatus }[] = [
  
  { name: 'Real-time "What\'s Next"', us: 'yes', tripit: 'pro', wanderlog: 'no' },
  { name: 'Leave-by timing', us: 'yes', tripit: 'no', wanderlog: 'no' },
  { name: 'Built-in expense tracking', us: 'yes', tripit: 'no', wanderlog: 'no' },
  { name: 'Cost splitting (companions)', us: 'yes', tripit: 'no', wanderlog: 'no' },
  { name: 'Packing lists', us: 'yes', tripit: 'no', wanderlog: 'yes' },
  { name: 'Multi-stop tour management', us: 'yes', tripit: 'no', wanderlog: 'partial' },
  { name: 'Parking tracking & reminders', us: 'yes', tripit: 'no', wanderlog: 'no' },
  { name: 'Trip sharing & collaboration', us: 'yes', tripit: 'yes', wanderlog: 'yes' },
  { name: 'Free tier available', us: 'yes', tripit: 'yes', wanderlog: 'yes' },
  { name: 'No ads', us: 'yes', tripit: 'no', wanderlog: 'no' },
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
            See how we compare.
          </h2>
          <p className="landing-section-subtext mt-3">
            Most travel apps help you plan. We help you execute.
          </p>
        </div>

        <div className="landing-comparison-table-wrap">
          <table className="landing-comparison-table">
            <thead>
              <tr>
                <th className="landing-ct-feature-col">Feature</th>
                <th className="landing-ct-brand-col landing-ct-highlight">RT2RP</th>
                <th className="landing-ct-brand-col">TripIt</th>
                <th className="landing-ct-brand-col">Wanderlog</th>
              </tr>
            </thead>
            <tbody>
              {features.map((f) => (
                <tr key={f.name} className="landing-ct-row">
                  <td className="landing-ct-feature">{f.name}</td>
                  <td className="landing-ct-cell landing-ct-highlight"><StatusIcon status={f.us} /></td>
                  <td className="landing-ct-cell"><StatusIcon status={f.tripit} /></td>
                  <td className="landing-ct-cell"><StatusIcon status={f.wanderlog} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
