import { useState, useEffect } from 'react';
import { useTripNotes, useUpsertTripNotes } from '@/hooks/useTripNotes';
import { useTrip } from '@/hooks/useTrips';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, Phone, Link, Save } from 'lucide-react';
import { useTripPermission } from '@/pages/TripDetail';
import { AppModuleHeader } from '@/components/trips/AppModuleHeader';
import { ModuleOperatingBrief } from '@/components/trips/ModuleOperatingBrief';

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
      <AppModuleHeader
        icon={FileText}
        eyebrow="Trip memory"
        title="Notes & Safety"
        description="Keep emergency numbers, important links, and trip notes attached to the trip record."
        status={hasChanges ? 'Unsaved changes' : 'Saved'}
        statusTone={hasChanges ? 'setup' : 'neutral'}
      >
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
      </AppModuleHeader>
      <ModuleOperatingBrief
        items={[
          {
            icon: FileText,
            label: 'Trip memory',
            value: formData.general_notes.trim() ? 'Notes saved' : 'No notes yet',
            detail: 'Keep the odd details here so they do not live in screenshots or memory.',
            tone: formData.general_notes.trim() ? 'ready' : 'setup',
          },
          {
            icon: Phone,
            label: 'Emergency',
            value: formData.emergency_numbers.trim() ? 'Numbers stored' : 'Needs contacts',
            detail: 'Add hotel, local emergency, roadside, embassy, or family contacts.',
            tone: formData.emergency_numbers.trim() ? 'ready' : 'setup',
          },
          {
            icon: Link,
            label: 'Links',
            value: formData.important_links.trim() ? 'Links stored' : 'No links yet',
            detail: hasChanges ? 'Save changes before leaving this module.' : 'Important URLs stay attached to the trip.',
            tone: hasChanges ? 'watch' : 'neutral',
          },
        ]}
      />

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
