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
            Travel gets scattered.
          </h2>
          <p className="landing-section-subtext mt-3">
            Flights in your email. Lodging in another app. Directions in Maps. Parking confirmations in a text thread. Packing lists in your head.
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
          Travel isn't hard. <span className="text-[hsl(var(--landing-text))] font-medium">Keeping track of everything is.</span>
        </p>
      </div>
    </section>
  );
}
