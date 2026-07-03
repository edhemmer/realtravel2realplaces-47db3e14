# CarPlay Scaffold

CarPlay is intentionally disabled for the production iOS target right now.

The phone app must launch reliably from the app icon before CarPlay is reintroduced. The app target currently uses the standard Capacitor path:

1. `Info.plist` declares `UIMainStoryboardFile` as `Main`.
2. `Main.storyboard` launches `CAPBridgeViewController` from the `Capacitor` module.
3. Capacitor loads the bundled web app from `ios/App/App/public`.

Do not add a `UIApplicationSceneManifest`, `CPTemplateApplicationSceneDelegate`, or CarPlay bridge plugin back into `ios/App/App.xcodeproj` until the phone app has a passing TestFlight launch build.

When CarPlay returns, add it as a separate reviewed change:

1. Add the CarPlay entitlement and confirm Apple approval for the app category.
2. Add the CarPlay scene manifest only for the CarPlay role.
3. Keep the phone app launch route on `CAPBridgeViewController`.
4. Add a native plugin only after a simulator/device launch test proves the app icon still opens the main app.
5. Archive and test a TestFlight build on a clean install before submission.
