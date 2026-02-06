/**
 * Patch 2.1.17: Modal for adding an attraction to a trip
 */

import { useState, useEffect } from 'react';
import { AttractionSuggestion } from '@/types/attraction';
import { Trip } from '@/types/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Ticket, AlertCircle } from 'lucide-react';
import { format, subDays, parseISO, isValid } from 'date-fns';
import { useCreateActivityFromExplore } from '@/hooks/useActivityBooking';

interface AddToTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attraction: AttractionSuggestion | null;
  trip: Trip;
}

type ReminderOption = '30_days' | '14_days' | '7_days' | 'custom';

export function AddToTripModal({ open, onOpenChange, attraction, trip }: AddToTripModalProps) {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedReminders, setSelectedReminders] = useState<ReminderOption[]>([]);
  const [customReminderDate, setCustomReminderDate] = useState('');
  
  const createActivity = useCreateActivityFromExplore();

  // Reset form when modal opens
  useEffect(() => {
    if (open && attraction) {
      // Default to trip start date
      setDate(trip.start_date);
      setStartTime('');
      setNotes('');
      // Pre-select 14 days reminder if ticket required
      if (attraction.bookingInfo.ticketRequired || attraction.bookingInfo.advanceRecommended) {
        setSelectedReminders(['14_days']);
      } else {
        setSelectedReminders([]);
      }
      setCustomReminderDate('');
    }
  }, [open, attraction, trip.start_date]);

  if (!attraction) return null;

  const showTicketReminders = attraction.bookingInfo.ticketRequired || attraction.bookingInfo.advanceRecommended;

  const toggleReminder = (option: ReminderOption) => {
    setSelectedReminders(prev => 
      prev.includes(option) 
        ? prev.filter(r => r !== option)
        : [...prev, option]
    );
  };

  const calculateReminderDates = (): string[] => {
    if (!date) return [];
    
    const activityDate = parseISO(date);
    if (!isValid(activityDate)) return [];
    
    const dates: string[] = [];
    
    for (const reminder of selectedReminders) {
      let reminderDate: Date | null = null;
      
      switch (reminder) {
        case '30_days':
          reminderDate = subDays(activityDate, 30);
          break;
        case '14_days':
          reminderDate = subDays(activityDate, 14);
          break;
        case '7_days':
          reminderDate = subDays(activityDate, 7);
          break;
        case 'custom':
          if (customReminderDate) {
            reminderDate = parseISO(customReminderDate);
          }
          break;
      }
      
      if (reminderDate && isValid(reminderDate)) {
        // Only add if the reminder date is in the future
        if (reminderDate > new Date()) {
          dates.push(format(reminderDate, 'yyyy-MM-dd'));
        }
      }
    }
    
    return dates;
  };

  const handleSubmit = () => {
    if (!date) return;

    const reminderDates = calculateReminderDates();

    createActivity.mutate({
      tripId: trip.id,
      attractionId: attraction.id,
      attractionName: attraction.name,
      date,
      startTime: startTime || undefined,
      notes: notes || undefined,
      ticketRequired: attraction.bookingInfo.ticketRequired,
      advanceRecommended: attraction.bookingInfo.advanceRecommended,
      bookingPattern: attraction.bookingInfo.bookingPattern,
      bookingUrl: attraction.bookingInfo.officialBookingUrl || attraction.websiteUrl,
      locationSummary: attraction.locationSummary,
      reminders: reminderDates,
    }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  // Validate date is within trip range
  const isDateValid = () => {
    if (!date) return false;
    return date >= trip.start_date && date <= trip.end_date;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Add to Trip</span>
          </DialogTitle>
          <DialogDescription>
            Add <strong>{attraction.name}</strong> to your trip
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Attraction name (read-only) */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <div className="font-medium">{attraction.name}</div>
              <div className="text-sm text-muted-foreground">{attraction.locationSummary}</div>
            </div>
            <Badge variant="secondary">{attraction.category}</Badge>
          </div>

          {/* Date picker */}
          <div className="space-y-2">
            <Label htmlFor="activity-date" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date
            </Label>
            <Input
              id="activity-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={trip.start_date}
              max={trip.end_date}
            />
            {date && !isDateValid() && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Date must be within your trip dates ({trip.start_date} to {trip.end_date})
              </p>
            )}
          </div>

          {/* Time picker */}
          <div className="space-y-2">
            <Label htmlFor="activity-time" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Start time (optional)
            </Label>
            <Input
              id="activity-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="activity-notes">Notes (optional)</Label>
            <Textarea
              id="activity-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special notes for this activity..."
              rows={2}
            />
          </div>

          {/* Ticket reminders section */}
          {showTicketReminders && (
            <div className="space-y-3 p-3 border rounded-lg bg-accent/50">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Ticket className="w-4 h-4 text-primary" />
                <span>Remind me to get tickets</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="reminder-30"
                    checked={selectedReminders.includes('30_days')}
                    onCheckedChange={() => toggleReminder('30_days')}
                  />
                  <Label htmlFor="reminder-30" className="text-sm font-normal cursor-pointer">
                    30 days before
                  </Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="reminder-14"
                    checked={selectedReminders.includes('14_days')}
                    onCheckedChange={() => toggleReminder('14_days')}
                  />
                  <Label htmlFor="reminder-14" className="text-sm font-normal cursor-pointer">
                    14 days before
                  </Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="reminder-7"
                    checked={selectedReminders.includes('7_days')}
                    onCheckedChange={() => toggleReminder('7_days')}
                  />
                  <Label htmlFor="reminder-7" className="text-sm font-normal cursor-pointer">
                    7 days before
                  </Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="reminder-custom"
                    checked={selectedReminders.includes('custom')}
                    onCheckedChange={() => toggleReminder('custom')}
                  />
                  <Label htmlFor="reminder-custom" className="text-sm font-normal cursor-pointer">
                    Custom date
                  </Label>
                  {selectedReminders.includes('custom') && (
                    <Input
                      type="date"
                      value={customReminderDate}
                      onChange={(e) => setCustomReminderDate(e.target.value)}
                      className="w-auto h-8 text-sm"
                      max={date}
                    />
                  )}
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                We'll email you a reminder to get tickets before your visit. We can't guarantee tickets will still be available.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!date || !isDateValid() || createActivity.isPending}
          >
            {createActivity.isPending ? 'Adding...' : 'Save and continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
