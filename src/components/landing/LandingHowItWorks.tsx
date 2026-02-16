import { Camera, ClipboardPaste } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Camera,
    title: 'Snap a screenshot',
    description: 'Upload a photo of a confirmation or receipt. Key details are extracted and added to your trip.',
  },
  {
    number: '02',
    icon: ClipboardPaste,
    title: 'Paste and go',
    description: 'Copy booking text and paste it in. Dates, times, and locations are extracted and ready to review.',
  },
];

export default function LandingHowItWorks() {
  return (
    <section className="landing-howitworks-section">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="landing-section-headline">
            Get your trip in. We handle the rest.
          </h2>
          <p className="landing-section-subtext mt-3">
            Two ways to add your travel details — both with minimal effort.
          </p>
        </div>

        <div className="landing-steps-row">
          {steps.map((step, i) => (
            <div key={step.title} className="landing-step-card">
              <div className="landing-step-number">{step.number}</div>
              <div className="landing-step-icon-wrap">
                <step.icon className="w-6 h-6" />
              </div>
              <h3 className="landing-step-title">{step.title}</h3>
              <p className="landing-step-description">{step.description}</p>
              {i < steps.length - 1 && (
                <div className="landing-step-connector" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
