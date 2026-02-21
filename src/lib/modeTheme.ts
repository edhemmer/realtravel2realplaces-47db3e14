/**
 * v4.9.2: Canonical Mode Theme System – Psychological Color Theory
 *
 * Single source of truth for all trip-mode visual styling.
 * All mode-specific colors MUST come from getModeTheme().
 * Do NOT hardcode per-mode hex/colors in components.
 *
 * Design principles (70/20/10):
 *   70% neutral surfaces
 *   20% semantic accent (mode color)
 *   10% attention tone (alerts only — amber/red, never mode-colored)
 *
 * Fly  = Stability + Precision   → Refined muted blue (trust, order)
 * Drive = Freedom + Movement     → Deep natural green (calm confidence)
 * Train = Flow + Smoothness      → Soft slate-indigo (continuity, rhythm)
 */

// ============================================================================
// TYPES
// ============================================================================

export type TripMode = 'fly' | 'drive' | 'train' | 'unknown';

export interface ModeThemePalette {
  /** Primary brand color for this mode (Tailwind class) */
  primary: string;
  /** Accent/secondary color */
  accent: string;
  /** Subtle background tint */
  background: string;
  /** Border color */
  border: string;
  /** Icon color (white on dark bg, dark on light bg) */
  icon: string;
  /** Very subtle wash for large surfaces */
  subtle: string;
  /** Focus ring color */
  focus: string;
}

export interface ModeThemeGradients {
  /** Button/CTA background gradient */
  buttonBg: string;
  /** Header accent strip background */
  headerBg: string;
  /** Pill/badge background */
  pillBg: string;
}

export interface ModeTheme {
  id: TripMode;
  palette: ModeThemePalette;
  gradients: ModeThemeGradients;
}

// ============================================================================
// THEME DEFINITIONS (v4.9.2 — psychological color theory, accessible)
// ============================================================================

/**
 * FLY: Refined muted blue — stability, precision, trust.
 * Slightly desaturated from nav blue. No bright cyan. No deep navy.
 */
const FLY_THEME: ModeTheme = {
  id: 'fly',
  palette: {
    primary: 'text-blue-500 dark:text-blue-400',
    accent: 'text-blue-400 dark:text-blue-300',
    background: 'bg-blue-500/8 dark:bg-blue-500/12',
    border: 'border-blue-400/25 dark:border-blue-400/20',
    icon: 'text-white',
    subtle: 'bg-blue-50/40 dark:bg-blue-950/20',
    focus: 'ring-blue-400/30 dark:ring-blue-400/30',
  },
  gradients: {
    buttonBg: 'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-500 dark:to-blue-600',
    headerBg: 'bg-gradient-to-r from-blue-500/6 to-blue-400/4 dark:from-blue-500/8 dark:to-blue-400/6',
    pillBg: 'bg-gradient-to-r from-blue-500/8 to-blue-400/8 dark:from-blue-500/12 dark:to-blue-400/10',
  },
};

/**
 * DRIVE: Deep natural green — freedom, forward motion, calm confidence.
 * Desaturated. No neon/lime. Lean toward deep natural green.
 */
const DRIVE_THEME: ModeTheme = {
  id: 'drive',
  palette: {
    primary: 'text-emerald-600 dark:text-emerald-400',
    accent: 'text-emerald-500 dark:text-emerald-300',
    background: 'bg-emerald-500/8 dark:bg-emerald-500/12',
    border: 'border-emerald-500/25 dark:border-emerald-400/20',
    icon: 'text-white',
    subtle: 'bg-emerald-50/40 dark:bg-emerald-950/20',
    focus: 'ring-emerald-500/30 dark:ring-emerald-400/30',
  },
  gradients: {
    buttonBg: 'bg-gradient-to-br from-emerald-600 to-emerald-700 dark:from-emerald-500 dark:to-emerald-600',
    headerBg: 'bg-gradient-to-r from-emerald-500/6 to-emerald-400/4 dark:from-emerald-500/8 dark:to-emerald-400/6',
    pillBg: 'bg-gradient-to-r from-emerald-500/8 to-emerald-400/8 dark:from-emerald-500/12 dark:to-emerald-400/10',
  },
};

/**
 * TRAIN: Soft slate-indigo — flow, rhythm, smooth efficiency.
 * Muted steel-blue leaning. NOT same as Fly. No purple. No red.
 */
const TRAIN_THEME: ModeTheme = {
  id: 'train',
  palette: {
    primary: 'text-slate-600 dark:text-slate-400',
    accent: 'text-slate-500 dark:text-slate-300',
    background: 'bg-slate-500/8 dark:bg-slate-500/12',
    border: 'border-slate-400/25 dark:border-slate-400/20',
    icon: 'text-white',
    subtle: 'bg-slate-50/40 dark:bg-slate-900/20',
    focus: 'ring-slate-500/30 dark:ring-slate-400/30',
  },
  gradients: {
    buttonBg: 'bg-gradient-to-br from-slate-500 to-slate-600 dark:from-slate-500 dark:to-slate-600',
    headerBg: 'bg-gradient-to-r from-slate-500/6 to-slate-400/4 dark:from-slate-500/8 dark:to-slate-400/6',
    pillBg: 'bg-gradient-to-r from-slate-500/8 to-slate-400/8 dark:from-slate-500/12 dark:to-slate-400/10',
  },
};

const NEUTRAL_THEME: ModeTheme = {
  id: 'unknown',
  palette: {
    primary: 'text-muted-foreground',
    accent: 'text-muted-foreground',
    background: 'bg-muted/50',
    border: 'border-border/50',
    icon: 'text-muted-foreground',
    subtle: 'bg-muted/20',
    focus: 'ring-ring/30',
  },
  gradients: {
    buttonBg: 'bg-muted',
    headerBg: 'bg-muted/10',
    pillBg: 'bg-muted/30',
  },
};

// ============================================================================
// RESOLVERS (single source of truth)
// ============================================================================

const THEME_MAP: Record<TripMode, ModeTheme> = {
  fly: FLY_THEME,
  drive: DRIVE_THEME,
  train: TRAIN_THEME,
  unknown: NEUTRAL_THEME,
};

/**
 * Resolve a TripMode from a trip's transportation_mode field.
 * Does not guess — returns 'unknown' for unrecognized values.
 */
export function getTripMode(trip: { transportation_mode?: string } | null | undefined): TripMode {
  if (!trip?.transportation_mode) return 'unknown';
  switch (trip.transportation_mode) {
    case 'flight': return 'fly';
    case 'drive': return 'drive';
    // Future: add 'train' when the DB enum supports it
    default: return 'unknown';
  }
}

/**
 * Get the canonical ModeTheme for a given TripMode.
 * Always returns a valid theme (NEUTRAL_THEME for unknown/null).
 */
export function getModeTheme(mode: TripMode | null | undefined): ModeTheme {
  return THEME_MAP[mode ?? 'unknown'] ?? NEUTRAL_THEME;
}
