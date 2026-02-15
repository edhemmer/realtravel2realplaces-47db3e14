import { Plane, Home, CheckCircle2, Luggage, Receipt } from 'lucide-react';

export default function MockTripCard() {
  return (
    <div className="mock-ui-card p-3 sm:p-4 w-full">
      {/* Trip Header */}
      <div className="mb-3">
        <h3 className="text-base font-semibold text-white mb-0.5">
          Orlando Weekend
        </h3>
        <p className="text-xs text-[hsl(var(--landing-text-muted))]">
          Mar 7–10 · 3 nights · Personal
        </p>
      </div>

      {/* Timeline */}
      <div className="space-y-3 mb-3">
        <div className="mock-timeline-item pb-2.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Plane className="w-3 h-3 text-[hsl(var(--landing-accent))]" />
            <span className="text-[0.6875rem] font-medium text-[hsl(var(--landing-accent))]">
              Flight · 09:45
            </span>
          </div>
          <p className="text-sm font-medium text-white mb-0.5">
            ATL → MCO · DL 1234
          </p>
          <p className="text-[0.6875rem] text-[hsl(var(--landing-text-muted))]">
            Check TSA number & seat
          </p>
        </div>

        <div className="mock-timeline-item pb-2.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Home className="w-3 h-3 text-[hsl(var(--landing-accent))]" />
            <span className="text-[0.6875rem] font-medium text-[hsl(var(--landing-accent))]">
              Lodging
            </span>
          </div>
          <p className="text-sm font-medium text-white mb-0.5">
            Airbnb · Lake Buena Vista
          </p>
          <p className="text-[0.6875rem] text-[hsl(var(--landing-text-muted))]">
            Check-in 3pm · Saved listing link
          </p>
        </div>
      </div>

      {/* Status Chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <div className="mock-chip">
          <CheckCircle2 className="w-2.5 h-2.5" />
          Flights
        </div>
        <div className="mock-chip">
          <CheckCircle2 className="w-2.5 h-2.5" />
          Lodging
        </div>
        <div className="mock-chip">
          <Luggage className="w-2.5 h-2.5" />
          Packed
        </div>
      </div>

      {/* Expense Summary */}
      <div className="rounded-lg bg-[hsl(var(--landing-bg)/0.5)] border border-[hsl(var(--landing-border)/0.4)] p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Receipt className="w-3.5 h-3.5 text-[hsl(var(--landing-text-muted))]" />
          <span className="text-[0.625rem] font-medium text-[hsl(var(--landing-text-muted))] uppercase tracking-wide">
            Trip Expenses
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-lg font-semibold text-white">$842</span>
            <span className="text-[0.6875rem] text-[hsl(var(--landing-text-muted))] ml-1.5">total</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-[hsl(var(--landing-accent))]">$421</span>
            <span className="text-[0.6875rem] text-[hsl(var(--landing-text-muted))] ml-1">your share</span>
          </div>
        </div>
      </div>
    </div>
  );
}
