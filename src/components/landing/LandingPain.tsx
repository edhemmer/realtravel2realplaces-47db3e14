import { Mail, MapPin, MessageSquare, HelpCircle, FolderOpen } from 'lucide-react';

const painPoints = [
  { icon: Mail, text: 'Searching your inbox for flight confirmations' },
  { icon: MapPin, text: 'Switching to Maps for the hotel address' },
  { icon: MessageSquare, text: 'Scrolling through texts for parking details' },
  { icon: HelpCircle, text: 'Trying to remember what comes next' },
  { icon: FolderOpen, text: 'Piecing together info from five different apps' },
];

export default function LandingPain() {
  return (
    <section className="landing-problemsolution-section">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Travel chaos is expensive.
          </h2>
          <p className="landing-section-subtext mt-3">
            Missed timing, buried confirmations, forgotten receipts, weak signal, and too many apps all cost attention when you need calm.
          </p>
        </div>

        <div className="landing-ps-pain-list">
          {painPoints.map((point) => (
            <div key={point.text} className="landing-ps-pain-item">
              <point.icon className="w-4 h-4 flex-shrink-0 text-[hsl(var(--landing-text-muted))]" />
              <p className="text-sm text-[hsl(var(--landing-text-muted))]">{point.text}</p>
            </div>
          ))}
        </div>

        <p className="text-center mt-8 text-[hsl(var(--landing-text-muted))] text-sm leading-relaxed">
          Travel is motion. <span className="text-[hsl(var(--landing-text))] font-medium">RealTravel gives that motion an operating system.</span>
        </p>
      </div>
    </section>
  );
}
