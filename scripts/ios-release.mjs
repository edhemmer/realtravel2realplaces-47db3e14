import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
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
const iosAppIconDir = path.join(root, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset");
const expectedPublicDir = path.normalize(path.join("ios", "App", "App", "public"));
const requiredViteEnv = [
  "VITE_SUPABASE_PROJECT_ID",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
];

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

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return values;

      const separator = trimmed.indexOf("=");
      if (separator === -1) return values;

      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      values[key] = value;
      return values;
    }, {});
}

function validateNativeSupabaseEnv() {
  const envValues = {
    ...parseEnvFile(path.join(root, ".env")),
    ...parseEnvFile(path.join(root, ".env.local")),
    ...process.env,
  };

  const missing = requiredViteEnv.filter((key) => !envValues[key]);
  if (missing.length > 0) {
    throw new Error(
      [
        `Missing native iOS Supabase env: ${missing.join(", ")}.`,
        "Create .env.local on this Mac before building iOS.",
        "Fast path: cp .env.example .env.local",
      ].join("\n")
    );
  }

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(envValues.VITE_SUPABASE_URL)) {
    throw new Error("VITE_SUPABASE_URL must be a Supabase project URL, for example https://project-ref.supabase.co.");
  }

  if (!/^sb_publishable_/i.test(envValues.VITE_SUPABASE_PUBLISHABLE_KEY)) {
    throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY must be the Supabase publishable key, not the service role key.");
  }
}

function getPngInfo(filePath) {
  const buffer = readFileSync(filePath);
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error(`Icon is not a PNG: ${path.relative(root, filePath)}`);
  }

  const chunkType = buffer.subarray(12, 16).toString("ascii");
  if (chunkType !== "IHDR") {
    throw new Error(`Icon PNG is missing IHDR: ${path.relative(root, filePath)}`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer[24],
    colorType: buffer[25],
    interlace: buffer[28],
  };
}

function validateIconEntry(entry, requiredLabel) {
  const iconPath = path.join(iosAppIconDir, entry.filename);
  if (!existsSync(iconPath)) {
    throw new Error(`Missing ${requiredLabel} icon file: ${entry.filename}`);
  }

  const size = Number.parseFloat(entry.size.split("x")[0]);
  const scale = Number.parseInt(entry.scale.replace("x", ""), 10);
  const expectedPixels = Math.round(size * scale);
  const info = getPngInfo(iconPath);

  if (info.width !== expectedPixels || info.height !== expectedPixels) {
    throw new Error(
      `${requiredLabel} icon ${entry.filename} is ${info.width}x${info.height}, expected ${expectedPixels}x${expectedPixels}`
    );
  }
  if (info.bitDepth !== 8 || info.colorType !== 2 || info.interlace !== 0) {
    throw new Error(
      `${requiredLabel} icon ${entry.filename} must be 8-bit RGB, non-interlaced, no alpha. Got bitDepth=${info.bitDepth}, colorType=${info.colorType}, interlace=${info.interlace}`
    );
  }
}

function validateIosAppIcons(infoPlist) {
  requireText(infoPlist, "<key>CFBundleIconName</key>", "CFBundleIconName in Info.plist");
  requireText(infoPlist, "<string>AppIcon</string>", "AppIcon bundle icon name in Info.plist");
  rejectText(infoPlist, "<key>CFBundleIconFiles</key>", "loose icon file references in Info.plist");

  const contents = JSON.parse(requireFile(path.join(iosAppIconDir, "Contents.json"), "AppIcon Contents.json"));
  const entries = contents.images ?? [];
  const pngFiles = new Set(readdirSync(iosAppIconDir).filter((name) => name.endsWith(".png")));
  const listedFiles = new Set(entries.map((entry) => entry.filename));

  for (const fileName of pngFiles) {
    if (!listedFiles.has(fileName)) {
      throw new Error(`Unlisted app icon file in AppIcon.appiconset: ${fileName}`);
    }
  }

  const requiredSlots = [
    ["iphone", "20x20", "2x"],
    ["iphone", "20x20", "3x"],
    ["iphone", "29x29", "2x"],
    ["iphone", "29x29", "3x"],
    ["iphone", "40x40", "2x"],
    ["iphone", "40x40", "3x"],
    ["iphone", "60x60", "2x"],
    ["iphone", "60x60", "3x"],
    ["ipad", "20x20", "1x"],
    ["ipad", "20x20", "2x"],
    ["ipad", "29x29", "1x"],
    ["ipad", "29x29", "2x"],
    ["ipad", "40x40", "1x"],
    ["ipad", "40x40", "2x"],
    ["ipad", "76x76", "1x"],
    ["ipad", "76x76", "2x"],
    ["ipad", "83.5x83.5", "2x"],
    ["ios-marketing", "1024x1024", "1x"],
  ];

  for (const [idiom, size, scale] of requiredSlots) {
    const entry = entries.find((candidate) => (
      candidate.idiom === idiom && candidate.size === size && candidate.scale === scale
    ));
    if (!entry?.filename) {
      throw new Error(`Missing required App Store icon slot: ${idiom} ${size} ${scale}`);
    }
    validateIconEntry(entry, `${idiom} ${size} ${scale}`);
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
  validateIosAppIcons(infoPlist);

  const project = requireFile(iosProjectFile, "Xcode project file");
  requireText(project, "CapApp-SPM in Frameworks", "CapApp-SPM linked in app Frameworks phase");
  requireText(project, "public in Resources", "public folder copied into app resources");
  requireText(project, 'relativePath = "CapApp-SPM"', "local CapApp-SPM package reference");

  const packageSwift = requireFile(iosSpmPackageFile, "CapApp-SPM Package.swift");
  requireText(packageSwift, 'name: "CapApp-SPM"', "CapApp-SPM package/product name");
  requireText(packageSwift, 'exact: "8.3.4"', "Capacitor SwiftPM version matching package.json");
}

console.log("Building RT2RP as a bundled Capacitor iOS release...");
validateNativeSupabaseEnv();
cleanIosPublic();
run(process.execPath, ["node_modules/vite/bin/vite.js", "build"]);
run(process.execPath, ["node_modules/@capacitor/cli/bin/capacitor", "sync", "ios"]);
run(process.execPath, ["scripts/normalize-capapp-spm.mjs"]);
run(process.execPath, ["scripts/patch-ios-spm-compat.mjs"]);
validateIosLaunchLinkage();
console.log("iOS launch linkage verified.");
console.log("Open ios/App/App.xcodeproj in Xcode. This SwiftPM project does not use App.xcworkspace.");
