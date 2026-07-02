import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const packagePath = join(process.cwd(), 'ios', 'App', 'CapApp-SPM', 'Package.swift');

if (!existsSync(packagePath)) {
  console.warn('CapApp-SPM Package.swift not found; run npx cap sync ios first.');
  process.exit(0);
}

const before = readFileSync(packagePath, 'utf8');
const after = before.replaceAll('\\', '/');

if (after !== before) {
  writeFileSync(packagePath, after);
  console.log('Normalized CapApp-SPM Package.swift paths for macOS SwiftPM.');
} else {
  console.log('CapApp-SPM Package.swift paths are already portable.');
}
