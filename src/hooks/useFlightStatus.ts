import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type FlightStatusKind = 'delay' | 'gate_change' | 'cancellation';

export interface FlightStatusSignal {
  type: FlightStatusKind;
  flightNumber: string;
  confidence: 'high' | 'low';
}

export interface FlightStatusResult {
  signal: FlightStatusSignal | null;
  provider?: string;
  providerConfigured?: boolean;
  providerStatus?: number;
  cached?: boolean;
  fetchedAt?: string;
  gated?: boolean;
  reason?: string;
  limit?: number;
}

function normalizeFlightNumber(value?: string | null): string | null {
  const flight = value?.replace(/\s/g, '').toUpperCase();
  return flight && /^[A-Z0-9]{2,3}\d{1,5}$/.test(flight) ? flight : null;
}

function dateToken(value?: string | null): string | null {
  if (!value || value.length < 10) return null;
  return value.substring(0, 10);
}

function freshnessDetail(result: FlightStatusResult): string {
  if (!result.fetchedAt) return '';
  const fetched = new Date(result.fetchedAt);
  if (Number.isNaN(fetched.getTime())) return '';
  return ` Last provider observation: ${fetched.toLocaleString()}.`;
}

export function useFlightStatus(params: {
  flightNumber?: string | null;
  departureDateTime?: string | null;
  enabled?: boolean;
}) {
  const flightNumber = normalizeFlightNumber(params.flightNumber);
  const departureDate = dateToken(params.departureDateTime);
  const enabled = params.enabled !== false && Boolean(flightNumber && departureDate);

  return useQuery<FlightStatusResult>({
    queryKey: ['flight-status', flightNumber, departureDate],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('flight-status', {
        body: { flightNumber, departureDate },
      });

      if (error) {
        throw new Error(error.message || 'Flight status request failed');
      }

      return (data || { signal: null }) as FlightStatusResult;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}

export function describeFlightStatus(result?: FlightStatusResult | null): {
  label: string;
  tone: 'live' | 'cached' | 'setup' | 'neutral';
  detail: string;
} {
  if (!result) {
    return {
      label: 'Not checked',
      tone: 'neutral',
      detail: 'Flight status will check when a flight number and departure date are available.',
    };
  }

  if (result.providerConfigured === false) {
    return {
      label: 'Provider missing',
      tone: 'setup',
      detail: 'Flight status API key is not configured in the active Supabase function environment.',
    };
  }

  if (result.gated) {
    return {
      label: result.reason === 'daily_limit' ? 'Daily limit reached' : 'Status gated',
      tone: 'setup',
      detail: result.reason === 'daily_limit'
        ? `Flight status checks are capped for cost control${result.limit ? ` at ${result.limit} per day` : ''}.`
        : 'Flight status could not pass the usage gate.',
    };
  }

  if (result.signal) {
    const message =
      result.signal.type === 'cancellation' ? 'Cancellation signal detected.'
      : result.signal.type === 'gate_change' ? 'Gate-change signal detected.'
      : 'Delay signal detected.';
    return {
      label: result.cached ? 'Cached provider alert' : 'Recent provider alert',
      tone: result.cached ? 'cached' : 'live',
      detail: `${message}${freshnessDetail(result)}`,
    };
  }

  if (result.providerStatus) {
    return {
      label: 'Provider issue',
      tone: 'setup',
      detail: `Flight provider returned status ${result.providerStatus}. Use official airport or airline status as fallback.`,
    };
  }

  if (result.reason === 'provider_error') {
    return {
      label: 'Provider unavailable',
      tone: 'setup',
      detail: 'Flight provider did not answer in time. Use official airport or airline status as fallback.',
    };
  }

  return {
    label: result.cached ? 'Cached provider check' : 'Provider checked recently',
    tone: result.cached ? 'cached' : 'live',
    detail: `No delay, gate-change, or cancellation signal was returned in this provider observation.${freshnessDetail(result)}`,
  };
}
