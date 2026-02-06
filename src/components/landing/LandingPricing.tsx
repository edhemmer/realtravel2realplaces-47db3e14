import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
const freePlanFeatures = ['Manage real trips with a dedicated trip home.', 'Add travel confirmations to set up your trip quickly.', 'Capture receipts and keep trip expenses in one place.', 'Build packing lists based on your trip details.', 'Access from desktop and mobile through your browser.'];
const proPlanFeatures = ['Advanced expense insights and export options.', 'Smarter reminders around key trip moments and expenses.', 'More automation for travelers who are often on the move.', 'Priority support as we grow.'];
export default function LandingPricing() {
  return <section className="landing-section">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
            Free now. Pro coming soon.
          </h2>
          <p className="text-base sm:text-lg text-[hsl(var(--landing-text-muted))] max-w-2xl mx-auto">
            Start with the free plan today. Pro will add more firepower for frequent travelers without adding more noise.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="landing-card landing-pricing-card p-6 sm:p-8">
            <div className="mb-6">
              <span className="landing-pill mb-4">Free plan</span>
              <p className="text-sm text-[hsl(var(--landing-text-muted))] mt-4">
                Everything you need to manage your trips.
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {freePlanFeatures.map(feature => <li key={feature} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[hsl(var(--landing-accent))] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[hsl(var(--landing-text))] leading-relaxed">
                    {feature}
                  </span>
                </li>)}
            </ul>

            <Link to="/auth" className="landing-btn-primary w-full text-center block py-3">Get Started</Link>

            <p className="text-xs text-[hsl(var(--landing-text-muted))] text-center mt-4">
              Perfect if you want one place to keep your trip under control without extra complexity.
            </p>
          </div>

          {/* Pro Plan */}
          <div className="landing-card landing-pricing-card pro p-6 sm:p-8">
            <div className="mb-6">
              <span className="landing-pill">Pro (coming soon)</span>
              <p className="text-sm text-[hsl(var(--landing-text-muted))] mt-4">
                More power for frequent travelers.
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {proPlanFeatures.map(feature => <li key={feature} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[hsl(var(--landing-accent))] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[hsl(var(--landing-text))] leading-relaxed">
                    {feature}
                  </span>
                </li>)}
            </ul>

            <button disabled className="landing-btn-secondary w-full text-center py-3 opacity-50 cursor-not-allowed">
              Coming soon
            </button>

            <p className="text-xs text-[hsl(var(--landing-text-muted))] text-center mt-4">
              You can start on Free now. When Pro is ready, upgrading will be simple and optional.
            </p>
          </div>
        </div>
      </div>
    </section>;
}