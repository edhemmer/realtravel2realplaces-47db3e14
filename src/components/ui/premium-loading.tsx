/**
 * PremiumLoading — branded skeleton loading states
 * Replaces generic spinners with polished, content-shaped placeholders.
 */

import { Skeleton } from '@/components/ui/skeleton';

/** Full-page branded loading — used by ProtectedRoute */
export function BrandedPageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <div className="w-5 h-5 rounded-md bg-primary/30 animate-pulse" />
        </div>
        <div className="absolute -inset-2 rounded-2xl bg-primary/5 animate-ping" style={{ animationDuration: '2s' }} />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <div className="h-1 w-20 rounded-full bg-primary/20 overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-primary/50 animate-[shimmer_1.5s_ease-in-out_infinite]" 
            style={{ 
              animation: 'shimmer 1.5s ease-in-out infinite',
            }} 
          />
        </div>
      </div>
    </div>
  );
}

/** Dashboard skeleton — trip cards grid */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-11 w-32 rounded-xl" />
      </div>

      {/* Cards grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/50 bg-card p-5 space-y-4"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-4 w-2/3" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Account page skeleton */
export function AccountSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-64" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-md" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
