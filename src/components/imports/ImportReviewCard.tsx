/**
 * ImportReviewCard — Displays a single pending email import
 * with Add to Trip / Edit / Discard actions.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plane, Hotel, Car, MapPin, Ticket, Package, AlertCircle, Trash2, Plus, Pencil, TrainFront, Receipt } from 'lucide-react';
import type { PendingImport } from '@/hooks/usePendingImports';
import type { Trip } from '@/types/database';
import { isReceiptClassification, hasParseIssues, getParseIssues, getEntityLabel, type ParseIssue } from '@/lib/parseContract';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  flight: <Plane className="w-4 h-4" />,
  stay: <Hotel className="w-4 h-4" />,
  car_rental: <Car className="w-4 h-4" />,
  parking: <MapPin className="w-4 h-4" />,
  activity: <Ticket className="w-4 h-4" />,
  transport: <TrainFront className="w-4 h-4" />,
  other: <Package className="w-4 h-4" />,
};

interface ImportReviewCardProps {
  pending: PendingImport;
  trips: Trip[];
  onAddToTrip: (importId: string, tripId: string, parsedData: Record<string, unknown>) => void;
  onDiscard: (importId: string) => void;
  onEdit: (pending: PendingImport) => void;
  isFilingPending?: boolean;
}

export function ImportReviewCard({
  pending,
  trips,
  onAddToTrip,
  onDiscard,
  onEdit,
  isFilingPending,
}: ImportReviewCardProps) {
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  const parsed = pending.parsed_data as Record<string, unknown>;
  const summary = (parsed._summary as string) || `New import from ${pending.sender || 'email'}`;
  const bookingType = (parsed.booking_type as string) || 'other';
  const entityLabel = getEntityLabel(bookingType);
  const needsReview = pending.status === 'needs_review';
  const validation = parsed._validation as { hard_fails?: string[]; soft_issues?: string[] } | undefined;
  const isReceipt = isReceiptClassification(parsed);
  const issues = getParseIssues(parsed);
  const hasMissingFields = issues.length > 0;

  // Auto-select trip based on date overlap
  const startDate = (parsed.start_datetime as string)?.substring(0, 10);
  const matchingTrip = startDate
    ? trips.find((t) => t.start_date <= startDate && t.end_date >= startDate)
    : null;

  const effectiveTripId = selectedTripId || matchingTrip?.id || '';

  const handleAdd = () => {
    if (!effectiveTripId) return;
    onAddToTrip(pending.id, effectiveTripId, parsed);
  };

  // Determine badge label
  const getBadgeLabel = () => {
    if (isReceipt) return `${entityLabel} Receipt`;
    if (hasMissingFields) return 'Needs Attention';
    if (needsReview) return 'Needs Review';
    return 'Ready';
  };

  const badgeVariant = isReceipt ? 'outline' : (needsReview || hasMissingFields) ? 'outline' : 'secondary';
  const badgeClass = isReceipt 
    ? 'border-blue-500/40 text-blue-600' 
    : (needsReview || hasMissingFields) 
    ? 'border-orange-500/40 text-orange-600' 
    : '';

  return (
    <>
      <Card className={`border ${needsReview || hasMissingFields ? 'border-orange-500/40 bg-orange-500/5' : isFlightReceipt ? 'border-blue-500/40 bg-blue-500/5' : 'border-primary/30 bg-primary/5'}`}>
        <CardContent className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-start gap-3">
            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${needsReview || hasMissingFields ? 'bg-orange-500/10 text-orange-600' : isFlightReceipt ? 'bg-blue-500/10 text-blue-600' : 'bg-primary/10 text-primary'}`}>
              {needsReview || hasMissingFields ? <AlertCircle className="w-4 h-4" /> : TYPE_ICONS[bookingType] || TYPE_ICONS.other}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-snug">{summary}</p>
              {isFlightReceipt && (
                <p className="text-xs text-blue-600 mt-0.5">
                  Receipt only — not an itinerary. No flight was added to your timeline.
                </p>
              )}
              {pending.subject && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Subject: {pending.subject}
                </p>
              )}
            </div>
            <Badge variant={badgeVariant as any} className={`shrink-0 text-[10px] ${badgeClass}`}>
              {getBadgeLabel()}
            </Badge>
          </div>

          {/* Missing required fields — all entity types */}
          {hasMissingFields && issues.map((issue, idx) => (
            <div key={idx} className="text-xs text-orange-700 bg-orange-500/10 rounded-md px-3 py-2 space-y-1">
              <p className="font-medium">
                {issue.issueType === 'MISSING_REQUIRED_FIELDS' 
                  ? `Missing ${getEntityLabel(issue.entityType).toLowerCase()} details:` 
                  : 'Issue detected:'}
              </p>
              {issue.missingFields && issue.missingFields.map((f, i) => (
                <p key={i} className="text-orange-600">
                  • {f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </p>
              ))}
              {issue.actionHint && (
                <p className="text-orange-600/80 mt-1">{issue.actionHint}</p>
              )}
            </div>
          ))}

          {/* Validation warnings */}
          {needsReview && !hasMissingFields && validation?.hard_fails && validation.hard_fails.length > 0 && (
            <div className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2 space-y-1">
              <p className="font-medium">Some details could not be verified:</p>
              {validation.hard_fails.slice(0, 2).map((f, i) => (
                <p key={i} className="text-destructive/80">• {f}</p>
              ))}
            </div>
          )}

          {/* Trip selector */}
          <div className="space-y-1.5">
            <Select value={effectiveTripId} onValueChange={setSelectedTripId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select a trip..." />
              </SelectTrigger>
              <SelectContent>
                {trips.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.destination_city})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {matchingTrip && !selectedTripId && (
              <p className="text-xs text-muted-foreground">
                Auto-matched to <span className="font-medium">{matchingTrip.name}</span> by date overlap
              </p>
            )}
          </div>

          {/* Action buttons — stack on mobile */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleAdd}
              disabled={!effectiveTripId || isFilingPending}
            >
              <Plus className="w-3.5 h-3.5" />
              Add to Trip
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => onEdit(pending)}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDiscardDialogOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Discard
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Discard confirmation */}
      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this import?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the parsed import. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDiscard(pending.id);
                setDiscardDialogOpen(false);
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
