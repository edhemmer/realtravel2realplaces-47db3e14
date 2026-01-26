import { useState } from 'react';
import { useCompanions, useCreateCompanion, useDeleteCompanion } from '@/hooks/useCompanions';
import { useTrip } from '@/hooks/useTrips';
import { Companion } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Trash2, Users, Mail, Phone, Share2, Link2, Copy, Check, 
  Send, UserPlus, ExternalLink
} from 'lucide-react';
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
import { toast } from 'sonner';

interface CompanionsTabProps {
  tripId: string;
}

export function CompanionsTab({ tripId }: CompanionsTabProps) {
  const { data: companions = [], isLoading } = useCompanions(tripId);
  const { data: trip } = useTrip(tripId);
  const createCompanion = useCreateCompanion();
  const deleteCompanion = useDeleteCompanion();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [companionToDelete, setCompanionToDelete] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  const [shareFormData, setShareFormData] = useState({
    email: '',
    message: '',
  });

  // Generate a share link (for now, just a formatted link to share trip details)
  const shareLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/trip/${tripId}` 
    : '';

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', notes: '' });
  };

  const resetShareForm = () => {
    setShareFormData({ email: '', message: '' });
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

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSending(true);
    
    // For now, open mailto link. In production, this would send an actual email
    const subject = encodeURIComponent(`Join my trip: ${trip?.name || 'Trip'}`);
    const body = encodeURIComponent(
      `Hi!\n\nI'd like to share my trip "${trip?.name}" with you.\n\n` +
      `Destination: ${trip?.destination_city}, ${trip?.destination_country}\n` +
      `Dates: ${trip?.start_date} to ${trip?.end_date}\n\n` +
      (shareFormData.message ? `${shareFormData.message}\n\n` : '') +
      `View trip details: ${shareLink}\n\n` +
      `Looking forward to traveling with you!`
    );
    
    window.open(`mailto:${shareFormData.email}?subject=${subject}&body=${body}`, '_blank');
    
    // Add companion if not already added
    const existingCompanion = companions.find(c => c.email?.toLowerCase() === shareFormData.email.toLowerCase());
    if (!existingCompanion && shareFormData.email) {
      await createCompanion.mutateAsync({
        trip_id: tripId,
        name: shareFormData.email.split('@')[0], // Use email prefix as name
        email: shareFormData.email,
      });
    }
    
    setEmailSending(false);
    resetShareForm();
    setShareDialogOpen(false);
    toast.success('Invitation ready to send!');
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Travel Companions</h3>
          <p className="text-sm text-muted-foreground">
            {companions.length === 0 
              ? 'Add people traveling with you' 
              : `${companions.length} companion${companions.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShareDialogOpen(true)} variant="outline">
            <Share2 className="w-4 h-4 mr-2" />
            Share Trip
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="bg-gradient-ocean hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            Add Companion
          </Button>
        </div>
      </div>

      {/* Share Trip Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" />
            Share This Trip
          </CardTitle>
          <CardDescription>
            Invite companions via email or share a link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 p-2 bg-background rounded-lg border">
              <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground truncate flex-1">{shareLink}</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={copyShareLink} variant="outline" size="sm">
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button onClick={() => setShareDialogOpen(true)} size="sm">
                <Mail className="w-4 h-4 mr-1" />
                Email Invite
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Companions Grid */}
      {companions.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companions.map((companion: Companion) => (
            <Card key={companion.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-ocean flex items-center justify-center text-white font-semibold">
                      {companion.name.charAt(0).toUpperCase()}
                    </div>
                    <CardTitle className="text-base">{companion.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive transition-opacity"
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
                    <span className="truncate">{companion.email}</span>
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
                  <p className="text-muted-foreground pt-2 border-t text-xs">
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
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h4 className="text-lg font-medium mb-1">No companions added</h4>
            <p className="text-muted-foreground text-sm text-center max-w-sm mb-4">
              Add people traveling with you to keep everyone organized
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setDialogOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Companion
              </Button>
              <Button onClick={() => setShareDialogOpen(true)} variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                Share Trip
              </Button>
            </div>
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

      {/* Share Trip Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={(open) => { if (!open) resetShareForm(); setShareDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Trip</DialogTitle>
            <DialogDescription>
              Invite someone to view your trip details
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">
                <Mail className="w-4 h-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="link">
                <Link2 className="w-4 h-4 mr-2" />
                Link
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="email" className="space-y-4 pt-4">
              <form onSubmit={handleEmailInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    value={shareFormData.email}
                    onChange={(e) => setShareFormData({ ...shareFormData, email: e.target.value })}
                    placeholder="friend@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Personal Message (optional)</Label>
                  <Textarea
                    value={shareFormData.message}
                    onChange={(e) => setShareFormData({ ...shareFormData, message: e.target.value })}
                    placeholder="Can't wait to travel with you!"
                    rows={2}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={emailSending}>
                  <Send className="w-4 h-4 mr-2" />
                  {emailSending ? 'Preparing...' : 'Send Email Invitation'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="link" className="space-y-4 pt-4">
              <div className="space-y-3">
                <Label>Share Link</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground truncate flex-1">{shareLink}</span>
                </div>
                <Button onClick={copyShareLink} className="w-full" variant="outline">
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copied to Clipboard!' : 'Copy Link'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Anyone with this link can view your trip details
                </p>
              </div>
            </TabsContent>
          </Tabs>
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
