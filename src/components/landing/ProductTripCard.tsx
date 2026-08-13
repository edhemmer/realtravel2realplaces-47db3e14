export default function ProductTripCard() {
  return (
    <div className="product-ui-card p-4 w-full">
      <h3 className="text-base font-semibold text-white">Trip Home</h3>
      <p className="mt-1 text-xs text-[hsl(var(--landing-text-muted))]">Orlando Weekend</p>
      <div className="mt-4 space-y-2 text-sm">
        <div className="rounded-lg border border-[hsl(var(--landing-border)/0.4)] bg-[hsl(var(--landing-bg)/0.5)] p-3 text-white">Saved flight: ATL to MCO</div>
        <div className="rounded-lg border border-[hsl(var(--landing-border)/0.4)] bg-[hsl(var(--landing-bg)/0.5)] p-3 text-white">Timeline, expenses, and trip records</div>
      </div>
    </div>
  );
}
