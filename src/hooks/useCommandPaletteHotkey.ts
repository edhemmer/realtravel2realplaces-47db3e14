/**
 * Command Palette — canonical hotkey + open/close bus.
 *
 * One helper. Anywhere in the app can call `openCommandPalette()` or bind
 * `useCommandPaletteHotkey()` once at root and ⌘K / Ctrl+K will toggle the
 * palette. Communication uses a `window` CustomEvent so the palette
 * component is the single consumer and there's no extra context provider.
 */

import { useEffect } from 'react';

const EVENT = 'rt2rp:command-palette:toggle';

export function openCommandPalette(): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { open: true } }));
}

export function toggleCommandPalette(): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { toggle: true } }));
}

export function subscribeCommandPalette(
  handler: (e: { open?: boolean; toggle?: boolean }) => void,
): () => void {
  const listener = (ev: Event) => {
    const detail = (ev as CustomEvent).detail ?? {};
    handler(detail);
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

/**
 * Global ⌘K / Ctrl+K hotkey. Mount once at the app root.
 * Ignores presses while typing inside inputs / textareas / contentEditable.
 */
export function useCommandPaletteHotkey(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key === 'k' || e.key === 'K';
      if (!isK) return;
      if (!(e.metaKey || e.ctrlKey)) return;

      // Allow ⌘K everywhere — including inputs — since palette is a global utility.
      e.preventDefault();
      toggleCommandPalette();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
