/**
 * v3.8.1: "Add to Timeline" scheduling modal for Explore items.
 * Inserts into trip_engagements only. DB trigger creates trip_events.
 */

import { useState, useEffect, useMemo } from 'react';
import { AttractionSuggestion } from '@/types/attraction';
import { Trip } from '@/types/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';
import { useAddToTimeline } from '@/hooks/useAddToTimeline';

interface AddToTimelineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attraction: AttractionSuggestion | null;
  trip: Trip;
}

type DurationPreset = '30m' | '1h' | '2h' | '3h' | 'none';

const DURATION_MINUTES: Record<DurationPreset, number | null> = {
  '30m': 30,
  '1h': 60,
  '2h': 120,
  '3h': 180,
  'none': null,
};

function roundToNext5(date: Date): string {
  const minutes = Math.ceil(date.getMinutes() / 5) * 5;
  const rounded = new Date(date);
  rounded.setMinutes(minutes, 0, 0);
  if (minutes >= 60) {
    rounded.setHours(rounded.getHours() + 1);
    rounded.setMinutes(0);
  }
  return `${String(rounded.getHours()).padStart(2, '0')}:${String(rounded.getMinutes()).padStart(2, '0')}`;
}

function todayLocalStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function AddToTimelineModal({ open, onOpenChange, attraction, trip }: AddToTimelineModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState<DurationPreset>('1h');

  const addToTimeline = useAddToTimeline();

  // Reset form when modal opens
  useEffect(() => {
    if (open && attraction) {
      const today = todayLocalStr();
      const defaultDate = (today >= trip.start_date && today <= trip.end_date)
        ? today
        : trip.start_date;
      setDate(defaultDate);
      setTime(roundToNext5(new Date()));
      setDuration('1h');
    }
  }, [open, attraction, trip.start_date, trip.end_date]);

  const isDateValid = date >= trip.start_date && date <= trip.end_date;
  const canSubmit = !!date && !!time && isDateValid && !addToTimeline.isPending;

  // Compute ISO start/end
  const { startISO, endISO } = useMemo(() => {
    if (!date || !time) return { startISO: '', endISO: null };
    const start = `${date}T${time}:00`;
    const durationMin = DURATION_MINUTES[duration];
    if (!durationMin) return { startISO: start, endISO: null };
    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);
    const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00`;
    return { startISO: start, endISO: endStr };
  }, [date, time, duration]);

  if (!attraction) return null;

  const handleSubmit = () => {
    if (!canSubmit) return;

    addToTimeline.mutate({
      tripId: trip.id,
      title: attraction.name,
      category: attraction.category || undefined,
      startTime: startISO,
      endTime: endISO,
      locationName: attraction.name,
      address: attraction.locationSummary || null,
      source: 'explore',
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Timeline</DialogTitle>
          <DialogDescription>
            Schedule <strong>{attraction.name}</strong> on your trip
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Attraction info (read-only) */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{attraction.name}</div>
              {attraction.locationSummary && (
                <div className="text-xs text-muted-foreground truncate">{attraction.locationSummary}</div>
              )}
            </div>
            <Badge variant="secondary" className="text-xs shrink-0">{attraction.category}</Badge>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="timeline-date" className="flex items-center gap-1.5 text-sm">
              <Calendar className="w-3.5 h-3.5" />
              Date
            </Label>
            <Input
              id="timeline-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={trip.start_date}
              max={trip.end_date}
            />
          </div>

          {/* Time */}
          <div className="space-y-1.5">
            <Label htmlFor="timeline-time" className="flex items-center gap-1.5 text-sm">
              <Clock className="w-3.5 h-3.5" />
              Time
            </Label>
            <Input
              id="timeline-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          {/* Duration presets */}
          <div className="space-y-1.5">
            <Label className="text-sm">Duration (optional)</Label>
            <div className="flex gap-2 flex-wrap">
              {(['30m', '1h', '2h', '3h', 'none'] as DurationPreset[]).map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={duration === preset ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={() => setDuration(preset)}
                >
                  {preset === 'none' ? 'None' : preset}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {addToTimeline.isPending ? 'Adding…' : 'Add to Timeline'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
