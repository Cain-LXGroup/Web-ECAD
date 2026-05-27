import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

import { pwaConfig, pwaManifest } from "./src/pwa/serviceWorkerConfig";

const resolveGitHubPagesBase = (): string => {
  console.info("[vite.config] Resolving GitHub Pages base path");

  if (process.env.GITHUB_PAGES !== "true") {
    return "/";
  }

  const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "Web-ECAD";
  return `/${repositoryName}/`;
};

export default defineConfig(() => {
  const base = resolveGitHubPagesBase();

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        ...pwaConfig,
        manifest: {
          ...pwaManifest,
          start_url: base,
          scope: base,
        },
      }),
    ],
  };
});
