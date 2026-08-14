import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

interface UpgradePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlan?: 'pro' | 'business';
  entryPoint?: string;
}

export function UpgradePlanDialog({ open, onOpenChange }: UpgradePlanDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            Paid plans are not available yet
          </DialogTitle>
          <DialogDescription>
            RT2RP is currently offering the Free plan. Paid plan options will not be shown until their features and account workflows are ready for users.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
