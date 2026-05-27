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
   sudo gem install cocoapods
   ```
4. Clone your GitHub export of this Lovable project:
   ```bash
   git clone https://github.com/<you>/<repo>.git
   cd <repo>
   npm install
   npx cap add ios
   npm run build
   npx cap sync ios
   npx cap open ios
   ```
5. Xcode opens. Select your **Apple Developer team** in *Signing & Capabilities*, plug in or pick a simulator, hit **Run**.

For every later change pushed from Lovable:
```bash
git pull && npm install && npm run build && npx cap sync ios
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
- **Bundle ID**: `app.lovable.314579f7aa3c49b7b1788640b495f1f7` (already set in `capacitor.config.ts`)
- **App icon**: 1024×1024 PNG, no transparency. Place in `ios/App/App/Assets.xcassets/AppIcon.appiconset/` after `cap add ios`.
- **Launch screen**: handled by `@capacitor/splash-screen` — replace the default in `ios/App/App/Assets.xcassets/Splash.imageset/`.
- **Privacy strings** in `ios/App/App/Info.plist`:
  - `NSLocationWhenInUseUsageDescription` — "Used to surface trip stops near you and time your departures."
  - `NSCameraUsageDescription` (if scanning receipts) — "Used to capture receipts and tickets."
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

For production builds, comment out the `server` block in `capacitor.config.ts` so the app loads bundled assets instead of the Lovable sandbox:

```ts
// server: { url: '...', cleartext: true },
```

Then `npm run build && npx cap sync ios` and archive in Xcode (Product → Archive → Distribute → App Store Connect).
