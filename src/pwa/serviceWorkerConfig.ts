import type { ManifestOptions, VitePWAOptions } from "vite-plugin-pwa";

export const pwaManifest: Partial<ManifestOptions> = {
  name: "Schematic Tablet",
  short_name: "Schematic",
  description: "Offline tablet-first schematic templating app",
  theme_color: "#111827",
  background_color: "#ffffff",
  display: "standalone",
  start_url: "/",
  scope: "/",
  icons: [
    {
      src: "/icons/icon-192.svg",
      sizes: "192x192",
      type: "image/svg+xml",
      purpose: "any maskable",
    },
    {
      src: "/icons/icon-512.svg",
      sizes: "512x512",
      type: "image/svg+xml",
      purpose: "any maskable",
    },
  ],
};

export const pwaConfig: Partial<VitePWAOptions> = {
  registerType: "autoUpdate",
  includeAssets: ["favicon.svg", "icons/icon-192.svg", "icons/icon-512.svg"],
  manifest: pwaManifest,
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
  },
};
