import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'What kind of app is Real Travel 2 Real Places?',
    answer: 'Real Travel 2 Real Places is a travel management app, not just a trip planner. It helps travelers manage the real travel day: what is next, when to leave, where to go, airport maps, local transit, drive days, weather, expenses, and offline details.',
  },
  {
    question: 'How is this different from a trip planner?',
    answer: 'Trip planners help you choose places before you go. RealTravel focuses on managing the trip after plans become real: flights, lodging, movement, receipts, parking, road trips, airport context, transit windows, and daily execution.',
  },
  {
    question: 'Does it support road trips and driving?',
    answer: 'Yes. Drive Cockpit is built for driving days with navigation handoff, next stops, gas search, weather, road context, offline status, and CarPlay-ready trip context for iOS.',
  },
  {
    question: 'Does it include airport maps and local transit?',
    answer: 'Yes. Trips can surface airport map and parking links from official airport sources, plus local transit map and routing windows. The app uses low-credit approaches first, then live providers where they add real value.',
  },
  {
    question: 'Does it work offline?',
    answer: 'Yes. Once a trip is loaded, key bookings, timeline details, drive context, and expense capture stay useful without signal. Offline expenses sync when connection returns.',
  },
  {
    question: 'Is it useful for business travel?',
    answer: 'Yes. RealTravel supports business and personal travel with expenses, multi-currency records, shared trip permissions, booking management, reports, drive days, and operational dashboards.',
  },
  {
    question: 'Can I share a trip with someone I am traveling with?',
    answer: 'Yes. Invite co-travelers by email and choose what they can do, including viewing the trip, adding expenses, adding lodging, or helping with tour stops.',
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
