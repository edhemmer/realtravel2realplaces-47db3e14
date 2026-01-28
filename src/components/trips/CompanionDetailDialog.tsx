import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Companion, Trip } from '@/types/database';
import { useUpdateCompanion } from '@/hooks/useCompanions';
import { toast } from 'sonner';
import { Mail, Save, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CompanionDetailDialogProps {
  companion: Companion | null;
  trip: Trip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
}

export function CompanionDetailDialog({ 
  companion, 
  trip, 
  open, 
  onOpenChange,
  canEdit 
}: CompanionDetailDialogProps) {
  const updateCompanion = useUpdateCompanion();
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    tsa_precheck_number: '',
    frequent_flyer_number: '',
    flight_number: '',
    seat_number: '',
    portion_owed: '',
  });

  // Reset form when companion changes
  useEffect(() => {
    if (companion) {
      setFormData({
        name: companion.name || '',
        email: companion.email || '',
        tsa_precheck_number: companion.tsa_precheck_number || '',
        frequent_flyer_number: companion.frequent_flyer_number || '',
        flight_number: companion.flight_number || '',
        seat_number: companion.seat_number || '',
        portion_owed: companion.portion_owed?.toString() || '',
      });
    }
  }, [companion]);

  const handleSave = async () => {
    if (!companion) return;
    
    try {
      await updateCompanion.mutateAsync({
        id: companion.id,
        trip_id: companion.trip_id,
        name: formData.name,
        email: formData.email || null,
        tsa_precheck_number: formData.tsa_precheck_number || null,
        frequent_flyer_number: formData.frequent_flyer_number || null,
        flight_number: formData.flight_number || null,
        seat_number: formData.seat_number || null,
        portion_owed: formData.portion_owed ? parseFloat(formData.portion_owed) : null,
      });
      onOpenChange(false);
    } catch (error) {
      // Error toast handled by hook
    }
  };

  const handleSendEmail = async () => {
    if (!companion || !trip) return;
    
    if (!formData.email) {
      toast.error('Please enter an email address first');
      return;
    }

    setIsSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-companion-summary', {
        body: {
          companionName: formData.name,
          companionEmail: formData.email,
          tripName: trip.name,
          flightNumber: formData.flight_number || null,
          seatNumber: formData.seat_number || null,
          tsaNumber: formData.tsa_precheck_number || null,
          frequentFlyerNumber: formData.frequent_flyer_number || null,
          portionOwed: formData.portion_owed ? parseFloat(formData.portion_owed) : null,
        },
      });

      if (error) {
        console.error('Email error:', error);
        toast.error('Failed to send email. Please try again.');
        return;
      }

      if (data?.success) {
        toast.success(`Summary sent to ${formData.email}!`);
      } else {
        toast.error(data?.message || 'Failed to send email');
      }
    } catch (err) {
      console.error('Email error:', err);
      toast.error('Failed to send email. Please try again.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!companion) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Traveler Details</DialogTitle>
          <DialogDescription>
            View and edit details for {companion.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Full name"
              required
              disabled={!canEdit}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
              disabled={!canEdit}
            />
          </div>

          {/* TSA & Frequent Flyer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tsa">TSA Known Traveler #</Label>
              <Input
                id="tsa"
                value={formData.tsa_precheck_number}
                onChange={(e) => setFormData({ ...formData, tsa_precheck_number: e.target.value })}
                placeholder="123456789"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ff">Frequent Flyer #</Label>
              <Input
                id="ff"
                value={formData.frequent_flyer_number}
                onChange={(e) => setFormData({ ...formData, frequent_flyer_number: e.target.value })}
                placeholder="FF123456"
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Flight & Seat */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="flight">Flight Number</Label>
              <Input
                id="flight"
                value={formData.flight_number}
                onChange={(e) => setFormData({ ...formData, flight_number: e.target.value })}
                placeholder="UA1234"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seat">Seat Number</Label>
              <Input
                id="seat"
                value={formData.seat_number}
                onChange={(e) => setFormData({ ...formData, seat_number: e.target.value })}
                placeholder="12A"
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Portion Owed */}
          <div className="space-y-2">
            <Label htmlFor="portion">Portion / Amount Owed ($)</Label>
            <Input
              id="portion"
              type="number"
              step="0.01"
              value={formData.portion_owed}
              onChange={(e) => setFormData({ ...formData, portion_owed: e.target.value })}
              placeholder="0.00"
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">
              Optional: Their share of trip expenses
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-4 border-t">
            {canEdit && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 bg-gradient-ocean hover:opacity-90"
                  disabled={updateCompanion.isPending || !formData.name}
                >
                  {updateCompanion.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
            
            <Button
              type="button"
              variant="secondary"
              onClick={handleSendEmail}
              disabled={!formData.email || isSendingEmail}
              className="w-full"
            >
              {isSendingEmail ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              {isSendingEmail ? 'Sending...' : 'Email Summary to Traveler'}
            </Button>
            {!formData.email && (
              <p className="text-xs text-muted-foreground text-center">
                Add an email address to send a summary
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}