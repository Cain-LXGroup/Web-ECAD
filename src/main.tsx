import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import App from "./app/App";
import "./styles/globals.css";

console.info("[main] Rendering Schematic Tablet application shell");

if ("serviceWorker" in navigator) {
  console.info("[main] Registering service worker");

  registerSW({
    immediate: true,
    onRegisterError(error) {
      console.error("[main] Failed to register service worker", error);
    },
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
