# Changelog

All notable changes to **GitHub Top Radar** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> Translations: [中文版说明 (PRODUCT.md)](docs/PRODUCT.md)

---

## [Unreleased]

### Planned
- 🔍 In-app search bar across Trending / Favorites / History.
- 📊 Personal stats dashboard (most-viewed language, average stars, etc.).
- 🔔 Browser notification when a favorited repo trends.
- 🌗 Optional dark theme (currently light only by design).

---

## [1.0.0] — 2024-Q4

### ✨ Highlights
- 🎉 First public open-source release.
- 🪟 Windows desktop installer (NSIS, 98 MB) and standalone web build.
- 🤖 Multi-AI provider for both **README summary** and **description translation**.
- 🔒 **Security:** removed all hard-coded tokens; users must supply their own GitHub PAT.
- 🌍 Chinese / English UI, AI prompts follow the active language.
- 📁 Multi-folder favorites + 200-entry history (localStorage).

### Features
- **Trending Repositories** — daily / weekly / monthly, 30+ languages, HTML-scraped from GitHub Trending.
- **Trending Developers** — daily / weekly / monthly developer ranking.
- **Repo Detail Page** — README fetch (with token fallback chain) + GitHub Topics translation.
- **AI Structured Summary** — 5 cards: *Basic Info · Features · Architecture · Deployment · Use Cases*, language-aware.
- **Smart Favorites** — multiple folders, default folder, create / rename / delete.
- **History** — 200-entry cap, dedupe on revisit, per-entry remove.
- **Settings Modal** — GitHub PAT, AI model CRUD, test connection, dedicated translation model.
- **AI Providers** — GitHub Models, OpenAI, DeepSeek, Anthropic, 通义千问, 豆包, Custom.
- **Visual Launcher** — `launcher.html` + `scripts/launcher-server.cjs` for first-time users.
- **Vite Proxy** — bypasses browser CORS for `github.com`, `api.github.com`, `models.inference.ai.azure.com`, `api.mymemory.translated.net`.
- **i18n** — full UI translation table in `src/i18n.ts`; one-click switch via `中` / `EN`.

### Technical
- **Frontend:** React 19.2 + TypeScript 6 + Vite 8.
- **Desktop:** Electron 42 + electron-builder 26.
- **Storage:** localStorage only (no backend, no telemetry).
- **Translation:** MyMemory free API (no key required) + optional AI upgrade.
- **Cache:** in-memory 10-min TTL per `(period, language)` key.

### Documentation
- README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG.
- `docs/PRODUCT.md` (中文产品介绍)
- `docs/USER_GUIDE.md` (使用指南)
- `docs/DEVELOPMENT.md` (开发指南)
- `docs/ARCHITECTURE.md` (架构文档)

### Security
- Removed hard-coded GitHub PAT from `src/github.ts`; added clear in-app guidance to obtain a fine-grained token.
- All AI API keys and the GitHub PAT are stored exclusively in browser `localStorage`, never transmitted anywhere except the user-configured API endpoint.

### Known Limitations
- GitHub Trending HTML is parsed with regex; if GitHub changes the markup, the parser may need an update.
- AI summary is truncated to the first 4000 characters of the README.
- The visual launcher is a static HTML; it does not perform any install / auto-update.
- Only the Windows NSIS installer is built by default. macOS / Linux builds are not configured in `electron-builder.cjs` (but Vite web build works everywhere).

---

## Versioning

We follow [SemVer](https://semver.org/):
- **MAJOR** for breaking changes
- **MINOR** for backward-compatible features
- **PATCH** for backward-compatible bug fixes

[Unreleased]: https://github.com/yourname/github-top-radar/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourname/github-top-radar/releases/tag/v1.0.0
