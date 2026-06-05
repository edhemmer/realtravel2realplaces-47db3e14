import { Link } from 'react-router-dom';

export default function LandingPricing() {
  return (
    <section className="landing-pricing-section">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="landing-section-headline">
          Try it free. Pay when it becomes your operating system.
        </h2>
        <p className="landing-section-subtext mt-4">
          The Free tier gives you 2 lifetime trips to prove the value. Pro and Business are for travelers who want unlimited trips, advanced operations, reporting, and fewer loose ends every month.
        </p>

        <p className="mt-8 text-lg font-semibold text-[hsl(var(--landing-text))]">
          If travel costs real money, missed context costs more.
        </p>

        <div className="mt-6">
          <Link to="/auth?tab=signup" className="landing-btn-primary-hero">
            Start Free
          </Link>
        </div>

        <p className="landing-trust-line">
          No credit card required - Free plan includes 2 lifetime trips
        </p>
      </div>
    </section>
  );
}
