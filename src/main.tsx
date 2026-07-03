import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { bootstrapNativePlatform } from "./lib/native/nativeBootstrap";

const rootElement = document.getElementById("root");
let booting = true;
let didRender = false;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderStartupFailure(error: unknown) {
  const message = escapeHtml(error instanceof Error ? error.message : "The app could not finish starting.");

  if (!rootElement) return;

  rootElement.innerHTML = `
    <main style="min-height:100vh;background:#07111f;color:#f8fafc;display:flex;align-items:center;justify-content:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <section style="width:100%;max-width:420px;border:1px solid rgba(148,163,184,.28);border-radius:24px;background:rgba(15,23,42,.92);box-shadow:0 24px 80px rgba(0,0,0,.35);padding:28px;">
        <p style="margin:0 0 10px;color:#38bdf8;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">RealTravel2RealPlaces</p>
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.15;">App startup needs attention</h1>
        <p style="margin:0 0 18px;color:#cbd5e1;font-size:15px;line-height:1.5;">${message}</p>
        <p style="margin:0 0 22px;color:#94a3b8;font-size:13px;line-height:1.45;">If this is iOS, rebuild the native bundle with npm run ios:release, then clean build in Xcode.</p>
        <button onclick="window.location.reload()" style="height:44px;width:100%;border:0;border-radius:14px;background:#38bdf8;color:#06111f;font-weight:800;font-size:15px;">Reload</button>
      </section>
    </main>
  `;
}

async function startApp() {
  if (!rootElement) {
    throw new Error("Missing root element.");
  }

  const { default: App } = await import("./App.tsx");

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );

  didRender = true;
  booting = false;

  window.setTimeout(() => {
    bootstrapNativePlatform().catch((error) => {
      console.warn("[native] bootstrap failed after first paint:", error);
    });
  }, 0);
}

window.addEventListener("error", (event) => {
  if (booting) renderStartupFailure(event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  if (booting) renderStartupFailure(event.reason);
});

startApp().catch((error) => {
  console.error("[startup] RT2RP failed to start:", error);
  renderStartupFailure(error);
}).finally(() => {
  if (!didRender) booting = false;
});
