import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const capacitorSwiftPmVersion = '8.3.4';
const appleSignInPackage = join(
  process.cwd(),
  'node_modules',
  '@capacitor-community',
  'apple-sign-in',
  'Package.swift',
);

if (!existsSync(appleSignInPackage)) {
  console.warn('Apple Sign-In Package.swift not found; run npm install before iOS repair.');
  process.exit(0);
}

const before = readFileSync(appleSignInPackage, 'utf8');
const after = before.replace(
  '.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "7.0.0")',
  `.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "${capacitorSwiftPmVersion}")`,
);

if (after !== before) {
  writeFileSync(appleSignInPackage, after);
  console.log(`Patched Apple Sign-In SwiftPM dependency for Capacitor ${capacitorSwiftPmVersion}.`);
} else if (after.includes(`exact: "${capacitorSwiftPmVersion}"`)) {
  console.log('Apple Sign-In SwiftPM dependency is already patched for Capacitor 8.');
} else {
  throw new Error('Could not patch Apple Sign-In Package.swift; inspect node_modules/@capacitor-community/apple-sign-in/Package.swift.');
}
