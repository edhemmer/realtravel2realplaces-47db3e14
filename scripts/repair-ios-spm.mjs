#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const projectFile = join(root, 'ios/App/App.xcodeproj/project.pbxproj');
const packageFile = join(root, 'ios/App/CapApp-SPM/Package.swift');
const workspaceSwiftpm = join(root, 'ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm');
const workspaceResolved = join(root, 'ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/Package.resolved');

function removeIfPresent(path) {
  if (existsSync(path)) rmSync(path, { recursive: true, force: true });
}

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

if (!existsSync(projectFile)) fail('Missing ios/App/App.xcodeproj/project.pbxproj');

removeIfPresent(workspaceSwiftpm);
removeIfPresent(workspaceResolved);

const derivedData = join(homedir(), 'Library/Developer/Xcode/DerivedData');
if (existsSync(derivedData)) {
  for (const entry of readdirSync(derivedData)) {
    if (entry.startsWith('App-')) removeIfPresent(join(derivedData, entry));
  }
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const sync = spawnSync(npx, ['cap', 'sync', 'ios'], { stdio: 'inherit' });
if (sync.status !== 0) fail('Capacitor iOS sync failed. Run npm install, then retry npm run ios:repair-spm.');

if (!existsSync(packageFile)) fail('CapApp-SPM/Package.swift was not generated.');

const pbx = readFileSync(projectFile, 'utf8');
const pkg = readFileSync(packageFile, 'utf8');

for (const marker of [
  'XCLocalSwiftPackageReference "CapApp-SPM"',
  'relativePath = "CapApp-SPM";',
  'productName = "CapApp-SPM";',
]) {
  if (!pbx.includes(marker)) fail(`Xcode project is missing ${marker}`);
}

const packagePaths = [...pkg.matchAll(/\.package\(name: "([^"]+)", path: "([^"]+)"\)/g)];
for (const [, name, relativePath] of packagePaths) {
  const absolutePath = resolve(root, 'ios/App/CapApp-SPM', relativePath);
  if (!existsSync(absolutePath)) fail(`${name} path does not exist: ${absolutePath}`);
}

console.log('\n✓ iOS SPM package metadata repaired. Close Xcode, then open ios/App/App.xcodeproj.');