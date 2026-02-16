/**
 * AcceptInvite — Accepts a trip_invite token and creates membership
 * 
 * URL: /invite?token=<plaintext_token>
 * Requires auth. If not logged in, redirects to /auth with return URL.
 * Calls accept_trip_invite RPC which validates token, creates trip_members record.
 */

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, X, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

type AcceptState = 'loading' | 'success' | 'already_member' | 'error';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [state, setState] = useState<AcceptState>('loading');
  const [tripId, setTripId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Redirect to auth, preserving invite URL for return
      navigate(`/auth?redirect=${encodeURIComponent(`/invite?token=${token}`)}`, { replace: true });
      return;
    }

    if (!token) {
      setState('error');
      setErrorMessage('Invalid invite link — no token provided.');
      return;
    }

    acceptInvite(token);
  }, [token, user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const acceptInvite = useCallback(async (inviteToken: string) => {
    try {
      const { data, error } = await supabase.rpc('accept_trip_invite', {
        p_token: inviteToken,
      });

      if (error) {
        // Check for specific error messages
        const msg = error.message || '';
        if (msg.includes('already') || msg.includes('duplicate') || msg.includes('ON CONFLICT')) {
          // User is already a member — treat as success
          setState('already_member');
          return;
        }
        if (msg.includes('expired')) {
          setState('error');
          setErrorMessage('This invite has expired. Please ask the trip owner for a new invite.');
          return;
        }
        if (msg.includes('Invalid')) {
          setState('error');
          setErrorMessage('This invite link is invalid or has already been used.');
          return;
        }
        throw error;
      }

      // RPC returns the trip_id (UUID)
      const resolvedTripId = data as string;
      setTripId(resolvedTripId);
      setState('success');

      // Invalidate queries so My Trips updates
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['shared-trips'] });
      queryClient.invalidateQueries({ queryKey: ['member-trips'] });
    } catch (err: any) {
      console.error('Accept invite error:', err);
      setState('error');
      setErrorMessage(err?.message || 'Failed to accept invite. Please try again.');
    }
  }, [queryClient]);

  if (authLoading || state === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground text-sm">Accepting invite…</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (state === 'error') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center py-12">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Invite Not Valid</h3>
              <p className="text-muted-foreground text-center mb-6">{errorMessage}</p>
              <Button asChild>
                <Link to="/dashboard">Go to My Trips</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Success or already_member
  const isAlready = state === 'already_member';

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {isAlready ? 'Already a Member' : 'Trip Added to Your Trips'}
            </h3>
            <p className="text-muted-foreground text-center mb-6">
              {isAlready
                ? 'You already have access to this trip.'
                : 'You\u2019ve been added as a guest. The trip is now in your My Trips.'}
            </p>
            <div className="flex gap-3 w-full">
              {tripId && (
                <Button
                  onClick={() => navigate(`/trip/${tripId}`)}
                  className="flex-1 bg-gradient-ocean hover:opacity-90"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Open Trip
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex-1"
              >
                Go to My Trips
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
