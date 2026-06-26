import ProductTripCard from './ProductTripCard';

export default function LandingProof() {
  return (
    <section className="landing-proof-section">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="landing-section-headline">
            The operating model travelers actually use.
          </h2>
          <p className="landing-section-subtext">
            Real Travel 2 Real Places manages real trips from real confirmations.
            <br className="hidden sm:block" />
            The app turns those moving parts into live operating windows, offline context, and next actions.
          </p>
        </div>

        {/* Browser frame showcase */}
        <div className="landing-proof-showcase">
          <div className="landing-browser-frame">
            <div className="landing-browser-bar">
              <div className="landing-browser-dots">
                <span /><span /><span />
              </div>
              <div className="landing-browser-url">
                realtravel2realplaces.app
              </div>
            </div>
            <div className="landing-browser-content">
              <ProductTripCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
