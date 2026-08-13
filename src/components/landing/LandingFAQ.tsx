import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'What kind of app is Real Travel 2 Real Places?',
    answer: 'Real Travel 2 Real Places is a travel management app for keeping saved trip details, timeline records, driving context, expenses, weather context, and other supported trip information together.',
  },
  {
    question: 'How is this different from a trip planner?',
    answer: 'Trip planners focus on choosing and arranging a trip. RealTravel focuses on keeping the trip records you already have connected while you travel.',
  },
  {
    question: 'Does it support road trips and driving?',
    answer: 'Yes. Driving Mode supports navigation handoff, saved stops, gas search, weather context, and road-trip details stored with the trip.',
  },
  {
    question: 'Does it include airport maps and local transit?',
    answer: 'Trips can surface airport map or parking links and local transit context when the required trip, location, and provider data are available.',
  },
  {
    question: 'Does it work offline?',
    answer: 'After trip data has been loaded, RT2RP can show cached upcoming timeline details and queue new expenses while offline. Queued expenses sync after reconnection. Provider-backed features still require connectivity.',
  },
  {
    question: 'Is it useful for business travel?',
    answer: 'RT2RP supports business and personal trip records, expense tracking, multi-currency fields, and trip reporting workflows that are available in the account.',
  },
  {
    question: 'Can I share a trip with someone I am traveling with?',
    answer: 'RT2RP includes invitation-based trip sharing. Available actions depend on the permissions attached to that trip and traveler role.',
  },
  {
    question: 'Is it free?',
    answer: 'Yes. The Free plan includes up to 2 lifetime trips and does not require a credit card.',
  },
];

export default function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="landing-faq-section">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">Frequently Asked Questions</h2>
        </div>

        <div className="landing-faq-list">
          {faqs.map((faq, index) => (
            <div key={faq.question} className="landing-faq-item">
              <button
                className="landing-faq-trigger"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                aria-expanded={openIndex === index}
              >
                <span>{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-[hsl(var(--landing-text-muted))] transition-transform duration-200 flex-shrink-0 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="landing-faq-answer">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map((faq) => ({
                '@type': 'Question',
                name: faq.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: faq.answer,
                },
              })),
            }),
          }}
        />
      </div>
    </section>
  );
}
