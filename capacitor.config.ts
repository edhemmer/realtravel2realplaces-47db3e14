import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for native iOS (and future Android) builds.
 *
 * Native builds load bundled assets by default so iOS Simulator, TestFlight,
 * and App Store archives cannot accidentally point at the Lovable sandbox.
 *
 * To intentionally hot-reload from the Lovable sandbox while developing, run:
 *
 *   CAP_DEV_SERVER=1 npx cap sync ios && CAP_DEV_SERVER=1 npx cap run ios
 */
const SANDBOX_URL =
  'https://314579f7-aa3c-49b7-b178-8640b495f1f7.lovableproject.com?forceHideBadge=true';

const useDevServer = process.env.CAP_DEV_SERVER === '1';

const config: CapacitorConfig = {
  appId: 'com.inlighttai.rt2rp',
  appName: 'realtravel2realplaces',
  webDir: 'dist',
  // Only attach the hot-reload server block when explicitly requested.
  ...(useDevServer
    ? {
        server: {
          url: SANDBOX_URL,
          cleartext: true,
          // Keep navigation inside the sandbox + Supabase auth callbacks
          // from being treated as external links by the WebView.
          allowNavigation: [
            '*.lovableproject.com',
            '*.lovable.app',
            '*.supabase.co',
          ],
        },
      }
    : {}),
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
