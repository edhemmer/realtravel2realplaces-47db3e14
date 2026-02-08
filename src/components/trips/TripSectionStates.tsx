/**
 * TripSectionStates - Standardized loading, error, and empty state components
 * 
 * Patch 2.2.2: Canonical trip containers & bug-fix-at-source architecture
 * 
 * These components provide consistent UX patterns across all trip sections:
 * - Loading: Same skeleton/spinner for all tabs
 * - Error: Calm, user-friendly error message with optional retry
 * - Empty: Section-specific guidance with actionable CTAs
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertCircle, 
  Plane, 
  MapPin, 
  Receipt, 
  Bell,
  RefreshCw,
  Plus,
  ListPlus,
  ParkingCircle,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// LOADING STATE
// ============================================================================

interface TripSectionLoadingProps {
  className?: string;
  /** Optional message to display while loading */
  message?: string;
}

/**
 * Standardized loading state for trip sections
 */
export function TripSectionLoading({ className, message }: TripSectionLoadingProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

/**
 * Skeleton loading for card-based content
 */
export function TripSectionCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[150px]" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

interface TripSectionErrorProps {
  /** Error message to display (user-friendly) */
  message?: string;
  /** Optional retry callback */
  onRetry?: () => void;
  className?: string;
}

/**
 * Standardized error state for trip sections
 * 
 * Shows a calm, user-friendly error message without exposing technical details.
 */
export function TripSectionError({ 
  message = "Something went wrong loading this section.", 
  onRetry,
  className 
}: TripSectionErrorProps) {
  return (
    <Card className={cn('border-destructive/20', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <h4 className="text-base font-medium mb-1">Unable to load</h4>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          {message}
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EMPTY STATES
// ============================================================================

interface EmptyStateProps {
  className?: string;
  onAction?: () => void;
  actionLabel?: string;
  /** Whether the user can edit (determines if CTA is shown) */
  canEdit?: boolean;
}

/**
 * Empty state for Bookings tab
 */
export function EmptyBookingsState({ className, onAction, actionLabel = "Add Booking", canEdit = true }: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Plane className="h-7 w-7 text-primary" />
        </div>
        <h4 className="text-base font-medium mb-1">No bookings yet</h4>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Add flights, hotels, car rentals, and activities to build your trip itinerary.
        </p>
        {canEdit && onAction && (
          <Button onClick={onAction} className="bg-gradient-ocean hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Empty state for Tour/Stops tab
 */
export function EmptyTourState({ className, onAction, actionLabel = "Add Stop", canEdit = true }: EmptyStateProps & { onBulkAdd?: () => void }) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <MapPin className="h-7 w-7 text-primary" />
        </div>
        <h4 className="text-base font-medium mb-1">No stops added</h4>
        <p className="text-sm text-muted-foreground mb-2 max-w-sm">
          Stops are work locations and scheduled meetings during your trip.
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Use the Bookings tab for lodging and Stays.
        </p>
        {canEdit && onAction && (
          <Button onClick={onAction} className="bg-gradient-ocean hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Empty state for Expenses tab
 */
export function EmptyExpensesState({ className, onAction, actionLabel = "Add Expense", canEdit = true }: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Receipt className="h-7 w-7 text-primary" />
        </div>
        <h4 className="text-base font-medium mb-1">No expenses recorded</h4>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Track meals, transport, activities, and other trip costs here.
          Totals will appear as you add expenses and bookings with costs.
        </p>
        {canEdit && onAction && (
          <Button onClick={onAction} className="bg-gradient-ocean hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Empty state for Parking tab
 */
export function EmptyParkingState({ className, onAction, actionLabel = "Add Parking", canEdit = true }: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <ParkingCircle className="h-7 w-7 text-primary" />
        </div>
        <h4 className="text-base font-medium mb-1">No parking added</h4>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Track airport, hotel, or other parking during your trip.
        </p>
        {canEdit && onAction && (
          <Button onClick={onAction} className="bg-gradient-ocean hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Empty state for Alerts section
 */
export function EmptyAlertsState({ className }: { className?: string }) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Bell className="h-7 w-7 text-primary" />
        </div>
        <h4 className="text-base font-medium mb-1">No active alerts</h4>
        <p className="text-sm text-muted-foreground max-w-sm">
          Weather alerts, departure reminders, and parking expiration notices will appear here.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Empty state for Packing tab
 */
export function EmptyPackingState({ className, onAction, actionLabel = "Generate Packing List", canEdit = true }: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Package className="h-7 w-7 text-primary" />
        </div>
        <h4 className="text-base font-medium mb-1">No packing list yet</h4>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Generate a smart packing list based on your trip details, or add items manually.
        </p>
        {canEdit && onAction && (
          <Button onClick={onAction} className="bg-gradient-ocean hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
