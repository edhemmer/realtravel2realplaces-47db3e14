/**
 * v3.10.9: Vehicle Range Card — optional vehicle profile for fuel intelligence
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Car } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface VehicleRangeCardProps {
  initialMilesPerTank?: number | null;
  initialTankSize?: number | null;
}

export function VehicleRangeCard({ initialMilesPerTank, initialTankSize }: VehicleRangeCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [milesPerTank, setMilesPerTank] = useState(initialMilesPerTank?.toString() ?? '');
  const [tankSize, setTankSize] = useState(initialTankSize?.toString() ?? '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMilesPerTank(initialMilesPerTank?.toString() ?? '');
    setTankSize(initialTankSize?.toString() ?? '');
  }, [initialMilesPerTank, initialTankSize]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const milesVal = milesPerTank.trim() ? parseFloat(milesPerTank) : null;
      const tankVal = tankSize.trim() ? parseFloat(tankSize) : null;

      if (milesVal !== null && (isNaN(milesVal) || milesVal <= 0)) {
        toast.error('Miles per tank must be a positive number.');
        return;
      }
      if (tankVal !== null && (isNaN(tankVal) || tankVal <= 0)) {
        toast.error('Tank size must be a positive number.');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          avg_miles_per_tank: milesVal,
          tank_size_gallons: tankVal,
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Vehicle range saved.');
    } catch (err) {
      console.error('Error saving vehicle range:', err);
      toast.error('Failed to save vehicle range.');
    } finally {
      setIsSaving(false);
    }
  };

  const isDirty =
    (milesPerTank.trim() || '') !== (initialMilesPerTank?.toString() ?? '') ||
    (tankSize.trim() || '') !== (initialTankSize?.toString() ?? '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Car className="w-5 h-5 text-primary" />
          Vehicle Range (Optional)
        </CardTitle>
        <CardDescription>Used to estimate fuel stops on long drives. Optional.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="milesPerTank">Average miles per tank</Label>
            <Input
              id="milesPerTank"
              type="number"
              min="1"
              step="1"
              value={milesPerTank}
              onChange={(e) => setMilesPerTank(e.target.value)}
              placeholder=""
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tankSize">Tank size (gallons)</Label>
            <Input
              id="tankSize"
              type="number"
              min="1"
              step="0.1"
              value={tankSize}
              onChange={(e) => setTankSize(e.target.value)}
              placeholder=""
            />
          </div>
          {isDirty && (
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
