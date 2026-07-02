# iOS Build Guide - realtravel2realplaces

You don't need to own a Mac. Pick a build path, follow it once, and you're in TestFlight.

---

## Path A - MacInCloud or local Mac

1. Sign up at https://www.macincloud.com if you need a cloud Mac.
2. Connect via RDP, Microsoft Remote Desktop, or use your local Mac.
3. On the Mac, open Terminal:
   ```bash
   xcode-select --install
   ```
4. Clone or update this GitHub repository:
   ```bash
   git clone https://github.com/edhemmer/realtravel2realplaces-47db3e14.git
   cd realtravel2realplaces-47db3e14
   npm install
   npm run ios:repair
   open ios/App/App.xcodeproj
   ```
5. In Xcode, open `App.xcodeproj`, select the Apple Developer team in **Signing & Capabilities**, then run or archive.

For every later change pushed to GitHub:

```bash
git checkout main
git pull --ff-only
npm install
npm run ios:repair
open ios/App/App.xcodeproj
```

## Path B - Ionic Appflow

1. Sign up at https://ionic.io/appflow.
2. Connect this GitHub repo.
3. Add an **iOS Native build**, then upload your Apple Developer signing certificate and provisioning profile.
4. Push to `main`; Appflow builds an `.ipa` and uploads to TestFlight automatically.

This is the right path if you do not want to touch Xcode at all.

---

## App Store Prerequisites

- **Apple Developer Program**: $99/year - https://developer.apple.com/programs/
- **Bundle ID**: `com.inlighttai.rt2rp`
- **App icon**: 1024x1024 PNG, no transparency.
- **Launch screen**: handled by `@capacitor/splash-screen`.
- **Privacy strings** in `ios/App/App/Info.plist`:
  - `NSLocationWhenInUseUsageDescription` - "Your location is used to surface nearby trip stops and time your departures while the app is open."
  - `NSLocationAlwaysAndWhenInUseUsageDescription` - "Your location is used to surface nearby trip stops and time your departures even when the app is in the background."
  - `NSCameraUsageDescription` - "The camera is used to capture receipts and tickets for expense tracking."
  - `NSPhotoLibraryUsageDescription` - "Photo library access is used to import receipts and tickets for expense tracking."
  - `NSUserTrackingUsageDescription` - only if you add analytics SDKs.

## Apple Sign-In

Apple Sign-In is required by App Store policy if another third-party sign-in option is present.

1. Open the Supabase dashboard for the production project.
2. Authentication > Providers > **Apple** > configure the Apple service credentials.
3. Add the Vercel production URL and iOS callback/deep-link URLs to Supabase Auth redirect allow-lists.

## Release Checklist

Functional:

- [ ] Login works on simulator and real device.
- [ ] Trip list loads, opens, and renders the main trip tabs without console errors.
- [ ] Add Expense flow completes online and offline.
- [ ] Navigation buttons open maps with correct coordinates.
- [ ] Pull-to-refresh works on the trip list.

Polish:

- [ ] No content sits under the Dynamic Island or home indicator.
- [ ] Keyboard never covers focused input.
- [ ] Status bar text is readable on every screen.
- [ ] No web fonts flash.
- [ ] All buttons are at least 44x44 pt.
- [ ] Haptic feedback fires on key travel actions.

Performance:

- [ ] Cold launch is under 2.5 seconds on iPhone 12 or newer.
- [ ] Scrolling the Today timeline stays smooth.

Store metadata:

- [ ] App icon present at all required sizes.
- [ ] Screenshots for required iPhone sizes.
- [ ] Privacy policy URL is reachable from a public URL.
- [ ] App Privacy questionnaire filled in App Store Connect.

---

## Release Build

Production builds load bundled assets by default. Run `npm run ios:repair`, open `ios/App/App.xcodeproj`, then archive in Xcode with **Product > Archive > Distribute > App Store Connect**.

## If Xcode Says "Missing package product 'CapApp-SPM'"

This project uses Capacitor's standard Swift Package Manager setup. The Xcode project links one local package product named `CapApp-SPM`, and that package points to installed Capacitor packages in `node_modules`.

Close Xcode completely before doing repair work. Then run this from the repository root on the Mac:

```bash
git checkout main
git pull --ff-only
npm install
npm run ios:repair
open ios/App/App.xcodeproj
```

Open `App.xcodeproj`; do not use a Pods workspace. In Xcode, use **File > Packages > Reset Package Caches**, then **File > Packages > Resolve Package Versions**.

The repair script:

- Runs the web build and `npx cap sync ios`.
- Normalizes `ios/App/CapApp-SPM/Package.swift` paths for macOS SwiftPM.
- Clears stale project SwiftPM package state.
- Clears this app's Xcode DerivedData folders.
- Verifies the Xcode project links the standard `CapApp-SPM` product.
- Verifies every local Capacitor Swift package exists under `node_modules`.

If the repair command reports missing package files, run `npm install` again, then rerun `npm run ios:repair`.

## CarPlay

The app includes native CarPlay scene scaffolding for Drive Mode:

- `CarPlaySceneDelegate.swift` renders the current drive stops on the car screen.
- `CarPlayBridgePlugin.swift` lets the web Drive Cockpit publish canonical trip stops to native iOS.
- `Info.plist` declares `CPTemplateApplicationSceneSessionRoleApplication`.

Apple must grant the CarPlay entitlement for the bundle id before this works on a real CarPlay head unit or App Store build. In Apple Developer, request the appropriate CarPlay category entitlement for `com.inlighttai.rt2rp`; after approval, enable the capability in Xcode/signing. Do not add a CarPlay entitlement file before Apple grants it, because provisioning will fail.
