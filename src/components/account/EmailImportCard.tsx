import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Inbox, Copy, Check, RefreshCw, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function EmailImportCard() {
  const { user } = useAuth();
  const { isPro, isLoading: accessLoading } = useAccess();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: ingestionAddress, isLoading } = useQuery({
    queryKey: ['email-ingestion-address', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('email_ingestion_addresses')
        .select('id, ingestion_address, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching ingestion address:', error);
        throw error;
      }
      return data;
    },
    enabled: !!user && isPro,
    staleTime: 60000,
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      if (!user || !ingestionAddress) throw new Error('No address to regenerate');

      // Deactivate current address
      const { error: deactivateError } = await supabase
        .from('email_ingestion_addresses')
        .update({ is_active: false })
        .eq('id', ingestionAddress.id);

      if (deactivateError) throw deactivateError;

      // The trigger auto_create_ingestion_address fires on profile insert only.
      // For regeneration, we create a new row manually with a new hash.
      const hash = Array.from(crypto.getRandomValues(new Uint8Array(6)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const newAddress = `u_${hash}@ingest.realtravel2realplaces.app`;

      const { error: insertError } = await supabase
        .from('email_ingestion_addresses')
        .insert({
          user_id: user.id,
          ingestion_hash: hash,
          ingestion_address: newAddress,
          is_active: true,
        } as any);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-ingestion-address'] });
      toast.success('New import address generated. The old address is now inactive.');
    },
    onError: (err: any) => {
      console.error('Regenerate error:', err);
      toast.error('Failed to regenerate address. Please try again.');
    },
  });

  const handleCopy = async () => {
    if (!ingestionAddress?.ingestion_address) return;
    try {
      await navigator.clipboard.writeText(ingestionAddress.ingestion_address);
      setCopied(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy. Please select and copy manually.');
    }
  };

  const address = ingestionAddress?.ingestion_address;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Inbox className="w-5 h-5 text-primary" />
          Email Import
          {!isPro && !accessLoading && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" />
              Pro
            </span>
          )}
        </CardTitle>
        <CardDescription>
          {isPro
            ? 'Forward booking confirmations to your unique address below to import them automatically.'
            : 'Upgrade to Pro to forward booking confirmations via email and import them automatically.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isPro ? (
          <p className="text-sm text-muted-foreground">
            Email import is available on Pro and Business plans.
          </p>
        ) : isLoading ? (
          <div className="animate-pulse h-12 bg-muted rounded-lg" />
        ) : address ? (
          <div className="space-y-4">
            {/* Address display */}
            <div className="bg-muted rounded-lg px-3 py-3 font-mono text-sm text-foreground break-all select-all">
              {address}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="default"
                className="flex-1 gap-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    disabled={regenerateMutation.isPending}
                  >
                    <RefreshCw className={`w-4 h-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
                    Regenerate Address
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Regenerate import address?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your current address will stop working immediately. Any emails sent to the old address will be ignored. You'll need to update your email contacts with the new address.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => regenerateMutation.mutate()}>
                      Regenerate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Helper text */}
            <p className="text-xs text-muted-foreground">
              Save this address in your email contacts for easy forwarding.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No import address found. Please contact support.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
