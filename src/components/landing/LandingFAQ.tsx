import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'What is the best travel management app?',
    answer: 'The best travel management app keeps all your trip details — flights, stays, expenses, and stops — in one place with minimal manual entry. Real Travel 2 Real Places does exactly that, acting as a real-time command center for your trips.',
  },
  {
    question: 'How do frequent travelers stay organized?',
    answer: 'Frequent travelers need a system that handles multiple trips, layered itineraries, and rapid changes. Real Travel 2 Real Places surfaces what\'s next, tracks expenses per trip, and sends configurable reminders to help you stay on track.',
  },
  {
    question: 'Is there an app that tells you what\'s next on your trip?',
    answer: 'Yes. Real Travel 2 Real Places shows your next flight, check-in, stop, or departure — with leave-by timing and navigation-ready addresses — so you always know exactly where to be and when.',
  },
  {
    question: 'Can I import travel confirmations automatically?',
    answer: 'Yes. You can forward confirmation emails, upload screenshots, or paste booking details. The system extracts dates, times, and locations and organizes them into your trip timeline. You can review and adjust any parsed details.',
  },
  {
    question: 'Is Real Travel 2 Real Places free to use?',
    answer: 'Yes. The free plan includes up to 5 lifetime trips with core features — flights, stays, expenses, packing lists, and reminders. Pro and Business tiers unlock unlimited trips, Explore, and advanced insights for frequent travelers.',
  },
  {
    question: 'How is this different from a travel planning app?',
    answer: 'Most travel apps help you plan. Real Travel 2 Real Places helps you execute. It manages everything after your trip is booked — tracking logistics, timing, expenses, and changes in real time so you travel with confidence.',
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
            <div key={index} className="landing-faq-item">
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

        {/* FAQ Schema for SEO */}
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
