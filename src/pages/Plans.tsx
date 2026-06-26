import { useState } from 'react';
import { isNativeIOS } from '@/lib/native/platform';
import { Layout } from '@/components/Layout';
import { useSubscription } from '@/hooks/useSubscription';
import { useIsAdmin } from '@/hooks/useAdminUsers';
import { useUpgradeIntent } from '@/hooks/useUpgradeIntent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Check, Crown, Briefcase, User, Sparkles, ArrowLeft, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PlanCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  features: PlanFeature[];
  isCurrent: boolean;
  requiresAccessRequest?: boolean;
  onUpgradeClick?: () => void;
  accentClass?: string;
}

function PlanCard({ 
  name, 
  description, 
  icon, 
  features, 
  isCurrent, 
  requiresAccessRequest,
  onUpgradeClick,
  accentClass = ''
}: PlanCardProps) {
  return (
    <Card className={`relative ${isCurrent ? 'ring-2 ring-primary' : ''} ${accentClass}`}>
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">Current Plan</Badge>
        </div>
      )}
      <CardHeader className="text-center pt-8">
        <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <CardTitle className="text-xl">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <Check className={`w-4 h-4 mt-0.5 shrink-0 ${feature.included ? 'text-primary' : 'text-muted-foreground/50'}`} />
              <span className={feature.included ? 'text-foreground' : 'text-muted-foreground/50 line-through'}>
                {feature.text}
              </span>
            </li>
          ))}
        </ul>
        
        {!isCurrent && (
          <Button 
            className="w-full" 
            variant={requiresAccessRequest ? 'outline' : 'default'}
            onClick={onUpgradeClick}
          >
            {requiresAccessRequest ? 'Request Access' : 'Upgrade'}
          </Button>
        )}
        {isCurrent && (
          <div className="text-center text-sm text-muted-foreground py-2">
            You're on this plan
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Plans() {
  const navigate = useNavigate();
  const { data: subscription, isLoading } = useSubscription();
  const { data: isAdmin } = useIsAdmin();
  const { trackUpgradeIntent } = useUpgradeIntent();
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  const currentTier = subscription?.tier || 'free';

  const freePlanFeatures: PlanFeature[] = [
    { text: 'Up to 2 lifetime trips', included: true },
    { text: 'Flights, stays & car rentals', included: true },
    { text: 'Basic trip timeline', included: true },
    { text: 'Trip-level expense tracking', included: true },
    { text: 'Packing lists', included: true },
    { text: 'Companion management', included: true },
    { text: 'Explore tab & discovery', included: false },
    { text: 'Advanced cost summaries', included: false },
    { text: 'Trip health & gap analysis', included: false },
  ];

  const proPlanFeatures: PlanFeature[] = [
    { text: 'Unlimited trips', included: true },
    { text: 'Everything in Free', included: true },
    { text: 'TravelOps command center, Explore, and discovery', included: true },
    { text: 'Drive Cockpit with road-trip operations', included: true },
    { text: 'Airport, transit, weather, and offline travel windows', included: true },
    { text: 'Full timeline with events', included: true },
    { text: 'Advanced cost summaries', included: true },
    { text: 'Trip health, gap analysis, and next-action flow', included: true },
    { text: 'Parking expiration alerts', included: true },
    { text: 'Priority support', included: true },
  ];

  const businessPlanFeatures: PlanFeature[] = [
    { text: 'Everything in Pro', included: true },
    { text: 'Business expense reporting', included: true },
    { text: 'Multi-stop itineraries', included: true },
    { text: 'Team collaboration', included: true },
    { text: 'Export & integrations', included: true },
    { text: 'Dedicated support', included: true },
  ];

  // App Store guideline: this is a web SaaS. Inside the iOS app we don't
  // present plan tiers or pricing — direct users to manage their plan on the web.
  if (isNativeIOS()) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Your plan</h1>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Plan management</CardTitle>
              <CardDescription>
                Your current plan and trip usage are shown on the Account screen.
                Plans are managed on our website.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate('/account')}>
                Back to Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
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
            <h1 className="text-2xl font-bold text-foreground">Plans</h1>
            <p className="text-muted-foreground">
              Choose the plan that fits your travel needs
            </p>
          </div>
        </div>

        {/* Admin/Developer Note */}
        {isAdmin && (
          <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Developer Note:</span> You have admin access. 
            Plan changes for users can be made from the{' '}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/admin/plans')}>
              Admin → Plans
            </Button>{' '}
            dashboard.
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pt-8">
                  <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-muted" />
                  <div className="h-6 bg-muted rounded mx-auto w-20" />
                  <div className="h-4 bg-muted rounded mx-auto w-32 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="h-4 bg-muted rounded w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Free Plan */}
            <PlanCard
              name="Free"
              description="Get started with essential trip management"
              icon={<User className="w-6 h-6 text-primary" />}
              features={freePlanFeatures}
              isCurrent={currentTier === 'free'}
            />

            {/* Pro Plan */}
            <PlanCard
              name="Pro"
              description="For power travelers who want it all"
              icon={<Crown className="w-6 h-6 text-primary" />}
              features={proPlanFeatures}
              isCurrent={currentTier === 'pro'}
              onUpgradeClick={() => setUpgradeDialogOpen(true)}
            />

            {/* Business Plan */}
            <PlanCard
              name="Business"
              description="Advanced features for business travel"
              icon={<Briefcase className="w-6 h-6 text-primary" />}
              features={businessPlanFeatures}
              isCurrent={false}
              requiresAccessRequest
              onUpgradeClick={() => setUpgradeDialogOpen(true)}
            />
          </div>
        )}

        {/* Footer Note */}
        <div className="text-center text-sm text-muted-foreground py-4">
          <Sparkles className="w-4 h-4 inline-block mr-1" />
          Start free, then request paid access when your travel operations need more capacity.
        </div>
      </div>

      {/* Upgrade request dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Request plan access
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-3">
              <p>
                RT2RP is approving paid plan access in a controlled rollout so account, support,
                and travel operations stay reliable.
              </p>
              <p>
                Send your request and we&apos;ll follow up with the right plan path for your travel needs.
              </p>
            </DialogDescription>
          </DialogHeader>
          
          {/* Disabled upgrade action with explanation - v2.6.5: tracks intent on click */}
          <div className="pt-2 space-y-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button 
                      className="w-full opacity-50 cursor-not-allowed"
                      onClick={() => trackUpgradeIntent('pro', 'plans_page')}
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Request Pro Access
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p>We&apos;ll record your request and follow up with plan access.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
              <Info className="w-3 h-3" />
              Controlled rollout for paid access
            </p>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
