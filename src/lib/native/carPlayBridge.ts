import { registerPlugin } from '@capacitor/core';
import { isNativeIOS } from '@/lib/native/platform';
import type { CanonicalTripState } from '@/lib/canonicalTripState';
import type { Trip } from '@/types/database';

interface CarPlayBridgePlugin {
  publishDriveState(options: { payload: string }): Promise<{ ok: boolean }>;
}

export interface CarPlayStopPayload {
  id: string;
  title: string;
  subtitle?: string;
  address?: string;
  etaText?: string;
}

export interface CarPlayWidgetPayload {
  id: string;
  label: string;
  value: string;
  tone?: 'good' | 'watch' | 'danger' | 'offline';
}

export interface CarPlayDriveStatePayload {
  tripId: string;
  tripName: string;
  destination?: string;
  updatedAt: string;
  widgets: CarPlayWidgetPayload[];
  stops: CarPlayStopPayload[];
}

const CarPlayBridge = registerPlugin<CarPlayBridgePlugin>('CarPlayBridge');

function displayTime(eventLocalDateTime?: string): string | undefined {
  if (!eventLocalDateTime || eventLocalDateTime.length < 16) return undefined;
  const time = eventLocalDateTime.substring(11, 16);
  const [hourRaw, minute] = time.split(':').map(Number);
  if (!Number.isFinite(hourRaw) || !Number.isFinite(minute)) return undefined;
  const suffix = hourRaw >= 12 ? 'PM' : 'AM';
  const hour = hourRaw % 12 || 12;
  return `${hour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function buildCarPlayDriveState(
  tripId: string,
  trip: Trip,
  canonicalState: CanonicalTripState | null,
  widgets: CarPlayWidgetPayload[] = [],
): CarPlayDriveStatePayload {
  const stops = (canonicalState?.timelineEvents ?? [])
    .filter((event) => event.eventLocalDateTime || event.address || event.title)
    .slice(0, 12)
    .map((event): CarPlayStopPayload => ({
      id: event.id,
      title: event.title || event.subtitle || 'Trip stop',
      subtitle: event.subtitle || event.eventType.replace(/_/g, ' '),
      address: event.address,
      etaText: displayTime(event.eventLocalDateTime),
    }));

  return {
    tripId,
    tripName: trip.name,
    destination: [trip.destination_city, trip.destination_state, trip.destination_country].filter(Boolean).join(', '),
    updatedAt: new Date().toISOString(),
    widgets,
    stops,
  };
}

export async function publishCarPlayDriveState(payload: CarPlayDriveStatePayload): Promise<void> {
  if (!isNativeIOS()) return;
  try {
    await CarPlayBridge.publishDriveState({ payload: JSON.stringify(payload) });
  } catch (error) {
    console.warn('[CarPlayBridge] publishDriveState failed:', error);
  }
}
