/**
 * Polish v1 — Canonical glass surface primitive.
 *
 * One concept = one helper. Every elevated surface in the app should
 * migrate to <GlassSurface> instead of hand-rolling bg/border/shadow
 * stacks, so depth language stays uniform across light + dark themes.
 *
 * Three elevations match the design system:
 *   - "flush"    → ambient panels, page sections, list rows
 *   - "raised"   → cards (default)
 *   - "floating" → modals, command palette, NowCard hero
 *
 * Tokens come from `--elevation-*` in index.css. Light and dark are
 * resolved automatically; no per-theme branching here.
 *
 * Out of scope for this pass: no existing component is migrated yet.
 * Migration happens one-at-a-time in future targeted requests.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

type Elevation = "flush" | "raised" | "floating";

interface GlassSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Depth level — see file header for guidance. Defaults to "raised". */
  elevation?: Elevation;
  /** Render as a different element (e.g. "section", "article"). */
  as?: keyof JSX.IntrinsicElements;
  /** Disable backdrop blur — useful on long-scroll lists for performance. */
  flat?: boolean;
}

const ELEVATION_CLASSES: Record<Elevation, string> = {
  flush: "shadow-elevation-flush bg-card/60",
  raised: "shadow-elevation-raised bg-card/80",
  floating: "shadow-elevation-floating bg-card/85",
};

const BLUR_CLASSES: Record<Elevation, string> = {
  flush: "backdrop-blur-sm",
  raised: "backdrop-blur-glass",
  floating: "backdrop-blur-glass-hero",
};

export const GlassSurface = React.forwardRef<HTMLDivElement, GlassSurfaceProps>(
  ({ elevation = "raised", as: Tag = "div", flat = false, className, children, ...rest }, ref) => {
    const Element = Tag as React.ElementType;
    return (
      <Element
        ref={ref}
        className={cn(
          "relative rounded-xl",
          ELEVATION_CLASSES[elevation],
          !flat && BLUR_CLASSES[elevation],
          // Inner highlight is delivered via the inset shadow in the token,
          // so no extra pseudo-element needed.
          className,
        )}
        {...rest}
      >
        {children}
      </Element>
    );
  },
);

GlassSurface.displayName = "GlassSurface";
