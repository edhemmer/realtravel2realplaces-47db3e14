# iOS Build Guide — realtravel2realplaces

You don't need to own a Mac. Pick a build path, follow it once, and you're in TestFlight.

---

## Path A — MacInCloud (recommended for solo dev, ~$1/hr)

1. Sign up at https://www.macincloud.com → pick a **Pay-As-You-Go** plan.
2. Connect via RDP (Windows) or Microsoft Remote Desktop (any OS).
3. On the cloud Mac, open Terminal:
   ```bash
   # one-time
   xcode-select --install
   ```
4. Clone your GitHub export of this Lovable project:
   ```bash
   git clone https://github.com/<you>/<repo>.git
   cd <repo>
   npm install
   npm run ios:sync
   open ios/App/App.xcodeproj
   ```
5. Xcode opens the Xcode project (`App.xcodeproj`). Select your **Apple Developer team** in *Signing & Capabilities*, then hit **Run** or **Archive**.

For every later change pushed from Lovable:
```bash
git pull && npm install && npm run ios:sync && open ios/App/App.xcodeproj
```

## Path B — Ionic Appflow (no Mac ever, ~$0–$49/mo)

1. Sign up at https://ionic.io/appflow.
2. Connect this GitHub repo.
3. Add **iOS Native build**, upload your Apple Developer signing certificate + provisioning profile (Appflow walks you through it).
4. Push to `main` → Appflow builds an `.ipa` → uploads to TestFlight automatically.

This is the right path if you don't want to touch Xcode at all.

---

## App Store prerequisites (one-time)

- **Apple Developer Program**: $99/year — https://developer.apple.com/programs/
- **Bundle ID**: `com.inlighttai.rt2rp` (already set in `capacitor.config.ts` and `ios/App/App/Info.plist`)
- **App icon**: 1024×1024 PNG, no transparency. Place in `ios/App/App/Assets.xcassets/AppIcon.appiconset/` after `cap add ios`.
- **Launch screen**: handled by `@capacitor/splash-screen` — replace the default in `ios/App/App/Assets.xcassets/Splash.imageset/`.
- **Privacy strings** in `ios/App/App/Info.plist`:
  - `NSLocationWhenInUseUsageDescription` — "Your location is used to surface nearby trip stops and time your departures while the app is open."
  - `NSLocationAlwaysAndWhenInUseUsageDescription` — "Your location is used to surface nearby trip stops and time your departures even when the app is in the background." *(Required by App Store as of May 2026; see `ios/App/App/Info.plist` in this repo.)*
  - `NSCameraUsageDescription` (if scanning receipts) — "The camera is used to capture receipts and tickets for expense tracking."
  - `NSPhotoLibraryUsageDescription` (if importing from camera roll) — "Photo library access is used to import receipts and tickets for expense tracking."
  - `NSUserTrackingUsageDescription` — only if you add analytics SDKs.

## Apple Sign-In (required by App Store if Google sign-in is present)

Already supported by Lovable Cloud. To enable:
1. Open the backend dashboard from Lovable.
2. Authentication → Sign-In Methods → **Apple** → toggle on (managed credentials).
3. In `src/pages/Auth.tsx`, add an "Sign in with Apple" button that calls `supabase.auth.signInWithOAuth({ provider: 'apple' })`.

## Release checklist (run before every TestFlight build)

Functional
- [ ] Login (email, Google, Apple) works on simulator and real device
- [ ] Trip list loads, opens, and renders Now / Today / Move tabs without console errors
- [ ] Add Expense flow completes online AND offline (offline queue syncs on reconnect)
- [ ] Navigation buttons open Apple Maps with correct coordinates
- [ ] Pull-to-refresh works on trip list

Polish
- [ ] No content sits under the Dynamic Island or home indicator (safe-area)
- [ ] Keyboard never covers focused input
- [ ] Status bar text is readable on every screen
- [ ] No web fonts flash (FOIT)
- [ ] All buttons ≥ 44×44 pt
- [ ] Haptic feedback fires on: expense added, Next Action acknowledged, navigation launched

Performance
- [ ] Cold launch < 2.5s on iPhone 12 or newer
- [ ] No dropped frames scrolling the Today timeline

Store metadata
- [ ] App icon present at all required sizes
- [ ] Screenshots for 6.7", 6.5", 5.5" devices
- [ ] Privacy policy URL (`/privacy`) reachable from a public URL
- [ ] App Privacy questionnaire filled in App Store Connect (location, email, analytics)

---

## Release build (drop the dev server.url)

Production builds already load bundled assets by default. Run `npm run ios:sync`, open `ios/App/App.xcodeproj`, then archive in Xcode (Product → Archive → Distribute → App Store Connect).

## If Xcode says “Missing package product 'CapApp-SPM'”

This project uses Capacitor's Swift Package Manager setup. Close Xcode completely and run:

```bash
git pull
npm install
npm run ios:sync
open ios/App/App.xcodeproj
```

If Xcode is already open, quit it before running the command. Open `App.xcodeproj`; do not use a Pods workspace.
# CarPlay

The app includes native CarPlay scene scaffolding for Drive Mode:

- `CarPlaySceneDelegate.swift` renders the current drive stops on the car screen.
- `CarPlayBridgePlugin.swift` lets the web Drive Cockpit publish canonical trip stops to native iOS.
- `Info.plist` declares `CPTemplateApplicationSceneSessionRoleApplication`.

Apple must grant the CarPlay entitlement for the bundle id before this works on a real CarPlay head unit or App Store build. In Apple Developer, request the appropriate CarPlay category entitlement for `com.inlighttai.rt2rp`; after approval, enable the capability in Xcode/signing. Do not add a CarPlay entitlement file before Apple grants it, because provisioning will fail.
