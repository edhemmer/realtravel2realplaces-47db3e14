import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iosPublicDir = path.join(root, "ios", "App", "App", "public");
const iosProjectFile = path.join(root, "ios", "App", "App.xcodeproj", "project.pbxproj");
const iosStoryboardFile = path.join(root, "ios", "App", "App", "Base.lproj", "Main.storyboard");
const iosInfoPlistFile = path.join(root, "ios", "App", "App", "Info.plist");
const iosCapConfigFile = path.join(root, "ios", "App", "App", "capacitor.config.json");
const iosSpmPackageFile = path.join(root, "ios", "App", "CapApp-SPM", "Package.swift");
const expectedPublicDir = path.normalize(path.join("ios", "App", "App", "public"));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      CAP_BUNDLED: "1",
      CAP_DEV_SERVER: "0",
    },
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function cleanIosPublic() {
  const relativeTarget = path.normalize(path.relative(root, iosPublicDir));

  if (relativeTarget !== expectedPublicDir) {
    throw new Error(`Refusing to clean unexpected iOS public path: ${iosPublicDir}`);
  }

  rmSync(iosPublicDir, { recursive: true, force: true });
}

function requireFile(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${path.relative(root, filePath)}`);
  }

  return readFileSync(filePath, "utf8");
}

function requireText(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`iOS launch linkage is incomplete: expected ${label}`);
  }
}

function rejectText(source, unexpected, label) {
  if (source.includes(unexpected)) {
    throw new Error(`iOS launch linkage is unsafe: found ${label}`);
  }
}

function validateIosLaunchLinkage() {
  const indexHtml = requireFile(path.join(iosPublicDir, "index.html"), "bundled iOS index.html");
  const assetsDir = path.join(iosPublicDir, "assets");
  if (!existsSync(assetsDir)) {
    throw new Error(`Missing bundled iOS assets directory: ${path.relative(root, assetsDir)}`);
  }

  rejectText(indexHtml, "registerSW.js", "PWA service worker registration in iOS index.html");
  rejectText(indexHtml, "manifest.webmanifest", "PWA manifest reference in iOS index.html");
  rejectText(indexHtml, 'src="/assets/', "absolute iOS script asset path");
  rejectText(indexHtml, 'href="/assets/', "absolute iOS stylesheet asset path");
  requireText(indexHtml, 'src="./assets/', "relative iOS script asset path");

  const capConfig = requireFile(iosCapConfigFile, "iOS capacitor.config.json");
  rejectText(capConfig, '"server"', "remote/dev server config in iOS capacitor.config.json");
  requireText(capConfig, '"packageClassList"', "Capacitor SwiftPM plugin registration list");

  const storyboard = requireFile(iosStoryboardFile, "iOS Main.storyboard");
  requireText(storyboard, 'customClass="CAPBridgeViewController"', "CAPBridgeViewController in Main.storyboard");
  requireText(storyboard, 'customModule="Capacitor"', "Capacitor storyboard module");

  const infoPlist = requireFile(iosInfoPlistFile, "iOS Info.plist");
  requireText(infoPlist, "<key>UIMainStoryboardFile</key>", "main storyboard entry in Info.plist");
  rejectText(infoPlist, "UIApplicationSceneManifest", "scene manifest that bypasses storyboard launch");

  const project = requireFile(iosProjectFile, "Xcode project file");
  requireText(project, "CapApp-SPM in Frameworks", "CapApp-SPM linked in app Frameworks phase");
  requireText(project, "public in Resources", "public folder copied into app resources");
  requireText(project, 'relativePath = "CapApp-SPM"', "local CapApp-SPM package reference");

  const packageSwift = requireFile(iosSpmPackageFile, "CapApp-SPM Package.swift");
  requireText(packageSwift, 'name: "CapApp-SPM"', "CapApp-SPM package/product name");
  requireText(packageSwift, 'exact: "8.3.4"', "Capacitor SwiftPM version matching package.json");
}

console.log("Building RT2RP as a bundled Capacitor iOS release...");
cleanIosPublic();
run(process.execPath, ["node_modules/vite/bin/vite.js", "build"]);
run(process.execPath, ["node_modules/@capacitor/cli/bin/capacitor", "sync", "ios"]);
run(process.execPath, ["scripts/normalize-capapp-spm.mjs"]);
run(process.execPath, ["scripts/patch-ios-spm-compat.mjs"]);
validateIosLaunchLinkage();
console.log("iOS launch linkage verified.");
console.log("Open ios/App/App.xcodeproj in Xcode. This SwiftPM project does not use App.xcworkspace.");
