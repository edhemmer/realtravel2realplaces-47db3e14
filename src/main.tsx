import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { bootstrapNativePlatform } from "./lib/native/nativeBootstrap";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Native (iOS/Android) bootstrap — no-op on web
bootstrapNativePlatform();
