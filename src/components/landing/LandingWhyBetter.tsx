import { Mail, Camera, ClipboardPaste, Smartphone } from 'lucide-react';

const methods = [
  {
    icon: Mail,
    title: 'Forward confirmations',
    description: 'Send booking emails directly — flights, hotels, and rentals are parsed and organized into your trip.',
  },
  {
    icon: Camera,
    title: 'Upload screenshots',
    description: 'Snap a photo of a confirmation or receipt. Key details are extracted and added to your trip.',
  },
  {
    icon: ClipboardPaste,
    title: 'Paste email details',
    description: 'Copy and paste booking text. Dates, times, and locations are extracted and ready to review.',
  },
  {
    icon: Smartphone,
    title: 'Add or adjust from any device',
    description: 'Works on desktop and mobile. Update stops, add expenses, or check your timeline from anywhere.',
  },
];

export default function LandingWhyBetter() {
  return (
    <section className="landing-whybetter-section">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Automatic by default.
          </h2>
          <p className="landing-section-subtext mt-3">
            Minimal manual entry. Get your travel details in — your way — and the system handles the rest.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {methods.map((method) => (
            <div key={method.title} className="landing-feature-card">
              <div className="landing-feature-icon">
                <method.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="landing-feature-title">{method.title}</h3>
                <p className="landing-feature-description">{method.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
