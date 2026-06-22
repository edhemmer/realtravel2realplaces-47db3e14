import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import { bootstrapNativePlatform } from "./lib/native/nativeBootstrap";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// PWA auto-update service worker registration (web only — Capacitor ignores SW)
if (!__CAP_BUNDLED__) {
  registerSW({ immediate: true });
}

// Native (iOS/Android) bootstrap — no-op on web
bootstrapNativePlatform();
