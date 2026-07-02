import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
const appleSignInPackagePath = join(projectRoot, 'node_modules', '@capacitor-community', 'apple-sign-in', 'Package.swift');
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

const capAppSpm = {
  buildFileId: '4D22ABE92AF431CB00220026',
  productId: '4D22ABE82AF431CB00220026',
  packageId: 'D4C12C0A2AAA248700AAC8A2',
};

function ensureLineInBlock(source, blockStartPattern, line, label) {
  if (source.includes(line)) return source;

  const startMatch = source.match(blockStartPattern);
  if (!startMatch?.index && startMatch?.index !== 0) {
    throw new Error(`Could not find ${label} block while restoring CapApp-SPM linkage.`);
  }

  const insertAt = startMatch.index + startMatch[0].length;
  return `${source.slice(0, insertAt)}${line}\n${source.slice(insertAt)}`;
}

function ensureCapAppSpmLinkage() {
  let pbxproj = readFileSync(pbxprojPath, 'utf8');
  const before = pbxproj;

  const buildFileLine = `\t\t${capAppSpm.buildFileId} /* CapApp-SPM in Frameworks */ = {isa = PBXBuildFile; productRef = ${capAppSpm.productId} /* CapApp-SPM */; };`;
  const frameworksLine = `\t\t\t\t${capAppSpm.buildFileId} /* CapApp-SPM in Frameworks */,`;
  const targetDependencyLine = `\t\t\t\t${capAppSpm.productId} /* CapApp-SPM */,`;
  const projectPackageLine = `\t\t\t\t${capAppSpm.packageId} /* XCLocalSwiftPackageReference "CapApp-SPM" */,`;
  const packageReferenceBlock = `\n/* Begin XCLocalSwiftPackageReference section */\n\t\t${capAppSpm.packageId} /* XCLocalSwiftPackageReference "CapApp-SPM" */ = {\n\t\t\tisa = XCLocalSwiftPackageReference;\n\t\t\trelativePath = "CapApp-SPM";\n\t\t};\n/* End XCLocalSwiftPackageReference section */\n`;
  const packageProductBlock = `\n/* Begin XCSwiftPackageProductDependency section */\n\t\t${capAppSpm.productId} /* CapApp-SPM */ = {\n\t\t\tisa = XCSwiftPackageProductDependency;\n\t\t\tpackage = ${capAppSpm.packageId} /* XCLocalSwiftPackageReference "CapApp-SPM" */;\n\t\t\tproductName = "CapApp-SPM";\n\t\t};\n/* End XCSwiftPackageProductDependency section */\n`;

  pbxproj = ensureLineInBlock(pbxproj, /\/\* Begin PBXBuildFile section \*\/\r?\n/, `${buildFileLine}`, 'PBXBuildFile');
  pbxproj = ensureLineInBlock(
    pbxproj,
    /504EC3011FED79650016851F \/\* Frameworks \*\/ = \{\r?\n\t\t\tisa = PBXFrameworksBuildPhase;\r?\n\t\t\tbuildActionMask = 2147483647;\r?\n\t\t\tfiles = \(\r?\n/,
    frameworksLine,
    'Frameworks build phase',
  );
  pbxproj = ensureLineInBlock(pbxproj, /packageProductDependencies = \(\r?\n/, targetDependencyLine, 'target packageProductDependencies');
  pbxproj = ensureLineInBlock(pbxproj, /packageReferences = \(\r?\n/, projectPackageLine, 'project packageReferences');

  if (!pbxproj.includes('/* Begin XCLocalSwiftPackageReference section */')) {
    pbxproj = pbxproj.replace(/\n\/\* Begin XCSwiftPackageProductDependency section \*\//, `${packageReferenceBlock}\n/* Begin XCSwiftPackageProductDependency section */`);
  } else if (!pbxproj.includes(`${capAppSpm.packageId} /* XCLocalSwiftPackageReference "CapApp-SPM" */ = {`)) {
    pbxproj = pbxproj.replace(
      /\/\* End XCLocalSwiftPackageReference section \*\//,
      `\t\t${capAppSpm.packageId} /* XCLocalSwiftPackageReference "CapApp-SPM" */ = {\n\t\t\tisa = XCLocalSwiftPackageReference;\n\t\t\trelativePath = "CapApp-SPM";\n\t\t};\n/* End XCLocalSwiftPackageReference section */`,
    );
  }

  if (!pbxproj.includes('/* Begin XCSwiftPackageProductDependency section */')) {
    pbxproj = pbxproj.replace(/\n\t\};\r?\n\trootObject = /, `${packageProductBlock}\n\t};\n\trootObject = `);
  } else if (!pbxproj.includes(`${capAppSpm.productId} /* CapApp-SPM */ = {`)) {
    pbxproj = pbxproj.replace(
      /\/\* End XCSwiftPackageProductDependency section \*\//,
      `\t\t${capAppSpm.productId} /* CapApp-SPM */ = {\n\t\t\tisa = XCSwiftPackageProductDependency;\n\t\t\tpackage = ${capAppSpm.packageId} /* XCLocalSwiftPackageReference "CapApp-SPM" */;\n\t\t\tproductName = "CapApp-SPM";\n\t\t};\n/* End XCSwiftPackageProductDependency section */`,
    );
  }

  if (pbxproj !== before) {
    writeFileSync(pbxprojPath, pbxproj);
    console.log('Restored CapApp-SPM linkage in App.xcodeproj.');
  }
}

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

ensureCapAppSpmLinkage();

const pbxproj = readFileSync(pbxprojPath, 'utf8');
const packageSwift = readFileSync(packagePath, 'utf8');
const appleSignInPackage = existsSync(appleSignInPackagePath) ? readFileSync(appleSignInPackagePath, 'utf8') : '';

if (!pbxproj.includes('/* CapApp-SPM in Frameworks */') || !pbxproj.includes('productName = "CapApp-SPM"')) {
  throw new Error('Xcode project is missing standard CapApp-SPM linkage. Pull latest main and rerun npm run ios:repair.');
}

if (packageSwift.includes('\\')) {
  throw new Error('CapApp-SPM Package.swift still contains Windows backslashes. Run node scripts/normalize-capapp-spm.mjs.');
}

if (appleSignInPackage.includes('from: "7.0.0"')) {
  throw new Error('Apple Sign-In still points SwiftPM at Capacitor 7. Run node scripts/patch-ios-spm-compat.mjs, then rerun npm run ios:repair.');
}

const missingPackages = requiredLocalPackages.filter(([, relativePath]) => !existsSync(join(projectRoot, relativePath)));
if (missingPackages.length > 0) {
  const missingList = missingPackages.map(([name]) => `- ${name}`).join('\n');
  throw new Error(
    `Capacitor local Swift packages are missing under node_modules:\n${missingList}\n\nRun npm install, then npm run ios:repair before opening Xcode.`,
  );
}

console.log('iOS SwiftPM repair checks passed. Standard CapApp-SPM linkage and local Capacitor packages are present.');
