# Security Policy

> 🔒 **TL;DR** — This project never embeds secrets. All API keys & GitHub PATs
> live in **your** browser `localStorage`, and are sent only to the endpoints
> **you** configure.

---

## 📦 Supported Versions

| Version | Supported |
|---|---|
| 1.0.x  | ✅ |
| < 1.0  | ❌ Please upgrade. |

---

## 🛡 Reporting a Vulnerability

**Please do NOT open a public issue for security problems.**

Instead, use **one** of the following private channels:

1. **GitHub Private Vulnerability Reporting** (preferred)
   * Go to the *Security* tab → *Advisories* → *Report a vulnerability*.
2. **Email the maintainer**
   * Address: see the latest commit's `Co-authored-by` or open a *Draft* PR asking for a private channel.

Please include:
- A clear description of the issue and its impact.
- Steps to reproduce (proof-of-concept code is welcome).
- The affected version / commit SHA.
- Whether you want public credit in the advisory.

We aim to acknowledge within **72 hours** and to provide a fix or mitigation
within **30 days**, coordinated with the reporter.

---

## 🔐 Security Design

### What we **don't** store or transmit

- No analytics, no telemetry, no third-party trackers.
- No bundled API keys or GitHub PATs in the source (verified by CI in the future).

### What lives where

| Data | Storage | Network |
|---|---|---|
| GitHub PAT | `localStorage` (`github_insights_settings.githubToken`) | Sent as `Authorization: Bearer …` to `api.github.com` **only**. |
| AI API keys | `localStorage` (`aiModels[].apiKey`) | Sent as `Authorization: Bearer …` to the **user-configured** endpoint only. |
| Favorites / history | `localStorage` | Never leaves the browser. |
| Theme / language | `localStorage` | Never leaves the browser. |

### Transport security

- The bundled Vite dev server / launcher always serves over `http://localhost`, so no production HTTP traffic is generated.
- When deployed, you are expected to put the static `dist/` behind HTTPS (e.g. Cloudflare Pages, GitHub Pages + custom domain, or a reverse proxy).
- The Electron build does **not** open a network listener; it loads `dist/index.html` from disk.

### Supply-chain

- All runtime dependencies are pinned to exact versions in `package-lock.json`.
- For new dependencies, please justify in the PR why it's needed and prefer
  widely-audited packages (≥ 1M weekly downloads, or first-party libraries).
- Run `npm audit` before any release; high/critical findings must be resolved
  or have an accepted exception in the PR.

### CORS / Proxy

- The dev server uses Vite's `server.proxy` to forward:
  - `/github-trending` → `https://github.com`
  - `/github-api`     → `https://api.github.com`
  - `/ai-models`      → `https://models.inference.ai.azure.com`
  - `/mymemory-api`   → `https://api.mymemory.translated.net`
- These proxies exist **only** in the dev server. Production (`npm run build`)
  produces static assets — if you self-host, you must either configure CORS
  on those backends or set up your own reverse proxy.

### Electron hardening

The bundled `electron/main.js`:
- Disables `nodeIntegration` in renderer windows.
- Uses a `preload.cjs` script to expose a minimal, allow-listed API surface
  to the renderer.
- Does **not** enable `webContents.openWindow`; all external links are opened
  in the user's default browser via `shell.openExternal`.

If you fork this project, please keep these defaults. Changes must be
explicitly justified and reviewed.

---

## 🚨 Past Incidents

### 2024 — Hard-coded GitHub PAT in `src/github.ts`
- **Status:** Fixed in commit leading up to v1.0.0.
- **Impact:** Anyone with the historical source had read access to a single
  GitHub account's public-repo rate-limit budget.
- **Resolution:** The token was removed from the source. The new
  `getGitHubToken()` function reads from `localStorage` only.
  Users are guided to create their own fine-grained PAT via the
  *Settings → Personal Access Token* screen.

---

## ✅ Best Practices for Users

1. **Use a fine-grained PAT** with the *minimum* scopes (typically `public_repo`).
2. **Rotate** your AI / GitHub keys periodically.
3. **Don't share** your `localStorage` data — anyone with browser access can
   read it. (You can clear it from the in-app *Settings* page or the
   browser DevTools → *Application* → *Local Storage*.)
4. **Verify** downloads of the desktop installer against the
   [release page](https://github.com/yourname/github-top-radar/releases) SHA-256.

---

Thanks for helping keep **GitHub Top Radar** and its users safe. 💙
