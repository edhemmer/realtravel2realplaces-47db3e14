/**
 * v3.8.5: Tour Import Review Screen
 * 
 * Shows parsed items with inline editing for date, time, title, and location.
 * Blocking issues must be resolved before import is allowed.
 */

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, Check, ArrowLeft, Loader2, Trash2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { TourImportItem, hasBlockingIssues, countBlockingItems } from '@/lib/tours/import/types';
import { validateItems, buildEngagementPayloads } from '@/lib/tours/import/validate';
import { LocationInput } from '@/components/LocationInput';
import { LocationStructured } from '@/lib/location/types';
import { useCreateEngagement } from '@/hooks/useEngagements';

interface TourImportReviewProps {
  items: TourImportItem[];
  onItemsChange: (items: TourImportItem[]) => void;
  tripId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function TourImportReview({
  items,
  onItemsChange,
  tripId,
  onComplete,
  onBack,
}: TourImportReviewProps) {
  const [isImporting, setIsImporting] = useState(false);
  const createStop = useCreateEngagement();

  const blockingCount = useMemo(() => countBlockingItems(items), [items]);
  const importableCount = useMemo(() => items.filter(i => !hasBlockingIssues(i)).length, [items]);

  const updateItem = useCallback((id: string, updates: Partial<TourImportItem>) => {
    const updated = items.map(item => {
      if (item.id !== id) return item;
      return { ...item, ...updates };
    });
    onItemsChange(validateItems(updated));
  }, [items, onItemsChange]);

  const removeItem = useCallback((id: string) => {
    onItemsChange(items.filter(i => i.id !== id));
  }, [items, onItemsChange]);

  const handleLocationChange = useCallback((id: string, location: LocationStructured | null) => {
    updateItem(id, { location });
  }, [updateItem]);

  const jumpToFirstIssue = useCallback(() => {
    const firstBlocking = items.findIndex(hasBlockingIssues);
    if (firstBlocking >= 0) {
      const el = document.getElementById(`import-item-${items[firstBlocking].id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [items]);

  const handleImport = useCallback(async () => {
    const payloads = buildEngagementPayloads(items, tripId);
    if (payloads.length === 0) {
      toast.error('No stops ready to import');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let failCount = 0;

    for (const payload of payloads) {
      try {
        await createStop.mutateAsync(payload);
        successCount++;
      } catch (err) {
        console.error('Failed to create stop:', err);
        failCount++;
      }
    }

    if (failCount === 0) {
      toast.success(`Imported ${successCount} stop${successCount !== 1 ? 's' : ''}`);
    } else {
      toast.warning(`Imported ${successCount}, failed ${failCount}`);
    }

    setIsImporting(false);
    onComplete();
  }, [items, tripId, createStop, onComplete]);

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      {/* Summary bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {items.length} total
          </Badge>
          {blockingCount > 0 && (
            <Badge variant="destructive" className="text-xs cursor-pointer" onClick={jumpToFirstIssue}>
              {blockingCount} need fixes
            </Badge>
          )}
          {importableCount > 0 && (
            <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
              {importableCount} ready
            </Badge>
          )}
        </div>
      </div>

      {/* Items list */}
      <ScrollArea className="flex-1 max-h-[50vh]">
        <div className="space-y-3 pr-4">
          {items.map((item) => (
            <ImportItemCard
              key={item.id}
              item={item}
              onUpdate={(updates) => updateItem(item.id, updates)}
              onLocationChange={(loc) => handleLocationChange(item.id, loc)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Action bar */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={handleImport}
          disabled={importableCount === 0 || isImporting}
        >
          {isImporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Import {importableCount} Stop{importableCount !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// IMPORT ITEM CARD
// ============================================================================

interface ImportItemCardProps {
  item: TourImportItem;
  onUpdate: (updates: Partial<TourImportItem>) => void;
  onLocationChange: (loc: LocationStructured | null) => void;
  onRemove: () => void;
}

function ImportItemCard({ item, onUpdate, onLocationChange, onRemove }: ImportItemCardProps) {
  const isBlocking = hasBlockingIssues(item);
  const blockingIssues = item.issues.filter(i => i.type === 'BLOCKING');
  const warnings = item.issues.filter(i => i.type === 'WARNING');

  return (
    <div
      id={`import-item-${item.id}`}
      className={`border rounded-lg p-3 space-y-2.5 ${
        isBlocking ? 'border-destructive/50 bg-destructive/5' : 'border-border'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Input
            value={item.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Stop title"
            className="h-8 text-sm font-medium"
          />
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={onRemove}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Date + Time row */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Date *</label>
          <Input
            type="date"
            value={item.date || ''}
            onChange={(e) => onUpdate({ date: e.target.value || null })}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Time {item.timeCertainty === 'TBD' && <span className="text-muted-foreground">(optional)</span>}
          </label>
          <Input
            type="time"
            value={item.time || ''}
            onChange={(e) => onUpdate({ 
              time: e.target.value || null,
              timeCertainty: e.target.value ? 'CONFIRMED' : 'TBD',
            })}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        {item.rawLocationText && !item.location && (
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Detected: "{item.rawLocationText}" — please confirm below
          </p>
        )}
        <LocationInput
          label="Location"
          value={item.location}
          onChange={onLocationChange}
          required
          placeholder={item.rawLocationText || 'Search city...'}
        />
      </div>

      {/* Issues */}
      {blockingIssues.length > 0 && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs">
            {blockingIssues.map(i => i.message).join(' ')}
          </AlertDescription>
        </Alert>
      )}
      {warnings.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-3 h-3" />
          {warnings.map(i => i.message).join(' ')}
        </div>
      )}

      {/* Source badge */}
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
          {item.source === 'PHOTO_OCR' ? 'Photo' : item.source === 'EMAIL' ? 'Text' : 'Sheet'}
        </Badge>
        {item.timeCertainty === 'TBD' && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
            TBD time
          </Badge>
        )}
      </div>
    </div>
  );
}
