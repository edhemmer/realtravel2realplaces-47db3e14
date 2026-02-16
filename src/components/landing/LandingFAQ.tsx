import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'What kind of app is Real Travel 2 Real Places?',
    answer: 'It\'s a trip organizer app — a structured travel dashboard where you can bring together flights, lodging, drives, packing, and expenses for each trip. Think of it as one place to manage the moving parts of travel.',
  },
  {
    question: 'Is it free?',
    answer: 'Yes. The free plan includes up to 5 lifetime trips with core features — flights, stays, expenses, packing lists, and reminders. Pro and Business tiers unlock unlimited trips and advanced capabilities for frequent travelers.',
  },
  {
    question: 'How is this different from other travel planning apps?',
    answer: 'Most travel apps focus on planning — finding deals, booking flights, researching destinations. Real Travel 2 Real Places focuses on what happens after you\'ve booked: organizing the details and making them easy to access while you\'re on the road.',
  },
  {
    question: 'Why would I keep it open during a trip?',
    answer: 'Because your trip details are structured in one place. Need directions? Tap navigate. Need your hotel address? It\'s there. Want to log an expense before you forget? Takes seconds. It\'s designed to be useful while you\'re moving.',
  },
  {
    question: 'Can I track expenses?',
    answer: 'Yes. You can log expenses by category and trip, see running totals, and track your share when splitting costs. It\'s built into the trip timeline so you can log as you go.',
  },
  {
    question: 'Does it work for road trips?',
    answer: 'Yes. You can organize stop-by-stop timelines, track gas expenses, and keep drive-day logistics accessible — all within the same trip view you\'d use for flights and lodging.',
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
