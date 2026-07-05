import { useQuery } from '@tanstack/react-query';
import { supabase, supabaseConfig } from '@/integrations/supabase/client';

export interface ConnectionHealth {
  supabaseConfig: 'connected' | 'missing';
  authSession: 'connected' | 'anonymous' | 'error';
  database: 'connected' | 'error' | 'skipped';
  missingKeys: string[];
  errorMessage?: string;
}

export function useConnectionHealth(enabled = true) {
  return useQuery<ConnectionHealth>({
    queryKey: ['connection-health'],
    queryFn: async () => {
      if (!supabaseConfig.hasConfig) {
        return {
          supabaseConfig: 'missing',
          authSession: 'error',
          database: 'skipped',
          missingKeys: supabaseConfig.missingKeys,
          errorMessage: `Missing ${supabaseConfig.missingKeys.join(', ')}`,
        };
      }

      const sessionResult = await supabase.auth.getSession();
      if (sessionResult.error) {
        return {
          supabaseConfig: 'connected',
          authSession: 'error',
          database: 'skipped',
          missingKeys: [],
          errorMessage: sessionResult.error.message,
        };
      }

      if (!sessionResult.data.session) {
        return {
          supabaseConfig: 'connected',
          authSession: 'anonymous',
          database: 'skipped',
          missingKeys: [],
        };
      }

      const { error } = await supabase
        .from('trips')
        .select('id', { count: 'exact', head: true })
        .limit(1);

      return {
        supabaseConfig: 'connected',
        authSession: 'connected',
        database: error ? 'error' : 'connected',
        missingKeys: [],
        errorMessage: error?.message,
      };
    },
    enabled,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}
