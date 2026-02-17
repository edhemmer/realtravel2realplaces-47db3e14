import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserProfile {
  id: string;
  user_id: string;
  display_name?: string | null;
  default_tsa_precheck?: string | null;
  default_frequent_flyer?: string | null;
  subscription_tier: 'free' | 'pro' | 'business';
  subscription_started_at?: string | null;
  lifetime_trip_count: number;
  preferred_home_airport?: string | null;
  preferred_currency?: string | null;
  preferred_datetime_format?: string | null;
  distance_unit?: 'miles' | 'kilometers' | null;
  temperature_unit?: 'fahrenheit' | 'celsius' | null;
  /** Patch 2.1.18: Flag indicating user has completed initial onboarding */
  has_completed_onboarding?: boolean;
  /** v3.10.9: Vehicle range for fuel intelligence */
  avg_miles_per_tank?: number | null;
  tank_size_gallons?: number | null;
}

/**
 * Hook to fetch the current user's profile including travel preferences
 */
export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }

      return data as UserProfile | null;
    },
    enabled: !!user,
    staleTime: 30000,
  });
}
