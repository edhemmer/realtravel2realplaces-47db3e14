import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Calendar, Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AcceptShare() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [share, setShare] = useState<any>(null);
  const [trip, setTrip] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      // Redirect to auth with return URL
      navigate(`/auth?redirect=/shared/${token}`);
      return;
    }

    fetchShareAndTrip();
  }, [token, user, authLoading]);

  const fetchShareAndTrip = async () => {
    if (!token) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    try {
      // Fetch the share record
      const { data: shareData, error: shareError } = await supabase
        .from('trip_shares')
        .select('*')
        .eq('share_token', token)
        .maybeSingle();

      if (shareError) throw shareError;
      
      if (!shareData) {
        setError('This share link is invalid or has expired');
        setLoading(false);
        return;
      }

      // Check if already accepted
      if (shareData.accepted_at) {
        toast.info('You already have access to this trip');
        navigate(`/trip/${shareData.trip_id}`);
        return;
      }

      setShare(shareData);

      // Fetch trip details (using service role would be better, but we'll use a function)
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', shareData.trip_id)
        .maybeSingle();

      if (tripError) {
        // Trip might not be visible yet, show basic info
        setTrip({ name: 'Shared Trip', destination_city: 'Unknown', destination_country: '' });
      } else {
        setTrip(tripData);
      }
    } catch (err: any) {
      console.error('Error fetching share:', err);
      setError('Failed to load share details');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!share || !user) return;

    setAccepting(true);
    try {
      const { error } = await supabase
        .from('trip_shares')
        .update({
          accepted_at: new Date().toISOString(),
          shared_with_user_id: user.id,
        })
        .eq('id', share.id);

      if (error) throw error;

      toast.success('Trip shared with you successfully!');
      navigate(`/trip/${share.trip_id}`);
    } catch (err: any) {
      console.error('Error accepting share:', err);
      toast.error('Failed to accept share');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    toast.info('Share invitation declined');
    navigate('/dashboard');
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center py-12">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Share Not Found</h3>
              <p className="text-muted-foreground text-center mb-4">{error}</p>
              <Button asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>You're Invited!</CardTitle>
            <CardDescription>
              Someone wants to share a trip with you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {trip && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h3 className="font-semibold text-lg">{trip.name}</h3>
                {trip.destination_city && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {trip.destination_city}
                    {trip.destination_state && `, ${trip.destination_state}`}
                    {trip.destination_country && `, ${trip.destination_country}`}
                  </p>
                )}
                {trip.start_date && trip.end_date && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(trip.start_date), 'MMM d')} - {format(new Date(trip.end_date), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            )}

            <div className="text-center text-sm text-muted-foreground">
              <p>You'll have <span className="font-medium text-foreground">{share?.permission || 'view'}</span> access to this trip.</p>
              {share?.permission === 'view' && (
                <p className="mt-1">You can see all details but cannot make changes.</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleDecline}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Decline
              </Button>
              <Button
                onClick={handleAccept}
                disabled={accepting}
                className="flex-1 bg-gradient-ocean hover:opacity-90"
              >
                {accepting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Accept
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
