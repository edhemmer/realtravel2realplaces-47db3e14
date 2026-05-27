import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for native iOS (and future Android) builds.
 *
 * The `server.url` enables hot-reload from the Lovable sandbox while developing.
 * Remove or comment out the `server` block before building a release `.ipa`
 * for App Store submission so the app loads its bundled web assets instead.
 */
const config: CapacitorConfig = {
  appId: 'app.lovable.314579f7aa3c49b7b1788640b495f1f7',
  appName: 'realtravel2realplaces',
  webDir: 'dist',
  server: {
    url: 'https://314579f7-aa3c-49b7-b178-8640b495f1f7.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
