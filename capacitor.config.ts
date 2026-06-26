import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for native iOS (and future Android) builds.
 *
 * App Store and TestFlight builds ship bundled assets from `dist`. For local
 * native development, set CAP_DEV_SERVER=1 and optionally CAP_DEV_SERVER_URL
 * to point the WebView at a running Vite server:
 *
 *   CAP_DEV_SERVER=1 CAP_DEV_SERVER_URL=http://localhost:8080 npx cap run ios
 */
const devServerUrl = process.env.CAP_DEV_SERVER_URL ?? 'http://localhost:8080';
const isBundledRelease = process.env.CAP_BUNDLED === '1';
const useDevServer = !isBundledRelease && process.env.CAP_DEV_SERVER === '1';

const config: CapacitorConfig = {
  appId: 'com.inlighttai.rt2rp',
  appName: 'RealTravel2RealPlaces',
  webDir: 'dist',
  ...(useDevServer
    ? {
        server: {
          url: devServerUrl,
          cleartext: true,
          allowNavigation: [
            '*.supabase.co',
            'realtravel2realplaces.app',
            '*.realtravel2realplaces.app',
            // OAuth providers - WebView must be allowed to load these or
            // the Apple/Google sign-in flow renders as a blank screen.
            'appleid.apple.com',
            '*.apple.com',
            'accounts.google.com',
            '*.google.com',
            '*.googleusercontent.com',
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
      style: 'LIGHT',
      backgroundColor: '#07111F',
    },
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#07111F',
      showSpinner: false,
    },
  },
};

export default config;
