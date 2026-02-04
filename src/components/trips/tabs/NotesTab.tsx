import { useState, useEffect } from 'react';
import { useTripNotes, useUpsertTripNotes } from '@/hooks/useTripNotes';
import { useTrip } from '@/hooks/useTrips';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, Phone, Link, Save } from 'lucide-react';
import { useTripPermission } from '@/pages/TripDetail';

interface NotesTabProps {
  tripId: string;
}

export function NotesTab({ tripId }: NotesTabProps) {
  const { canEdit } = useTripPermission();
  const { data: notes, isLoading } = useTripNotes(tripId);
  const { data: trip } = useTrip(tripId);
  const upsertNotes = useUpsertTripNotes();

  const [formData, setFormData] = useState({
    general_notes: '',
    emergency_numbers: '',
    important_links: '',
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (notes) {
      setFormData({
        general_notes: notes.general_notes || '',
        emergency_numbers: notes.emergency_numbers || '',
        important_links: notes.important_links || '',
      });
    }
  }, [notes]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await upsertNotes.mutateAsync({
      trip_id: tripId,
      ...formData,
    });
    setHasChanges(false);
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header v1.3.2 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-semibold">Notes & Safety</h3>
        {canEdit && (
          <Button
            onClick={handleSave}
            disabled={!hasChanges || upsertNotes.isPending}
            className="bg-gradient-ocean hover:opacity-90"
          >
            <Save className="w-4 h-4 mr-2" />
            {upsertNotes.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        {/* General Notes */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">General Notes</CardTitle>
            </div>
            <CardDescription>
              Trip reminders, to-dos, and general information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.general_notes}
              onChange={(e) => handleChange('general_notes', e.target.value)}
              placeholder="Add any notes about your trip..."
              rows={6}
              className="resize-none"
              disabled={!canEdit}
            />
          </CardContent>
        </Card>

        {/* Emergency Numbers */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Emergency Numbers</CardTitle>
            </div>
            <CardDescription>
              Local emergency services, embassy, hotel, etc.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.emergency_numbers}
              onChange={(e) => handleChange('emergency_numbers', e.target.value)}
              placeholder="Emergency contacts and phone numbers"
              rows={4}
              className="resize-none font-mono text-sm"
              disabled={!canEdit}
            />
          </CardContent>
        </Card>

        {/* Important Links */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Link className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Important Links</CardTitle>
            </div>
            <CardDescription>
              Travel guides, restaurant reservations, activity bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.important_links}
              onChange={(e) => handleChange('important_links', e.target.value)}
              placeholder="Paste your important URLs here"
              rows={4}
              className="resize-none font-mono text-sm"
              disabled={!canEdit}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
