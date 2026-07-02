import { rmSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iosPublicDir = path.join(root, "ios", "App", "App", "public");
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

console.log("Building RT2RP as a bundled Capacitor iOS release...");
cleanIosPublic();
run(process.execPath, ["node_modules/vite/bin/vite.js", "build"]);
run(process.execPath, ["node_modules/@capacitor/cli/bin/capacitor", "sync", "ios"]);
run(process.execPath, ["scripts/normalize-capapp-spm.mjs"]);
run(process.execPath, ["scripts/patch-ios-spm-compat.mjs"]);
console.log("iOS bundle is ready. Open ios/App/App.xcworkspace in Xcode.");
