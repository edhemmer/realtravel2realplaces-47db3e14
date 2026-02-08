import { Mail, Receipt, Users, RefreshCw, FileSpreadsheet } from 'lucide-react';

const painPoints = [
  {
    icon: Mail,
    text: 'Confirmations scattered across email, texts, and screenshots',
  },
  {
    icon: Receipt,
    text: 'Expenses tracked "somewhere else"',
  },
  {
    icon: Users,
    text: 'Group trips where everyone asks the same questions',
  },
  {
    icon: RefreshCw,
    text: 'Changes that force you to re-check everything',
  },
  {
    icon: FileSpreadsheet,
    text: 'Spreadsheets that start strong and fall apart mid-trip',
  },
];

export default function LandingProblem() {
  return (
    <section className="landing-problem-section">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Travel becomes work after you book it.
          </h2>
        </div>

        {/* Pain points */}
        <div className="landing-pain-list">
          {painPoints.map((point) => (
            <div key={point.text} className="landing-pain-item">
              <div className="landing-pain-icon">
                <point.icon className="w-5 h-5" />
              </div>
              <p className="landing-pain-text">{point.text}</p>
            </div>
          ))}
        </div>

        {/* Transition */}
        <p className="landing-problem-transition">
          Real Travel 2 Real Places exists to remove all of that.
        </p>
      </div>
    </section>
  );
}
