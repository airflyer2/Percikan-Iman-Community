# Workspace Agent Instructions — Percikan Iman Community

## Canonical Source of Truth & GitHub Sync
- The canonical repository is `https://github.com/airflyer2/Percikan-Iman-Community` (branch `main`).
- After completing and verifying edits, sync your work to GitHub using:
  `npm run save -- "<conventional commit message>"`
- `scripts/git-save.mjs` runs a pre-sync guard that blocks `.env` files, private keys, credentials JSON, local caches, or files larger than 10 MB, then commits, rebases on `origin/main`, and pushes.

## Automated Firebase CI/CD (`percikan-iman-724ae`)
- Every push to `main` triggers `.github/workflows/deploy-firebase.yml`, which runs `npm run lint` (`tsc --noEmit`), `npm test` (`vitest run`), the **Firestore Rules Emulator CI gate** (`npx firebase emulators:exec --project percikan-iman-rules-test --only firestore "npm run test:rules"`), `npm run build`, deploys `firestore:rules`, `firestore:indexes`, and `hosting` to Firebase project `percikan-iman-724ae`, and verifies the live bundle via `node scripts/smoke-check.mjs https://percikan-iman-724ae.web.app`.
- Pull requests targeting `main` trigger `.github/workflows/pr-preview.yml`, which runs lint, Vitest, the Firestore Rules Emulator gate, builds a preview bundle (`VITE_RECAPTCHA_SITE_KEY=""`), deploys an ephemeral 7-day Firebase Hosting PR preview channel (`https://percikan-iman-724ae--pr-<number>-*.web.app`), and runs `scripts/smoke-check.mjs` against the preview channel URL.
- Never push failing TypeScript or untested `firestore.rules` changes to `main`.

## Tooling, Setup Doctor & Secret Sync
- **Environment Doctor & Rehydration (`npm run setup`):** Runs `scripts/setup.mjs` (zero external dependencies) to check Node.js >= 22, Java >= 11 (for local Firestore Rules Emulator runs), `.env` key status (never printing secret values), and rehydrate `node_modules/` via `npm ci`. Pass `--check` (`node scripts/setup.mjs --check`) for read-only diagnostics without writing `.env` or running `npm ci`.
- **Live Bundle Smoke Check (`npm run smoke`):** Runs `scripts/smoke-check.mjs` against a deployed Hosting URL (defaults to `https://percikan-iman-724ae.web.app`) to verify `/` returns HTTP 200 with `<div id="root">` and the compiled Vite module JS bundle returns HTTP 200 (> 100 bytes).
- **GitHub Secret Sync (`npm run secrets:sync`):** Runs `scripts/sync-secrets.mjs` to audit (`--check`) or sync production keys from local `.env` into GitHub Actions repository secrets via `gh secret set` (skipping placeholders and local-only emulator/debug flags, and never logging secret values).

## Slimmed Local Disk Mode
- Disposable local directories (`node_modules/`, `dist/`, `.antigravity/`, `.firebase/`, test reports, and ephemeral `graphify-out` caches) may be deleted between sessions to reclaim disk space.
- `npm run save` and `npm run setup` (`--check`) use only built-in Node.js modules and work even when `node_modules/` is absent.
- Whenever local `dev`, `lint`, `test`, or `build` runs are needed, restore dependencies cleanly with `npm run setup` (or `npm ci`).
- Never commit `.env`, service-account keys, local caches, or files over 10 MB.
