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

console.log('iOS SwiftPM repair checks passed. Standard CapApp-SPM linkage is present.');
