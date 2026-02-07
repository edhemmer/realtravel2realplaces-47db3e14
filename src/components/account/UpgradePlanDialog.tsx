/**
 * UpgradePlanDialog.tsx
 * 
 * Informational dialog for upgrade path. Billing is intentionally disabled.
 * This component explains available plans without collecting payment details.
 * 
 * v2.6.4: Initial implementation with disabled billing state
 * v2.6.5: Added upgrade intent tracking on button clicks
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Crown, Briefcase, Sparkles, Info } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useUpgradeIntent, type UpgradeEntryPoint } from '@/hooks/useUpgradeIntent';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UpgradePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which plan tab to show by default */
  defaultPlan?: 'pro' | 'business';
  /** Where this dialog was opened from (for intent tracking) */
  entryPoint?: UpgradeEntryPoint;
}

const proFeatures = [
  'Unlimited trips',
  'Explore tab & local discovery',
  'Full timeline with events',
  'Advanced cost summaries',
  'Trip health & gap analysis',
  'Parking expiration alerts',
  'Priority support',
];

const businessFeatures = [
  'Everything in Pro',
  'Business expense reporting',
  'Multi-stop itineraries (Tour tab)',
  'Stop-level expense assignment',
  'PDF & CSV report exports',
  'Dedicated support',
];

export function UpgradePlanDialog({ 
  open, 
  onOpenChange, 
  defaultPlan = 'pro',
  entryPoint = 'account_page'
}: UpgradePlanDialogProps) {
  const { data: subscription } = useSubscription();
  const { trackUpgradeIntent } = useUpgradeIntent();
  const currentTier = subscription?.tier || 'free';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription>
            Unlock advanced features to manage your travel more effectively.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultPlan} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pro" className="gap-1.5">
              <Crown className="w-4 h-4" />
              Pro
            </TabsTrigger>
            <TabsTrigger value="business" className="gap-1.5">
              <Briefcase className="w-4 h-4" />
              Business
            </TabsTrigger>
          </TabsList>

          {/* Pro Plan Tab */}
          <TabsContent value="pro" className="space-y-4 mt-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">Pro Plan</h3>
                {currentTier === 'pro' && (
                  <Badge variant="secondary" className="text-xs">Current</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                For power travelers who want full control and insights.
              </p>
            </div>

            <ul className="space-y-2">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {currentTier !== 'pro' && (
              <div className="pt-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        {/* 
                          v2.6.5: Track intent when disabled button is clicked
                          Button is visually disabled but onClick still fires for tracking
                        */}
                        <Button 
                          className="w-full opacity-50 cursor-not-allowed" 
                          aria-describedby="billing-note"
                          onClick={() => trackUpgradeIntent('pro', entryPoint)}
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          Upgrade to Pro
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p>Billing is not active yet. Upgrades will be available soon.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </TabsContent>

          {/* Business Plan Tab */}
          <TabsContent value="business" className="space-y-4 mt-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">Business Plan</h3>
                <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Advanced features for business travel and expense management.
              </p>
            </div>

            <ul className="space-y-2">
              {businessFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      {/* 
                        v2.6.5: Track intent when disabled button is clicked
                        Button is visually disabled but onClick still fires for tracking
                      */}
                      <Button 
                        className="w-full opacity-50 cursor-not-allowed" 
                        aria-describedby="billing-note"
                        onClick={() => trackUpgradeIntent('business', entryPoint)}
                      >
                        <Briefcase className="w-4 h-4 mr-2" />
                        Upgrade to Business
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>Business plan is coming soon. Billing is not active yet.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </TabsContent>
        </Tabs>

        {/* Billing Status Note */}
        <div 
          id="billing-note"
          className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground mt-2"
        >
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            Upgrades will be available soon. Billing is not active yet. 
            Continue using the app and we'll notify you when plans are ready.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
