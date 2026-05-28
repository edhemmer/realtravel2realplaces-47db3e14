#!/usr/bin/env node
/**
 * Generates the iOS AppIcon set from resources/app-icon.png.
 *
 * Usage (run on the Mac after `git pull`):
 *   npm i -D sharp
 *   node scripts/generate-ios-icons.mjs
 *   npx cap sync ios
 *
 * Then archive in Xcode. The source PNG must be 1024x1024, RGB (no alpha).
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const SRC = "resources/app-icon.png";
const OUT = "ios/App/App/Assets.xcassets/AppIcon.appiconset";

if (!existsSync(SRC)) {
  console.error(`Missing ${SRC}`);
  process.exit(1);
}
if (!existsSync("ios/App")) {
  console.error("No ios/ folder. Run `npx cap add ios` first.");
  process.exit(1);
}

// Single-size modern iOS app icon (Xcode 14+).
const sizes = [
  { name: "AppIcon-512@2x.png", size: 1024 },
  // Legacy sizes (safe to keep for older Xcode templates):
  { name: "AppIcon-20@2x.png", size: 40 },
  { name: "AppIcon-20@3x.png", size: 60 },
  { name: "AppIcon-29@2x.png", size: 58 },
  { name: "AppIcon-29@3x.png", size: 87 },
  { name: "AppIcon-40@2x.png", size: 80 },
  { name: "AppIcon-40@3x.png", size: 120 },
  { name: "AppIcon-60@2x.png", size: 120 },
  { name: "AppIcon-60@3x.png", size: 180 },
  { name: "AppIcon-20.png", size: 20 },
  { name: "AppIcon-20@2x-1.png", size: 40 },
  { name: "AppIcon-29.png", size: 29 },
  { name: "AppIcon-29@2x-1.png", size: 58 },
  { name: "AppIcon-40.png", size: 40 },
  { name: "AppIcon-40@2x-1.png", size: 80 },
  { name: "AppIcon-76.png", size: 76 },
  { name: "AppIcon-76@2x.png", size: 152 },
  { name: "AppIcon-83.5@2x.png", size: 167 },
];

await mkdir(OUT, { recursive: true });

for (const { name, size } of sizes) {
  await sharp(SRC)
    .resize(size, size, { fit: "cover" })
    .removeAlpha()
    .flatten({ background: { r: 10, g: 25, b: 60 } })
    .png()
    .toFile(path.join(OUT, name));
  console.log(`✓ ${name} (${size}x${size})`);
}

// Minimal Contents.json that points the universal slot at the 1024 image.
const contents = {
  images: [
    { idiom: "universal", platform: "ios", size: "1024x1024", filename: "AppIcon-512@2x.png" },
  ],
  info: { author: "xcode", version: 1 },
};
await writeFile(path.join(OUT, "Contents.json"), JSON.stringify(contents, null, 2));
console.log("✓ Contents.json");
console.log("\nDone. Now run: npx cap sync ios && open ios/App/App.xcworkspace");
