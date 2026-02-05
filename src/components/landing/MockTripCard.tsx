import { Plane, Home, CheckCircle2, Luggage, Receipt } from 'lucide-react';

export default function MockTripCard() {
  return (
    <div className="mock-ui-card p-4 sm:p-6 w-full max-w-md mx-auto lg:mx-0">
      {/* Trip Header */}
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-white mb-1">
          Orlando Weekend
        </h3>
        <p className="text-sm text-[hsl(var(--landing-text-muted))]">
          Mar 7–10 • 3 nights • Personal
        </p>
      </div>

      {/* Timeline */}
      <div className="space-y-4 mb-5">
        {/* Flight */}
        <div className="mock-timeline-item pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Plane className="w-3.5 h-3.5 text-[hsl(var(--landing-accent))]" />
            <span className="text-xs font-medium text-[hsl(var(--landing-accent))]">
              Flight • 09:45
            </span>
          </div>
          <p className="text-sm font-medium text-white mb-0.5">
            ATL → MCO • DL 1234
          </p>
          <p className="text-xs text-[hsl(var(--landing-text-muted))]">
            Check TSA number & seat
          </p>
        </div>

        {/* Stay */}
        <div className="mock-timeline-item">
          <div className="flex items-center gap-2 mb-1">
            <Home className="w-3.5 h-3.5 text-[hsl(var(--landing-accent))]" />
            <span className="text-xs font-medium text-[hsl(var(--landing-accent))]">
              Stay
            </span>
          </div>
          <p className="text-sm font-medium text-white mb-0.5">
            Airbnb • Lake Buena Vista
          </p>
          <p className="text-xs text-[hsl(var(--landing-text-muted))]">
            Check-in 3pm • Saved listing link
          </p>
        </div>
      </div>

      {/* Status Chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="mock-chip">
          <CheckCircle2 className="w-3 h-3" />
          Flights managed
        </div>
        <div className="mock-chip">
          <CheckCircle2 className="w-3 h-3" />
          Stay confirmed
        </div>
        <div className="mock-chip">
          <Luggage className="w-3 h-3" />
          Packing list ready
        </div>
      </div>

      {/* Expense Summary */}
      <div className="rounded-lg bg-[hsl(var(--landing-bg)/0.5)] border border-[hsl(var(--landing-border)/0.4)] p-3">
        <div className="flex items-center gap-2 mb-2">
          <Receipt className="w-4 h-4 text-[hsl(var(--landing-text-muted))]" />
          <span className="text-xs font-medium text-[hsl(var(--landing-text-muted))] uppercase tracking-wide">
            Trip Expenses
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-xl font-semibold text-white">$842</span>
            <span className="text-xs text-[hsl(var(--landing-text-muted))] ml-2">total</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-[hsl(var(--landing-accent))]">$421</span>
            <span className="text-xs text-[hsl(var(--landing-text-muted))] ml-1">your share</span>
          </div>
        </div>
      </div>

      {/* Bottom hint */}
      <p className="text-center text-xs text-[hsl(var(--landing-text-muted))] mt-4 opacity-70">
        Add confirmation → Trip managed
      </p>
    </div>
  );
}
