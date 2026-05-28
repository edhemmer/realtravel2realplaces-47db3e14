import type { CapacitorConfig } from '@capacitor/cli';
import '@capacitor/status-bar';

/**
 * Capacitor configuration for native iOS (and future Android) builds.
 *
 * Hot-reload from the Lovable sandbox is ENABLED BY DEFAULT for dev builds.
 * To produce a release `.ipa` that loads bundled assets (required for App
 * Store submission), set the env var before building:
 *
 *   CAP_RELEASE=1 npm run build && npx cap sync ios
 *
 * That drops the `server.url` block so the app boots from `dist/` instead of
 * the sandbox URL.
 */
const SANDBOX_URL =
  'https://314579f7-aa3c-49b7-b178-8640b495f1f7.lovableproject.com?forceHideBadge=true';

const isRelease = process.env.CAP_RELEASE === '1';

const config: CapacitorConfig = {
  appId: 'com.inlighttai.rt2rp',
  appName: 'realtravel2realplaces',
  webDir: 'dist',
  // Only attach the hot-reload server block for dev builds.
  ...(isRelease
    ? {}
    : {
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
