import { isNativePlatform } from '@/lib/native/platform';

const PRODUCTION_ORIGIN = 'https://realtravel2realplaces.app';

function currentWebOrigin() {
  if (typeof window === 'undefined') return PRODUCTION_ORIGIN;
  return window.location.origin;
}

export function authOrigin() {
  return isNativePlatform() ? PRODUCTION_ORIGIN : currentWebOrigin();
}

export function authCallbackUrl(redirectTo?: string) {
  const url = new URL('/auth/callback', authOrigin());
  if (redirectTo) url.searchParams.set('redirect', redirectTo);
  return url.toString();
}

export function passwordResetUrl() {
  return new URL('/reset-password', authOrigin()).toString();
}

export function loginUrlWithEmail(email?: string) {
  const url = new URL('/auth', authOrigin());
  if (email) url.searchParams.set('email', email.trim().toLowerCase());
  return url.toString();
}
