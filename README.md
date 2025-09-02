# Proago Recruitment (Source)

This is the **source code** (Vite + React + Tailwind) to deploy with **GitHub → Vercel**.

## Quick deploy (no coding)
1. **Unzip** this folder on your computer so you can see files (`package.json`, `index.html`, `src/`, `public/`, etc.).
2. Go to **github.com** → log in → top right **+** → **New repository** → name it: `proago-recruitment` → click **Create repository**.
3. On the repo page, click **Add file** → **Upload files**.
4. Drag **all files and folders INSIDE** the unzipped folder into the browser (select everything: `package.json`, `vite.config.js`, `public/`, `src/`, ...). Then click **Commit changes**.
   - Tip: You can drag multiple files and **folders** into GitHub’s upload area.
5. Go to **vercel.com** → log in → **Add New… → Project** → **Import Git Repository** → pick your `proago-recruitment` repo.
   - Framework Preset: **Vite**
   - Build command: `npm run build` (default)
   - Output: `dist` (default)
   - Click **Deploy**.
6. Open the Vercel URL (https://…vercel.app) on your phone → login with:
   - **Username:** `Administrator`
   - **Password:** `Sergio R4mos`
7. In the header, tap **Install** (or use the browser menu → Add to Home Screen).

## Notes
- Icon: replace `public/proago-icon.png` with your own PNG if you like.
- Data storage: localStorage only (on-device). Export/Erase in **Settings**.
- Indeed JSON import: only reads first name, last name, phone. Ignores extra fields.
- Assistant: optional. Add an OpenAI API key in **Settings** to enable.
