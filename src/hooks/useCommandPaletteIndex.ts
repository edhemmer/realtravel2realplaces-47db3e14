/**
 * Canonical search index for the Command Palette.
 *
 * One helper builds the searchable corpus from existing canonical queries
 * (trips first; future entities can be appended without touching consumers).
 *
 * Pure derived data — no extra network calls. Reuses the `useTrips` cache
 * already populated by Dashboard.
 */

import { useMemo } from 'react';
import { isNativeIOS } from '@/lib/native/platform';
import {
  Compass,
  LayoutDashboard,
  Plane,
  User,
  CreditCard,
  BarChart3,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { useTrips } from './useTrips';
import type { Trip } from '@/types/database';

export type CommandItem = {
  id: string;
  group: 'Recent' | 'Trips' | 'Navigate' | 'Actions';
  label: string;
  hint?: string;
  keywords?: string;
  icon: React.ComponentType<{ className?: string }>;
  perform: (nav: (path: string) => void) => void;
};

const RECENT_KEY = 'lovable:cmdk:recent-trip-ids';
const RECENT_MAX = 5;

export function rememberRecentTrip(tripId: string): void {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const prev: string[] = raw ? JSON.parse(raw) : [];
    const next = [tripId, ...prev.filter(id => id !== tripId)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* no-op */ }
}

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function tripLabel(t: Trip): string {
  return t.name?.trim() || t.destination_city?.trim() || 'Untitled trip';
}

function tripKeywords(t: Trip): string {
  return [
    t.name,
    t.destination_city,
    t.destination_state,
    t.destination_country,
    t.trip_type,
  ].filter(Boolean).join(' ');
}

export function useCommandPaletteIndex(): CommandItem[] {
  const { data: trips = [] } = useTrips();

  return useMemo(() => {
    const items: CommandItem[] = [];

    // ----- Recent trips (max 5, in stored order) -----
    const recentIds = readRecent();
    const tripById = new Map(trips.map(t => [t.id, t]));
    for (const id of recentIds) {
      const t = tripById.get(id);
      if (!t) continue;
      items.push({
        id: `recent:${t.id}`,
        group: 'Recent',
        label: tripLabel(t),
        hint: t.destination_city ?? undefined,
        keywords: tripKeywords(t),
        icon: Compass,
        perform: (nav) => nav(`/trip/${t.id}`),
      });
    }

    // ----- All trips -----
    for (const t of trips) {
      items.push({
        id: `trip:${t.id}`,
        group: 'Trips',
        label: tripLabel(t),
        hint: [t.destination_city, t.destination_country].filter(Boolean).join(', ') || undefined,
        keywords: tripKeywords(t),
        icon: Plane,
        perform: (nav) => nav(`/trip/${t.id}`),
      });
    }

    // ----- Navigate -----
    // Plans & billing is hidden inside the iOS app (subscriptions are managed on the web).
    // Use a runtime require to avoid touching this hook's existing imports.
    let onIOSNative = false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      onIOSNative = require('@/lib/native/platform').isNativeIOS();
    } catch { /* noop */ }
    items.push(
      { id: 'nav:dashboard', group: 'Navigate', label: 'Dashboard', keywords: 'home trips overview', icon: LayoutDashboard, perform: (nav) => nav('/dashboard') },
      { id: 'nav:reports', group: 'Navigate', label: 'Reports', keywords: 'spend expense analytics', icon: BarChart3, perform: (nav) => nav('/reports') },
      { id: 'nav:account', group: 'Navigate', label: 'Account', keywords: 'profile settings preferences', icon: User, perform: (nav) => nav('/account') },
      ...(onIOSNative
        ? []
        : [{ id: 'nav:plans', group: 'Navigate' as const, label: 'Plans & billing', keywords: 'subscription upgrade pro', icon: CreditCard, perform: (nav: any) => nav('/plans') }]),
      { id: 'nav:help', group: 'Navigate', label: 'Help center', keywords: 'support faq docs', icon: HelpCircle, perform: (nav) => nav('/help') },
    );

    // ----- Actions -----
    items.push({
      id: 'action:new-trip',
      group: 'Actions',
      label: 'New trip',
      hint: 'Start planning',
      keywords: 'create add plan',
      icon: Sparkles,
      perform: (nav) => {
        // Dashboard opens the wizard via this query param.
        nav('/dashboard?new=1');
      },
    });

    return items;
  }, [trips]);
}
