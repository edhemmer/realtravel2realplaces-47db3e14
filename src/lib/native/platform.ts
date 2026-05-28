/**
 * Native platform detection helpers.
 *
 * Used to gate features that are intentionally limited on native shells.
 * On iOS we currently disable trip creation (read/companion mode only).
 *
 * These checks are synchronous — Capacitor exposes `getPlatform()` and
 * `isNativePlatform()` without async work. On the web bundle they return
 * `'web'` / `false`, so guarded code is a pure no-op for browser users.
 */
import { Capacitor } from '@capacitor/core';

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function isNativeIOS(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  } catch {
    return false;
  }
}

/**
 * Single source of truth for "can the current shell create new trips?".
 * Trip creation is enabled on all platforms (web, iOS, Android).
 */
export function canCreateTrips(): boolean {
  return true;
}
