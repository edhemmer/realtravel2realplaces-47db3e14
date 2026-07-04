import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredEnv = [
  "VITE_SUPABASE_PROJECT_ID",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
];

const requiredRedirects = [
  "https://realtravel2realplaces.app/auth/callback",
  "https://www.realtravel2realplaces.app/auth/callback",
  "https://realtravel2realplaces.app/reset-password",
  "https://www.realtravel2realplaces.app/reset-password",
];

const checks = [];

function pass(label) {
  checks.push({ ok: true, label });
}

function fail(label, detail) {
  checks.push({ ok: false, label, detail });
}

function read(filePath) {
  return readFileSync(path.join(root, filePath), "utf8");
}

function parseEnvFile(filePath) {
  const absolute = path.join(root, filePath);
  if (!existsSync(absolute)) return {};

  return readFileSync(absolute, "utf8")
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

function auditEnv() {
  const values = {
    ...parseEnvFile(".env"),
    ...parseEnvFile(".env.local"),
    ...process.env,
  };

  const missing = requiredEnv.filter((key) => !values[key]);
  if (missing.length) {
    fail("Supabase Vite env", `Missing ${missing.join(", ")}. Create .env.local from .env.example before iOS release.`);
  } else {
    pass("Supabase Vite env present");
  }

  if (values.VITE_SUPABASE_URL && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(values.VITE_SUPABASE_URL)) {
    fail("Supabase URL shape", "VITE_SUPABASE_URL is not a Supabase project URL.");
  } else if (values.VITE_SUPABASE_URL) {
    pass("Supabase URL shape");
  }

  if (values.VITE_SUPABASE_PUBLISHABLE_KEY && !/^sb_publishable_/i.test(values.VITE_SUPABASE_PUBLISHABLE_KEY)) {
    fail("Supabase publishable key shape", "Use the publishable key, not service_role or secret keys.");
  } else if (values.VITE_SUPABASE_PUBLISHABLE_KEY) {
    pass("Supabase publishable key shape");
  }
}

function auditNativeFiles() {
  const capConfig = read("ios/App/App/capacitor.config.json");
  const infoPlist = read("ios/App/App/Info.plist");
  const entitlements = read("ios/App/App/App.entitlements");
  const project = read("ios/App/App.xcodeproj/project.pbxproj");

  if (capConfig.includes('"server"')) {
    fail("Capacitor release config", "iOS release config contains a remote/dev server block.");
  } else {
    pass("Capacitor release config is bundled");
  }

  if (capConfig.includes('"SignInWithApple"')) {
    pass("Apple Sign-In Capacitor plugin registered");
  } else {
    fail("Apple Sign-In Capacitor plugin", "SignInWithApple is missing from packageClassList.");
  }

  if (entitlements.includes("com.apple.developer.applesignin")) {
    pass("Apple Sign-In entitlement present");
  } else {
    fail("Apple Sign-In entitlement", "Missing com.apple.developer.applesignin in App.entitlements.");
  }

  if (project.includes("CODE_SIGN_ENTITLEMENTS = App/App.entitlements")) {
    pass("Xcode target links entitlements");
  } else {
    fail("Xcode target entitlements", "App target is not linked to App/App.entitlements.");
  }

  if (infoPlist.includes("<string>com.inlighttai.rt2rp</string>") && project.includes("PRODUCT_BUNDLE_IDENTIFIER = com.inlighttai.rt2rp")) {
    pass("iOS bundle identifier is consistent");
  } else {
    fail("iOS bundle identifier", "Info.plist and Xcode project should both use com.inlighttai.rt2rp.");
  }
}

function auditAuthCode() {
  const authContext = read("src/contexts/AuthContext.tsx");
  const authPage = read("src/pages/Auth.tsx");
  const forgotPassword = read("src/pages/ForgotPassword.tsx");
  const redirects = read("src/lib/auth/authRedirects.ts");

  if (
    authContext.includes("authCallbackUrl()") &&
    authPage.includes("authCallbackUrl(redirectTo)") &&
    forgotPassword.includes("passwordResetUrl()") &&
    redirects.includes("https://realtravel2realplaces.app")
  ) {
    pass("Auth redirects use production-safe native URLs");
  } else {
    fail("Auth redirects", "Signup, OAuth, and password reset should use src/lib/auth/authRedirects.ts.");
  }

  if (authPage.includes("signInWithIdToken") && authPage.includes("provider: 'apple'")) {
    pass("Native Apple token handoff uses Supabase");
  } else {
    fail("Native Apple token handoff", "Apple identity token is not passed to Supabase signInWithIdToken.");
  }
}

function auditBundledIosAssets() {
  const assetsDir = path.join(root, "ios", "App", "App", "public", "assets");
  if (!existsSync(assetsDir)) {
    fail("Bundled iOS assets", "Run npm run ios:release before archive.");
    return;
  }

  const js = readdirSync(assetsDir)
    .filter((name) => name.endsWith(".js"))
    .map((name) => readFileSync(path.join(assetsDir, name), "utf8"))
    .join("\n");

  if (js.includes("missing-supabase-config.supabase.co") || js.includes("missing-supabase-publishable-key")) {
    fail("Bundled Supabase config", "iOS bundle contains placeholder Supabase config.");
  } else if (js.includes(".supabase.co") && js.includes("sb_publishable_")) {
    pass("Bundled Supabase config is real");
  } else {
    fail("Bundled Supabase config", "Could not find Supabase URL/key in iOS JS bundle.");
  }

  if (js.includes("capacitor://localhost/auth/callback")) {
    fail("Bundled auth callback", "iOS bundle still contains capacitor://localhost auth callback.");
  } else {
    pass("Bundled auth callback avoids capacitor origin");
  }
}

function printManualChecklist() {
  console.log("\nManual Supabase dashboard checks required:");
  console.log("- Auth > URL Configuration > Site URL: https://realtravel2realplaces.app");
  console.log("- Auth > URL Configuration > Redirect URLs include:");
  for (const redirect of requiredRedirects) {
    console.log(`  - ${redirect}`);
  }
  console.log("- Auth > Providers > Apple enabled.");
  console.log("- Apple provider client IDs include the iOS bundle ID: com.inlighttai.rt2rp");
  console.log("- Apple developer account has Sign in with Apple enabled for the same App ID.");
}

auditEnv();
auditNativeFiles();
auditAuthCode();
auditBundledIosAssets();

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

printManualChecklist();

const failures = checks.filter((check) => !check.ok);
if (failures.length) {
  process.exitCode = 1;
}
