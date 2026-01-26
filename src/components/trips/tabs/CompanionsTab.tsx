import { useState } from 'react';
import { useCompanions, useCreateCompanion, useDeleteCompanion } from '@/hooks/useCompanions';
import { Companion } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Trash2, Users, Mail, Phone } from 'lucide-react';
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

interface CompanionsTabProps {
  tripId: string;
}

export function CompanionsTab({ tripId }: CompanionsTabProps) {
  const { data: companions = [], isLoading } = useCompanions(tripId);
  const createCompanion = useCreateCompanion();
  const deleteCompanion = useDeleteCompanion();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [companionToDelete, setCompanionToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', notes: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createCompanion.mutateAsync({
      trip_id: tripId,
      name: formData.name,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      notes: formData.notes || undefined,
    });
    
    resetForm();
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (companionToDelete) {
      deleteCompanion.mutate({ id: companionToDelete, trip_id: tripId });
      setCompanionToDelete(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Travel Companions</h3>
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-ocean hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Add Companion
        </Button>
      </div>

      {companions.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companions.map((companion: Companion) => (
            <Card key={companion.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="text-lg font-semibold">
                        {companion.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <CardTitle className="text-base">{companion.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setCompanionToDelete(companion.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {companion.email && (
                  <a
                    href={`mailto:${companion.email}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    {companion.email}
                  </a>
                )}
                {companion.phone && (
                  <a
                    href={`tel:${companion.phone}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {companion.phone}
                  </a>
                )}
                {companion.notes && (
                  <p className="text-muted-foreground pt-2 border-t">
                    {companion.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No companions added</p>
            <Button onClick={() => setDialogOpen(true)} variant="link" className="mt-2">
              Add your travel companion
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Companion Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Companion</DialogTitle>
            <DialogDescription>Add someone traveling with you</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jane Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jane@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Dietary restrictions, preferences, etc."
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-gradient-ocean hover:opacity-90" disabled={createCompanion.isPending}>
                {createCompanion.isPending ? 'Adding...' : 'Add Companion'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!companionToDelete} onOpenChange={() => setCompanionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Companion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this companion from the trip?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
