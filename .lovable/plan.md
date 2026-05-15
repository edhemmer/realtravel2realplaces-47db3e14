## Goal

Replace the `rt2rp-logo.png` image used in the app header and landing header with a text-only wordmark: **InLight AI — RealTravel 2 RealPlaces**.

## Changes

1. **`src/components/BrandHeader.tsx`** (used in the app shell)
   - Remove the `<img src={rt2rpLogo} />`.
   - Replace with a styled text wordmark:
     - Small caps "InLight AI" in muted/accent color
     - Separator (em dash)
     - "RealTravel 2 RealPlaces" with "2" italicized to match existing brand styling on the auth/forgot pages
   - Keep the existing `Link` wrapper, sizing, and `PlanPill` placement intact.

2. **`src/components/landing/LandingHeader.tsx`** (marketing landing page)
   - Same swap: remove `<img>`, insert the same text wordmark using the landing variant typography classes so it sits cleanly in the dark landing header.

3. **No other files touched.** The `rt2rp-logo.png` asset stays in place (used in favicons / OG images elsewhere is not in scope here). Footer and auth-page logos are untouched unless you want those swapped too.

## Wordmark structure (both headers)

```text
InLight AI  —  RealTravel 2 RealPlaces
[small,           [primary brand
 muted]            wordmark, "2" italic]
```

Responsive: on narrow viewports the "InLight AI —" prefix collapses to a smaller line above the main wordmark so it doesn't crowd the right-side nav/PlanPill.

## Out of scope

- Favicon, OG image, email templates, splash assets.
- Footer copyright line (already says "InLight AI, LLC").
- Any logic, routing, or backend changes.

Tell me if you also want the auth page logos, footer, or favicon updated and I'll fold those in.