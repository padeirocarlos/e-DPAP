import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "@/App";
import "@/index.css";

// Service worker: offline support + auto-update to the latest deployed version
// when online. `autoUpdate` reloads once when a genuinely new worker activates;
// here we also poll for updates on reconnect, on tab focus, and hourly, so a
// device that stays open still adopts a new deployment (avoids stale versions).
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    const check = () => {
      if (navigator.onLine) void registration.update();
    };
    window.addEventListener("online", check);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") check();
    });
    setInterval(check, 60 * 60 * 1000); // hourly
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
