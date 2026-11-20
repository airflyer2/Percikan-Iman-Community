# Workspace Agent Instructions — Percikan Iman Community

## Canonical Source of Truth & GitHub Sync
- The canonical repository is `https://github.com/airflyer2/Percikan-Iman-Community` (branch `main`).
- After completing and verifying edits, sync your work to GitHub using:
  `npm run save -- "<conventional commit message>"`
- `scripts/git-save.mjs` runs a pre-sync guard that blocks `.env` files, private keys, credentials JSON, local caches, or files larger than 10 MB, then commits, rebases on `origin/main`, and pushes.

## Automated Firebase CI/CD (`percikan-iman-724ae`)
- Every push to `main` triggers `.github/workflows/deploy-firebase.yml`, which runs `npm run lint` (`tsc --noEmit`), `npm test` (`vitest run`), `npm run build`, and deploys `firestore:rules`, `firestore:indexes`, and `hosting` to Firebase project `percikan-iman-724ae`.
- Never push failing TypeScript or untested `firestore.rules` changes to `main`.

## Slimmed Local Disk Mode
- Disposable local directories (`node_modules/`, `dist/`, `.antigravity/`, `.firebase/`, test reports, and ephemeral `graphify-out` caches) may be deleted between sessions to reclaim disk space.
- `npm run save` uses only built-in Node.js modules and works even when `node_modules/` is absent.
- Whenever local `dev`, `lint`, `test`, or `build` runs are needed, restore dependencies cleanly with `npm ci`.
- Never commit `.env`, service-account keys, local caches, or files over 10 MB.
