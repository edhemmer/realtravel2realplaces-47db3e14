import { Building2, Car, CheckCircle2, CloudSun, Plane, Receipt, TrainFront } from 'lucide-react';

export default function ProductTripCard() {
  return (
    <div className="product-ui-card p-3 sm:p-4 w-full">
      <div className="mb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white mb-0.5">
              TravelOps
            </h3>
            <p className="text-xs text-[hsl(var(--landing-text-muted))]">
              Orlando Weekend - Live command center
            </p>
          </div>
          <div className="mock-chip">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Offline ready
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg bg-[hsl(var(--landing-bg)/0.5)] border border-[hsl(var(--landing-border)/0.4)] p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Plane className="w-3 h-3 text-[hsl(var(--landing-accent))]" />
            <span className="text-[0.625rem] font-medium text-[hsl(var(--landing-text-muted))] uppercase tracking-wide">Next</span>
          </div>
          <p className="text-sm font-semibold text-white">ATL to MCO</p>
          <p className="text-[0.6875rem] text-[hsl(var(--landing-text-muted))]">Leave by 7:10 AM</p>
        </div>
        <div className="rounded-lg bg-[hsl(var(--landing-bg)/0.5)] border border-[hsl(var(--landing-border)/0.4)] p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Car className="w-3 h-3 text-[hsl(var(--landing-accent))]" />
            <span className="text-[0.625rem] font-medium text-[hsl(var(--landing-text-muted))] uppercase tracking-wide">Drive</span>
          </div>
          <p className="text-sm font-semibold text-white">Cockpit ready</p>
          <p className="text-[0.6875rem] text-[hsl(var(--landing-text-muted))]">Gas - roads - weather</p>
        </div>
      </div>

      <div className="space-y-2.5 mb-3">
        <div className="mock-timeline-item pb-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Building2 className="w-3 h-3 text-[hsl(var(--landing-accent))]" />
            <span className="text-[0.6875rem] font-medium text-[hsl(var(--landing-accent))]">
              Airport window
            </span>
          </div>
          <p className="text-sm font-medium text-white mb-0.5">
            MCO terminal map and parking
          </p>
        </div>

        <div className="mock-timeline-item pb-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <TrainFront className="w-3 h-3 text-[hsl(var(--landing-accent))]" />
            <span className="text-[0.6875rem] font-medium text-[hsl(var(--landing-accent))]">
              Local transit
            </span>
          </div>
          <p className="text-sm font-medium text-white mb-0.5">
            Open nearby transit map
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <div className="mock-chip">
          <CloudSun className="w-2.5 h-2.5" />
          Weather
        </div>
        <div className="mock-chip">
          <Building2 className="w-2.5 h-2.5" />
          Airport
        </div>
        <div className="mock-chip">
          <TrainFront className="w-2.5 h-2.5" />
          Transit
        </div>
      </div>

      <div className="rounded-lg bg-[hsl(var(--landing-bg)/0.5)] border border-[hsl(var(--landing-border)/0.4)] p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Receipt className="w-3.5 h-3.5 text-[hsl(var(--landing-text-muted))]" />
          <span className="text-[0.625rem] font-medium text-[hsl(var(--landing-text-muted))] uppercase tracking-wide">
            Managed spend
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-lg font-semibold text-white">$842</span>
            <span className="text-[0.6875rem] text-[hsl(var(--landing-text-muted))] ml-1.5">total</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-[hsl(var(--landing-accent))]">2 pending</span>
            <span className="text-[0.6875rem] text-[hsl(var(--landing-text-muted))] ml-1">receipts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
