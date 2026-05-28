/**
 * Polish v1 — Canonical cinematic motion variants.
 *
 * One concept = one helper. All framer-motion consumers across the app
 * should reach for these instead of inlining `initial` / `animate` props
 * so the motion register stays consistent (cinematic-expressive, locked).
 *
 * Honors `prefers-reduced-motion` automatically: variants degrade to
 * instant transitions when the OS-level setting is on.
 *
 * Pair the wrapper with `className="motion-cinema"` for the CSS-side
 * reduce-motion guard defined in index.css.
 */

import type { Variants, Transition } from "framer-motion";

// ── Easing & timing tokens ────────────────────────────────────────────
export const EASE_CINEMA: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const EASE_STANDARD: [number, number, number, number] = [0.4, 0, 0.2, 1];

export const DUR_FAST = 0.18;
export const DUR_BASE = 0.32;
export const DUR_SLOW = 0.52;

export const SPRING_SOFT: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 24,
  mass: 0.9,
};

export const SPRING_COMMIT: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 28,
  mass: 0.8,
};

// ── Reduced-motion detection (SSR-safe) ───────────────────────────────
const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const reduced = (v: Variants): Variants =>
  prefersReducedMotion()
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.001 } },
      }
    : v;

// ── Canonical variants ────────────────────────────────────────────────

/** Page / section entrance — gentle rise + fade. */
export const sectionRise: Variants = reduced({
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR_BASE, ease: EASE_CINEMA },
  },
});

/** Parent for staggered children (lists, grids). */
export const staggerParent = (childDelay = 0.06, initialDelay = 0.04): Variants =>
  reduced({
    hidden: {},
    visible: {
      transition: {
        delayChildren: initialDelay,
        staggerChildren: childDelay,
      },
    },
  });

/** Child of a staggerParent — rises with spring. */
export const staggerChild: Variants = reduced({
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: SPRING_SOFT,
  },
});

/** Commit / confirmation pulse — for primary actions firing. */
export const commitPulse: Variants = reduced({
  hidden: { scale: 1 },
  visible: {
    scale: [1, 1.02, 1],
    transition: { duration: 0.28, ease: EASE_CINEMA },
  },
});

/** Hero card morph — pairs with `layoutId` for shared-element transitions. */
export const heroMorph: Transition = prefersReducedMotion()
  ? { duration: 0.001 }
  : { ...SPRING_SOFT, duration: DUR_BASE };

/** Cross-fade for content swaps inside a stable container. */
export const crossfade: Variants = reduced({
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DUR_FAST, ease: EASE_STANDARD } },
});

/** Ambient parallax — subtle y-shift driven by scroll-linked motion values. */
export const PARALLAX_RANGE_PX = 24;
