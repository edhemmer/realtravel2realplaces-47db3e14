import { Layout } from '@/components/Layout';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Plans() {
  const navigate = useNavigate();
  const { data: subscription, isLoading } = useSubscription();
  const currentTier = subscription?.tier || 'free';
  const currentPlanName = currentTier.charAt(0).toUpperCase() + currentTier.slice(1);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your plan</h1>
            <p className="text-muted-foreground">Account plan status</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isLoading ? 'Loading plan…' : `${currentPlanName} plan`}</CardTitle>
            <CardDescription>
              This page shows the plan currently attached to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                RT2RP is not presenting paid plan options until their features, billing, support, and account workflows are ready for users.
              </p>
            </div>

            <Button variant="outline" onClick={() => navigate('/account')}>
              Back to Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
