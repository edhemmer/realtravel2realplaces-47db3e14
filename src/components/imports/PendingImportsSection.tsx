/**
 * PendingImportsSection — Dashboard section showing pending email imports
 * requiring user review before filing to a trip.
 */

import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { usePendingImports, useDiscardImport, useFileImportToTrip } from '@/hooks/usePendingImports';
import { useTrips } from '@/hooks/useTrips';
import { ImportReviewCard } from './ImportReviewCard';
import { EditImportDialog } from './EditImportDialog';
import type { PendingImport } from '@/hooks/usePendingImports';

export function PendingImportsSection() {
  const { data: pendingImports = [], isLoading } = usePendingImports();
  const { data: trips = [] } = useTrips();
  const discardMutation = useDiscardImport();
  const fileMutation = useFileImportToTrip();
  const [editingImport, setEditingImport] = useState<PendingImport | null>(null);

  // Only show active trips for filing
  const activeTrips = trips.filter((t) => t.trip_state === 'active');

  if (isLoading || pendingImports.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Inbox className="w-5 h-5 text-primary" />
        Import Review
        <span className="text-xs font-normal text-muted-foreground ml-1">
          ({pendingImports.length})
        </span>
      </h2>

      <div className="space-y-3">
        {pendingImports.map((pi) => (
          <ImportReviewCard
            key={pi.id}
            pending={pi}
            trips={activeTrips}
            onAddToTrip={(importId, tripId, parsedData) =>
              fileMutation.mutate({ importId, tripId, parsedData })
            }
            onDiscard={(importId) => discardMutation.mutate(importId)}
            onEdit={setEditingImport}
            isFilingPending={fileMutation.isPending}
          />
        ))}
      </div>

      {/* Edit dialog */}
      {editingImport && (
        <EditImportDialog
          pending={editingImport}
          trips={activeTrips}
          open={!!editingImport}
          onOpenChange={(open) => !open && setEditingImport(null)}
          onFile={(importId, tripId, parsedData) => {
            fileMutation.mutate({ importId, tripId, parsedData });
            setEditingImport(null);
          }}
        />
      )}
    </div>
  );
}
