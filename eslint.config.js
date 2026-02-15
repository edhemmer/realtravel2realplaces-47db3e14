import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  // Canonical time modules are ALLOWED to use Date() and parseISO — they are the policy layer
  {
    files: [
      // Canonical time modules — the ONLY place Date() is architecturally permitted
      "src/lib/canonicalTimePolicy.ts",
      "src/lib/canonicalTimeTypes.ts",
      "src/lib/canonicalTripState.ts",
      "src/lib/canonicalWeather.ts",
      "src/lib/canonicalTimeNormalizer.ts",
      "src/lib/canonicalNextStop.ts",
      "src/lib/canonicalTodayExecutionStack.ts",
      "src/lib/canonicalTodayCriticalActions.ts",
      "src/lib/canonicalParkingHighlight.ts",
      // Legacy modules pending migration (allowed for now)
      "src/lib/icsGenerator.ts",
      "src/lib/tourStopParsing.ts",
      "src/lib/stopParsing.ts",
      "src/lib/tripDateCalculations.ts",
      "src/lib/tripFrameResolver.ts",
      "src/lib/datetimeIntegrity.ts",
      // Display-only / export modules (Date used for "now" timestamps only)
      "src/lib/displayFormats.ts",
      "src/components/trips/tabs/TripSummaryReportTab.tsx",
      "src/pages/Reports.tsx",
      "src/pages/Admin*.tsx",
      // Hooks that need device clock for query filtering
      "src/hooks/useStopReminders.ts",
      "src/hooks/useParkingReminders.ts",
      "src/hooks/useTravelAlerts.ts",
      "src/hooks/useNotifications.ts",
      "src/hooks/useIdleLogout.ts",
      "src/hooks/useForegroundResume.ts",
      // Components with legacy Date usage pending migration
      "src/components/trips/TripHeaderWidgets.tsx",
      "src/components/trips/TripStatusHeroBar.tsx",
      "src/components/trips/ExpenseReminderBanner.tsx",
      "src/components/trips/ProRetentionCountdownCard.tsx",
      "src/components/notifications/NotificationBell.tsx",
      "src/components/trips/explore/**",
      "src/components/trips/now/**",
      "src/components/trips/tabs/SummaryTab.tsx",
      "src/components/trips/tabs/PackingTab.tsx",
      "src/components/trips/tabs/CompanionsTab.tsx",
      "src/components/trips/tabs/ExpensesTab.tsx",
      "src/components/cards/ExpenseCard.tsx",
      "src/types/exploreOrigin.ts",
      "src/containers/**",
      // Test files always exempted
      "src/**/__tests__/**",
      "src/test/**",
    ],
    rules: {
      "no-restricted-syntax": "off",
      "no-restricted-imports": "off",
    },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date']",
          message: "new Date() is banned outside canonical time modules. Use canonicalTimePolicy helpers (getTodayDateOnly, getNowLocalDateTime, etc.).",
        },
        {
          selector: "MemberExpression[object.name='Date'][property.name='parse']",
          message: "Date.parse() is banned. Use canonicalTimePolicy string comparisons.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "date-fns",
              importNames: ["parseISO", "parse"],
              message: "parseISO/parse from date-fns are banned. Use canonicalTimePolicy helpers.",
            },
          ],
        },
      ],
    },
  },
);
