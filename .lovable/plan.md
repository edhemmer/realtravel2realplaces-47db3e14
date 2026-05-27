# Native iOS App Plan

You have two real paths. I recommend **Path A** because it reuses 100% of what's already built and ships in days, not months.

## Path A (recommended): Wrap this app with Capacitor → native iOS

Capacitor takes the existing React app and packages it as a real native iOS app you can submit to the App Store. Same backend, same auth, same RLS, same edge functions — no duplication. The "execution app" you described is effectively already built; Capacitor just gives it a native shell with access to iOS APIs (push notifications, GPS, camera, biometrics, background location).

### What gets added

1. **Capacitor scaffolding**
   - Install `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`
   - `capacitor.config.ts` with:
     - `appId: app.lovable.314579f7aa3c49b7b1788640b495f1f7`
     - `appName: realtravel2realplaces`
     - Dev hot-reload pointing at the Lovable sandbox URL (for in-Lovable iteration)
2. **iOS-aware tweaks in the existing web app**
   - Safe-area insets (notch / Dynamic Island / home indicator) on `BrandHeader`, `MobileBottomNav`, `TripDetailLayout`
   - Status bar styling
   - Deep links: `/~oauth` already handled; add a custom URL scheme for OAuth return into the native app
   - Apple Sign-In button on `Auth.tsx` (required by Apple if Google sign-in is present)
3. **Native capability bridges** (optional, additive only — no behavior change to existing logic)
   - Background geolocation → feed `useDeviceLocation` for true on-trip execution
   - Local + push notifications (APNs) → replace/augment current in-app `useNotifications`
   - Haptics on key execution actions (Now / Next Action confirmations)
   - Native share sheet for trip share links

### What does NOT change

- Supabase project, schema, RLS, edge functions: untouched
- All existing engines (`movementExecutionHelper`, `proactiveTripIntelligenceEngine`, execution layer, etc.): reused as-is
- Web app at realtravel2realplaces.app: keeps working exactly as today

### Handoff to you (one-time, on your Mac)

Lovable can't build the `.ipa` itself. After I add the Capacitor layer, you:
1. Export project to GitHub → `git pull` → `npm install`
2. `npx cap add ios`
3. `npm run build && npx cap sync`
4. `npx cap open ios` → run in Xcode simulator or on device
5. For App Store: standard Xcode archive + App Store Connect submission (Apple Developer account, $99/yr)

---

## Path B: Separate Draftbit/Swift app calling the backend

You already started this. It works, but you'll re-implement every screen, every engine, every state machine in a second codebase. Two apps to maintain, two places for bugs, drift between web and iOS execution logic. Only worth it if you specifically need Draftbit's visual builder or a radically different iOS-only UX.

If you go this route, no Lovable changes are needed beyond what you already have — the backend is already iOS-ready.

---

## Recommendation

Go with **Path A**. Your execution engines, proactive intelligence, multimodal decisions, and canonical helpers are the IP — they should run once, in one codebase, on web *and* iOS.

## Out of scope for this plan

- Android (trivial to add later with `npx cap add android`)
- APNs server-side push infrastructure (separate task once iOS shell exists)
- App Store listing assets (screenshots, copy, privacy nutrition label)
- Replacing or rewriting any current feature

## One question before I build

Should the iOS app be **full feature parity** (everything the web app has) or a **thin execution-only client** (Now / Today / Move / Navigate only, planning still done on web)? Path A supports either — same scaffolding, just different route gating.
