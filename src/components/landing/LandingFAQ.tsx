import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'What kind of app is Real Travel 2 Real Places?',
    answer: "It's a calm travel command center built around four pillars: Today (what's next and when to leave), Move (directive transport guidance), Guide (the few alerts that matter), and Flow (your whole trip on one timeline). Flights, stays, drives, expenses, and packing live together — and it works offline.",
  },
  {
    question: 'Is it free?',
    answer: "Yes. The free plan includes up to 5 lifetime trips with core features — flights, stays, expenses, packing lists, and reminders. Pro and Business tiers unlock unlimited trips and advanced capabilities for frequent travelers.",
  },
  {
    question: 'How is this different from other travel apps?',
    answer: "Most travel apps help you plan before you go — finding deals, booking flights, researching destinations. Real Travel 2 Real Places is built for what happens after you've booked: keeping the moving parts calm, structured, and one tap away while you're actually traveling.",
  },
  {
    question: 'Does it work offline?',
    answer: "Yes. Once a trip is loaded, your bookings, timeline, and key details stay available without signal. Expenses logged offline sync automatically the moment you're back online.",
  },
  {
    question: "Can I share a trip with someone I'm traveling with?",
    answer: "Yes. Invite anyone by email and choose what they can do — view the trip, add expenses, add lodging, or add tour stops. Permissions are independent, so you give exactly the access you mean to.",
  },
  {
    question: 'Does it handle multiple currencies?',
    answer: "Yes. Log expenses in whichever currency you actually paid in. The app keeps each currency separate — no synthetic conversions — so your totals stay honest.",
  },
  {
    question: 'Why would I keep it open during a trip?',
    answer: "Because the next decision is always one tap away. Need directions? Move tells you the best way. Need your hotel address? It's right there. Want to log an expense before you forget? Seconds. It's designed to be useful while you're moving.",
  },
  {
    question: 'Does it work for road trips?',
    answer: "Yes. You can organize stop-by-stop timelines, track gas expenses, and keep drive-day logistics accessible — all within the same trip view you'd use for flights and lodging.",
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
