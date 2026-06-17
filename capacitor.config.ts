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
const useDevServer = process.env.CAP_DEV_SERVER === '1';

const config: CapacitorConfig = {
  appId: 'com.inlighttai.rt2rp',
  appName: 'realtravel2realplaces',
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
