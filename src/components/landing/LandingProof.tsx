import MockTripCard from './MockTripCard';

export default function LandingProof() {
  return (
    <section className="landing-proof-section">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="landing-section-headline">
            This isn't a demo. This is the real system.
          </h2>
          <p className="landing-section-subtext">
            Real Travel 2 Real Places is already managing real trips with real confirmations.
            <br className="hidden sm:block" />
            What you see is what you use.
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
                realtravel2realplaces.lovable.app
              </div>
            </div>
            <div className="landing-browser-content">
              <MockTripCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
