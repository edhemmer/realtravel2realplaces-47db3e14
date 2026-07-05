# iOS App Store Readiness

## Apple Review Gates

Before submitting a build, verify:

- App launches from the icon on a physical iPhone and iPad.
- Auth, dashboard, trip detail, Today, Timeline, Travel, Places, Driving Mode, Account, and password reset work against production services.
- Backend services are live and reachable during review.
- App Review has a working demo account or full-featured review account.
- Privacy policy is linked in App Store Connect and accessible inside the app.
- Location, camera, photo, push notification, and account deletion behavior match the privacy policy and App Store privacy answers.
- Screenshots and description reflect the real app experience, not planned features.
- No placeholder, mock-only, "demo," or nonfunctional surfaces are visible.

## Required Screenshot Sets

Apple accepts one to ten screenshots per display family.

For iPhone, provide 6.9-inch screenshots first. Accepted portrait sizes include:

- 1260 x 2736
- 1290 x 2796
- 1320 x 2868

For iPad, RT2RP runs on iPad, so provide 13-inch iPad screenshots. Accepted portrait sizes include:

- 2064 x 2752
- 2048 x 2732

## Recommended Screenshot Story

Use real app screens with production-safe sample data:

1. Trip Command Center: Chaos to Clarity, live/next trip state.
2. Today: next action, timeline preview, alerts.
3. Timeline: flights, drive, lodging, receipts in one ordered trip.
4. Travel: route or airport timing with live/cached/provider state.
5. Places: location-aware places with source status.
6. Driving Mode: route cockpit, weather/road alerts, gas/search actions.
7. Spend / Report: receipts, costs, export/report value.

## iOS Build Path

On the Mac before archive:

```sh
git pull origin main
npm install
npm run ios:release
open ios/App/App.xcodeproj
```

Then in Xcode:

1. Select the RT2RP app target.
2. Confirm signing team and bundle id.
3. Product > Clean Build Folder.
4. Product > Archive.
5. Distribute App > App Store Connect.

## Current Native Shell Standard

iOS should not feel like a web page squeezed into a WebView.

- Compact native-feeling header.
- No floating web help widget.
- Primary bottom navigation limited to Today, Timeline, Travel, Places, More.
- Safe-area aware top and bottom chrome.
- Logo, compass, route, fly / drive / train language only; no unrelated graphics.
- Real provider state shown when data is live, cached, missing, or unavailable.
