/**
 * v3.9.35: Canonical Mode Theme System
 *
 * Single source of truth for all trip-mode visual styling.
 * All mode-specific colors MUST come from getModeTheme().
 * Do NOT hardcode per-mode hex/colors in components.
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
// THEME DEFINITIONS (v1.0 — premium, accessible)
// ============================================================================

const FLY_THEME: ModeTheme = {
  id: 'fly',
  palette: {
    primary: 'text-blue-600 dark:text-blue-400',
    accent: 'text-cyan-500 dark:text-cyan-400',
    background: 'bg-blue-500/10 dark:bg-blue-500/15',
    border: 'border-blue-500/25 dark:border-blue-400/25',
    icon: 'text-white',
    subtle: 'bg-blue-50/60 dark:bg-blue-950/30',
    focus: 'ring-blue-500/40 dark:ring-blue-400/40',
  },
  gradients: {
    buttonBg: 'bg-gradient-to-br from-blue-500 to-cyan-500 dark:from-blue-600 dark:to-cyan-600',
    headerBg: 'bg-gradient-to-r from-blue-500/8 to-cyan-500/5 dark:from-blue-500/10 dark:to-cyan-500/8',
    pillBg: 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 dark:from-blue-500/15 dark:to-cyan-500/15',
  },
};

const DRIVE_THEME: ModeTheme = {
  id: 'drive',
  palette: {
    primary: 'text-[#8B7355] dark:text-amber-300',
    accent: 'text-[#6B5B45] dark:text-amber-200',
    background: 'bg-[#E6D2B3]/15 dark:bg-amber-500/12',
    border: 'border-[#A9885C]/30 dark:border-amber-400/20',
    icon: 'text-[#3E3A34] dark:text-amber-100',
    subtle: 'bg-[#F5EDE0]/50 dark:bg-amber-950/20',
    focus: 'ring-[#A9885C]/30 dark:ring-amber-400/30',
  },
  gradients: {
    buttonBg: 'bg-gradient-to-br from-[#EBD8BF] to-[#C9A874] dark:from-[#8B7355] dark:to-[#6B5B45]',
    headerBg: 'bg-gradient-to-r from-[#E6D2B3]/6 to-[#C9A874]/4 dark:from-amber-500/8 dark:to-amber-700/6',
    pillBg: 'bg-gradient-to-r from-[#E6D2B3]/12 to-[#C9A874]/8 dark:from-amber-500/12 dark:to-amber-700/10',
  },
};

const TRAIN_THEME: ModeTheme = {
  id: 'train',
  palette: {
    primary: 'text-indigo-600 dark:text-indigo-400',
    accent: 'text-violet-500 dark:text-violet-400',
    background: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    border: 'border-indigo-500/25 dark:border-indigo-400/25',
    icon: 'text-white',
    subtle: 'bg-indigo-50/60 dark:bg-indigo-950/30',
    focus: 'ring-indigo-500/40 dark:ring-indigo-400/40',
  },
  gradients: {
    buttonBg: 'bg-gradient-to-br from-indigo-500 to-violet-500 dark:from-indigo-600 dark:to-violet-600',
    headerBg: 'bg-gradient-to-r from-indigo-500/8 to-violet-500/5 dark:from-indigo-500/10 dark:to-violet-500/8',
    pillBg: 'bg-gradient-to-r from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/15 dark:to-violet-500/15',
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
