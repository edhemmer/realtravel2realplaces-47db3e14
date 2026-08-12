import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'What kind of app is Real Travel 2 Real Places?',
    answer: 'Real Travel 2 Real Places is a travel management app, not just a trip planner. It helps travelers organize what is next, where to go, drive days, weather context, expenses, and key trip details in one place.',
  },
  {
    question: 'How is this different from a trip planner?',
    answer: 'Trip planners help you choose places before you go. RealTravel focuses on operating the trip after plans become real: flights, lodging, movement, receipts, parking, road trips, airport context, transit context, and daily execution.',
  },
  {
    question: 'Does it support road trips and driving?',
    answer: 'Yes. Drive mode supports navigation handoff, next stops, gas search, weather and route context, with key cached trip context available after connectivity drops.',
  },
  {
    question: 'Does it include airport maps and local transit?',
    answer: 'Trips can surface airport map and parking links from available official sources and local transit routing when the required trip, location, and provider data are available.',
  },
  {
    question: 'Does it work offline?',
    answer: 'After trip data has been loaded, RT2RP can show cached upcoming timeline details and queue new expenses while you are offline. Queued expenses sync after reconnection. Live and provider-backed features still require connectivity.',
  },
  {
    question: 'Is it useful for business travel?',
    answer: 'RT2RP supports business and personal trip records with booking management, expenses, multi-currency fields, reports, drive days, and operational trip views.',
  },
  {
    question: 'Can I share a trip with someone I am traveling with?',
    answer: 'RT2RP includes invitation-based trip sharing. Available actions depend on the permissions attached to that trip and traveler role.',
  },
  {
    question: 'Is it free?',
    answer: 'Yes. The free plan includes core trip management features. Pro and Business tiers are designed for frequent travelers, complex trips, and advanced management workflows.',
  },
];

export default function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="landing-faq-section">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            Frequently Asked Questions
          </h2>
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
