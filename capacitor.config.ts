import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for native iOS (and future Android) builds.
 *
 * The `server.url` block points the native WebView at the live Lovable sandbox
 * so the iOS app always runs the latest web build with real-time data
 * (maps, explore, location, weather, etc.). This is the "real-time connection"
 * mode — every launch fetches the current production-equivalent web app.
 *
 * IMPORTANT: For App Store / TestFlight archive builds you must disable the
 * server URL so Apple ships bundled assets. Set CAP_BUNDLED=1 before syncing:
 *
 *   CAP_BUNDLED=1 npx cap sync ios
 *
 * Then archive in Xcode. Omit the env var for normal dev / on-device testing.
 */
const SANDBOX_URL =
  'https://314579f7-aa3c-49b7-b178-8640b495f1f7.lovableproject.com?forceHideBadge=true';

const useBundled = process.env.CAP_BUNDLED === '1';

const config: CapacitorConfig = {
  appId: 'com.inlighttai.rt2rp',
  appName: 'realtravel2realplaces',
  webDir: 'dist',
  // Real-time mode: attach the live sandbox server unless explicitly bundling.
  ...(useBundled
    ? {}
    : {
        server: {
          url: SANDBOX_URL,
          cleartext: true,
          allowNavigation: [
            '*.lovableproject.com',
            '*.lovable.app',
            '*.supabase.co',
            'realtravel2realplaces.app',
            '*.realtravel2realplaces.app',
            // OAuth providers — WebView must be allowed to load these or
            // the Apple/Google sign-in flow renders as a blank screen.
            'appleid.apple.com',
            '*.apple.com',
            'accounts.google.com',
            '*.google.com',
            '*.googleusercontent.com',
          ],
        },
      }),
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#F6F8FB',
    },
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#F6F8FB',
      showSpinner: false,
    },
  },
};

export default config;
