import { existsSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const projectRoot = process.cwd();
const workspaceSwiftPM = join(
  projectRoot,
  'ios',
  'App',
  'App.xcodeproj',
  'project.xcworkspace',
  'xcshareddata',
  'swiftpm',
);
const packageResolved = join(
  projectRoot,
  'ios',
  'App',
  'App.xcodeproj',
  'project.xcworkspace',
  'xcshareddata',
  'swiftpm',
  'Package.resolved',
);
const xcodeDerivedData = join(homedir(), 'Library', 'Developer', 'Xcode', 'DerivedData');
const pbxprojPath = join(projectRoot, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const packagePath = join(projectRoot, 'ios', 'App', 'CapApp-SPM', 'Package.swift');
const requiredLocalPackages = [
  ['@capacitor-community/apple-sign-in', 'node_modules/@capacitor-community/apple-sign-in/Package.swift'],
  ['@capacitor/app', 'node_modules/@capacitor/app/Package.swift'],
  ['@capacitor/browser', 'node_modules/@capacitor/browser/Package.swift'],
  ['@capacitor/geolocation', 'node_modules/@capacitor/geolocation/Package.swift'],
  ['@capacitor/haptics', 'node_modules/@capacitor/haptics/Package.swift'],
  ['@capacitor/keyboard', 'node_modules/@capacitor/keyboard/Package.swift'],
  ['@capacitor/local-notifications', 'node_modules/@capacitor/local-notifications/Package.swift'],
  ['@capacitor/network', 'node_modules/@capacitor/network/Package.swift'],
  ['@capacitor/push-notifications', 'node_modules/@capacitor/push-notifications/Package.swift'],
  ['@capacitor/splash-screen', 'node_modules/@capacitor/splash-screen/Package.swift'],
  ['@capacitor/status-bar', 'node_modules/@capacitor/status-bar/Package.swift'],
];

function removePath(path, label) {
  if (!existsSync(path)) return;
  rmSync(path, { recursive: true, force: true });
  console.log(`Removed ${label}: ${path}`);
}

removePath(packageResolved, 'stale Package.resolved');
removePath(workspaceSwiftPM, 'project SwiftPM cache');

if (existsSync(xcodeDerivedData)) {
  for (const entry of ['App-', 'RealTravel2RealPlaces-']) {
    // DerivedData folders include random suffixes; remove only this app's likely folders.
    const candidates = [];
    try {
      const { readdirSync } = await import('node:fs');
      for (const name of readdirSync(xcodeDerivedData)) {
        if (name.startsWith(entry)) candidates.push(join(xcodeDerivedData, name));
      }
    } catch {
      // Ignore DerivedData cleanup if the directory cannot be read.
    }
    for (const candidate of candidates) removePath(candidate, 'Xcode DerivedData');
  }
}

if (!existsSync(pbxprojPath)) {
  throw new Error('Missing ios/App/App.xcodeproj/project.pbxproj');
}

if (!existsSync(packagePath)) {
  throw new Error('Missing ios/App/CapApp-SPM/Package.swift; run npm run ios:sync first.');
}

const pbxproj = readFileSync(pbxprojPath, 'utf8');
const packageSwift = readFileSync(packagePath, 'utf8');

if (!pbxproj.includes('/* CapApp-SPM in Frameworks */') || !pbxproj.includes('productName = "CapApp-SPM"')) {
  throw new Error('Xcode project is missing standard CapApp-SPM linkage. Pull latest main and rerun npm run ios:repair.');
}

if (packageSwift.includes('\\')) {
  throw new Error('CapApp-SPM Package.swift still contains Windows backslashes. Run node scripts/normalize-capapp-spm.mjs.');
}

const missingPackages = requiredLocalPackages.filter(([, relativePath]) => !existsSync(join(projectRoot, relativePath)));
if (missingPackages.length > 0) {
  const missingList = missingPackages.map(([name]) => `- ${name}`).join('\n');
  throw new Error(
    `Capacitor local Swift packages are missing under node_modules:\n${missingList}\n\nRun npm install, then npm run ios:repair before opening Xcode.`,
  );
}

console.log('iOS SwiftPM repair checks passed. Standard CapApp-SPM linkage and local Capacitor packages are present.');
