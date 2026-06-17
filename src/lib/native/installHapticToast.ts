/**
 * Bridges every sonner toast notification to the canonical `haptic()` helper.
 *
 * Why a global patch instead of touching every call-site:
 *   - Sonner's `toast` is a singleton imported as `import { toast } from 'sonner'`
 *     across ~40 files. Wrapping it once at bootstrap means every success /
 *     error / warning toast in the app automatically fires the matching
 *     haptic — including future ones — with zero per-feature wiring.
 *   - On web, `haptic()` is a no-op, so this patch costs nothing in the
 *     browser bundle.
 *
 * Idempotent: marks the toast object so repeated calls (HMR) don't double-wrap.
 */

import { toast } from 'sonner';
import { haptic } from './haptics';

const PATCHED = Symbol.for('rt2rp.haptic-toast-patched');

type Patchable = {
  success?: (...args: unknown[]) => unknown;
  error?: (...args: unknown[]) => unknown;
  warning?: (...args: unknown[]) => unknown;
  [PATCHED]?: boolean;
};

export function installHapticToast(): void {
  const t = toast as unknown as Patchable;
  if (t[PATCHED]) return;
  t[PATCHED] = true;

  const wrap = (
    key: 'success' | 'error' | 'warning',
    intent: 'success' | 'error' | 'warning',
  ) => {
    const original = t[key];
    if (typeof original !== 'function') return;
    t[key] = function patched(this: unknown, ...args: unknown[]) {
      void haptic(intent);
      return (original as (...a: unknown[]) => unknown).apply(this, args);
    };
  };

  wrap('success', 'success');
  wrap('error', 'error');
  wrap('warning', 'warning');
}
