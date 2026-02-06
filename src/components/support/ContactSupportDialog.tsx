import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface ContactSupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// App version constant - update as needed
const APP_VERSION = '2.1.25';

export function ContactSupportDialog({ open, onOpenChange }: ContactSupportDialogProps) {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please sign in to contact support.",
        variant: "destructive",
      });
      return;
    }

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedSubject || !trimmedMessage) {
      toast({
        title: "Missing information",
        description: "Please fill in both the subject and message.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user.id,
        email: user.email || '',
        subject: trimmedSubject,
        message: trimmedMessage,
        status: 'open',
        app_version: APP_VERSION,
      });

      if (error) {
        console.error('Failed to submit support ticket:', error);
        toast({
          title: "Couldn't send message",
          description: "We couldn't send your message. Please try again in a moment.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Message sent",
        description: "Thanks, your message has been sent. We'll review it soon.",
      });

      // Reset form and close
      setSubject('');
      setMessage('');
      onOpenChange(false);
    } catch (err) {
      console.error('Support ticket submission error:', err);
      toast({
        title: "Couldn't send message",
        description: "We couldn't send your message. Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setSubject('');
      setMessage('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact support</DialogTitle>
          <DialogDescription>
            Let us know what's going on and we'll get back to you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="support-subject">Subject</Label>
            <Input
              id="support-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder=""
              maxLength={200}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-message">What's going wrong?</Label>
            <Textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder=""
              rows={5}
              maxLength={5000}
              required
              disabled={isSubmitting}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Include what you were trying to do and what you expected to see.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send message'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
