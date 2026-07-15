# Installing CareerOS

CareerOS runs entirely on your computer. Nothing is uploaded anywhere;
your data lives in files you own. Pick whichever install path fits you.

## Option 1 — Desktop app (recommended)

Download the installer for your system from the
[Releases page](https://github.com/Prokaiwa/CareerOS/releases).

### Windows
1. Download `CareerOS_x.y.z_x64-setup.exe` and run it.
2. If Windows SmartScreen shows **"Windows protected your PC"**, that's
   because the installer isn't code-signed (signing certificates cost
   money; the code is open source instead). Click **More info → Run
   anyway** if you trust the source.
3. Launch CareerOS from the Start menu.

### macOS
1. Download the `.dmg`, open it, and drag **CareerOS** into Applications.
2. Unsigned builds are blocked on first open: **right-click the app →
   Open → Open** (or approve it under System Settings → Privacy &
   Security). This is needed once.
3. Your data lives in `~/Library/Application Support/app.careeros.desktop`.

### Linux
- **Debian/Ubuntu:** `sudo apt install ./CareerOS_x.y.z_amd64.deb`, then
  launch "CareerOS" from your app menu.
- **AppImage:** `chmod +x CareerOS_x.y.z_amd64.AppImage` and run it.
- Your data lives in `~/.local/share/app.careeros.desktop`.

On first launch the app walks you through onboarding — importing a
résumé, connecting an optional AI provider, or restoring a CareerOS
export from another machine.

## Option 2 — Run from source (developers)

Requires Node 20+.

```bash
git clone https://github.com/Prokaiwa/CareerOS.git
cd CareerOS
npm install
npm run db:migrate
npm run dev        # http://localhost:3000
```

Data lives in `data/` and `storage/` inside the project folder.

## Option 3 — GitHub Codespaces

Open the repository in a Codespace and run the same commands as Option 2;
the forwarded port serves the app in your browser.

## The browser extension

The extension (job-fit scores on postings, one-click clipping, form
autofill) works with any install option. In the app, open
**Extension** in the sidebar for guided install steps and a live
connection check.

## Moving between machines / backups

- **Settings → Download all my data** produces one JSON file with
  everything; restoring it into a fresh install is offered during
  onboarding.
- **Settings → Create full backup** copies the database and generated
  files to a timestamped folder (in the desktop app you can pick where).
