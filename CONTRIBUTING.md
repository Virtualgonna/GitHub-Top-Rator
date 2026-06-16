# Contributing to GitHub Top Radar

First off, thank you for considering contributing! 🎉
You are helping make open-source discovery better for everyone.

## 📑 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [How Can I Contribute?](#-how-can-i-contribute)
- [Project Setup](#-project-setup)
- [Development Workflow](#-development-workflow)
- [Coding Conventions](#-coding-conventions)
- [Commit & PR Guidelines](#-commit--pr-guidelines)
- [Reporting Bugs](#-reporting-bugs)
- [Suggesting Features](#-suggesting-features)

---

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our
[Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to
uphold this code. Please report unacceptable behavior via a private issue.

---

## 💡 How Can I Contribute?

| Type | Suitable for | Where to start |
|---|---|---|
| 🐛 **Bug reports** | Anyone who hits a problem | [Open a Bug Report](../../issues/new?template=bug_report.md) |
| 💡 **Feature requests** | Anyone with an idea | [Open a Feature Request](../../issues/new?template=feature_request.md) |
| 🌍 **Translations** | Native speakers | Edit `src/i18n.ts` and submit a PR |
| 🎨 **UI polish** | Designers & frontend devs | Look for `good first issue` label |
| 🛠 **Bug fixes** | Anyone | Look for `help wanted` or `bug` label |
| 📝 **Docs** | Writers | Improve `README.md`, `docs/`, or in-code comments |
| 🔌 **New AI provider** | Backend-ish | Add a new entry to `AI_PROVIDERS` in `src/store.ts` |

---

## 🚧 Project Setup

### 1. Fork & Clone

```bash
git clone https://github.com/<your-name>/github-top-radar.git
cd github-top-radar
npm install
```

### 2. Run the dev server

```bash
npm run dev          # vite dev server → http://localhost:5173
# or
npm run launcher     # builds + serves launcher.html → http://localhost:5180/launcher.html
```

### 3. Create a feature branch

```bash
git checkout -b feat/<short-description>
# or
git checkout -b fix/<issue-number>-<short-description>
```

---

## 🔁 Development Workflow

1. **Sync with upstream** before starting work:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```
2. **Make focused commits** — one logical change per commit.
3. **Run the build** locally to catch TypeScript / build errors:
   ```bash
   npm run build
   ```
4. **Test the visual flow**:
   - Open Trending tab → confirm repos load
   - Open a repo → confirm README loads → click "AI Summary"
   - Save to a Favorites folder → refresh → confirm it persists
   - Switch language (`中`/`EN`) → confirm UI changes
5. **Push & open a Pull Request** with the template below.

---

## 🎨 Coding Conventions

### TypeScript
- **Strict types.** Avoid `any`; use `unknown` + narrowing when needed.
- Prefer **named exports** for utilities; default export for React components.
- One React component per file, file name = component name (`Settings.tsx` → `Settings`).

### React
- Function components + hooks only (no class components).
- Co-locate small components next to their parent in `components/`.
- Keep effects simple; use `useCallback` / `useMemo` only when it measurably helps.
- All visible strings must be wrapped with `t('key')` from `i18n.ts` — **no hard-coded user-facing English / Chinese** in JSX.

### Styling
- Single `src/style.css` (design system lives in CSS custom properties at the top).
- Use existing CSS variables (`--accent`, `--text-secondary`, …) — do not introduce hex colors ad hoc.
- BEM-ish class names, lowercase, hyphen-separated.

### i18n
- When adding a new visible string, **add the key to both `zh` and `en` sections** in `src/i18n.ts`.
- Use dotted keys by area: `nav.*`, `settings.*`, `detail.*`, `ai.*`, `common.*`.

### Git
- Branch names: `feat/*`, `fix/*`, `chore/*`, `docs/*`, `refactor/*`.
- Commit messages: imperative mood, ≤ 72 chars for the subject.
  - ✅ `fix: handle null topic array in RepoDetail`
  - ❌ `fixed some stuff`

---

## ✅ Commit & PR Guidelines

### Commit message format

```
<type>(<scope>): <subject>

<body — explain the why, not the what>

<footer — closes #123, BREAKING CHANGE: …>
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`.

### Pull Request checklist

- [ ] Branch is up-to-date with `main`.
- [ ] `npm run build` succeeds locally.
- [ ] No new lint / TS errors.
- [ ] New UI strings are in **both** `zh` and `en` dictionaries.
- [ ] Screenshots attached if the change is visual.
- [ ] PR description explains **what** and **why**, with linked issue.

---

## 🐛 Reporting Bugs

Open a [Bug Report](../../issues/new?template=bug_report.md) and include:
- OS + browser / Electron version
- Repro steps (the more specific, the better)
- Expected vs. actual behavior
- Console errors / screenshots if available
- For AI failures: which provider + model

> **Never paste your GitHub PAT or AI API key** in a public issue.

---

## ✨ Suggesting Features

Open a [Feature Request](../../issues/new?template=feature_request.md) and describe:
- The problem you're trying to solve
- Your proposed solution (with mockups / examples if you can)
- Alternatives you've considered
- Willingness to contribute the PR yourself

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the
project's [MIT License](./LICENSE).

Thank you for helping make **GitHub Top Radar** better! 💖
