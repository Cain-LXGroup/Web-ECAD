# Schematic Tablet

Tablet-first, offline-capable schematic templating PWA built with Vite, React, and IndexedDB.

## Local development

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Deploy to GitHub Pages

This repo includes a workflow that publishes the built app to **GitHub Pages** on every push to `main` or `master`.

### One-time setup

1. Create a GitHub repository (for example `Web-ECAD`) and push this project to it.
2. On GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Choose branch **`gh-pages`**, folder **`/ (root)`**, then save.
5. Push to `main` (or run the **Deploy to GitHub Pages** workflow manually under **Actions**).

If deploy still fails with a 404, an organization owner may need to enable Pages at  
`https://github.com/organizations/Cain-LXGroup/settings/pages`.

### Your live URL

After the workflow succeeds, the site will be available at:

```text
https://<your-github-username>.github.io/<repository-name>/
```

Example: `https://cain-lxgroup.github.io/Web-ECAD/`

The build picks the repository name automatically from `GITHUB_REPOSITORY`, so asset paths and the PWA manifest stay correct.

### Test on a tablet

1. Open the GitHub Pages URL in Safari or Chrome on your tablet.
2. Use **Add to Home Screen** (iOS) or **Install app** (Android) to run it like a PWA.
3. In **Workspace → Import**, install the Digi-Key and/or JLCPCB libraries (requires network once).

### Notes

- Library installs fetch symbol files from GitHub (`raw.githubusercontent.com`); that works over HTTPS on Pages.
- Data is stored locally in the browser (IndexedDB) on each device.
- If the repository is renamed, the next deploy updates paths automatically; bookmark the new URL.
