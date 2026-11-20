# Verein Percikan Iman Schweiz — Community Portal & Administration

Swiss-registered non-profit association portal (Art. 60–79 ZGB, UID `CHE-382.914.820`) built with React, TypeScript, Vite, Tailwind CSS, React Router, and Cloud Firestore.

---

## Architecture & Route Topology

The application is split into two isolated layout shells via `react-router-dom` (`BrowserRouter` + `firebase.json` catch-all SPA rewrite):

### 1. Public & Member Shell (`PublicLayout`)
Public visitors download only the public entry bundle (no admin workspaces, `jsqr`, or static seed arrays):

| Route | View | Notes |
| --- | --- | --- |
| `/` | `HomeView` + `EventCalendar` | Live `/events` & `/programs` from Cloud Firestore; `#brand` redirects to `/brand` |
| `/programs` | `ProgramsView` | Live `/programs` catalog with category/search filters |
| `/donate` | `DonateView` | Live `/campaigns` & `/destinations`; writes `'Processing'` CHF pledges to `/donationPledges` |
| `/gallery` | `GalleryView` | Event photo archive & Instagram link |
| `/about` | `AboutView` | Swiss statutory governance, member-only financials, live `/boardMembers` roster |
| `/contact` | `ContactView` | Zürich contact details, PostFinance IBAN, inquiry form |
| `/brand` | `BrandStyleguideView` | Brand Kit & Design System showcase |
| `/login` | `AuthView` | Member sign-in, statutory registration, and Google OAuth |
| `/member` | `MemberProfileView` | Authenticated member profile, digital QR card, family roster, status requests |
| `/assembly` | `GeneralAssemblyView` | Authenticated General Assembly floor voting (`/ballots/{uid}`) & `/boardInquiries` |

### 2. Dedicated Administration Portal (`/admin/*`, Lazy-Loaded)
Mounted via `React.lazy(() => import('./components/admin/AdminApp'))` and protected by `AdminRouteGuard` + `AdminLayout`:

| Route | Required Role | Capability |
| --- | --- | --- |
| `/admin` | Any staff role | Redirects to the operator's first permitted workspace |
| `/admin/programs` | `isAdmin` or `isSuperAdmin` | Create, edit, and delete community programs |
| `/admin/events` | `isAdmin` or `isSuperAdmin` | Manage community events calendar |
| `/admin/content` | `isAdmin` or `isSuperAdmin` | Manage fundraising campaigns, destinations, and global `siteConfig/notice` |
| `/admin/board` | `isAdmin`, `isSuperAdmin`, or `canManageBoard` | Manage Board of Directors roster |
| `/admin/donations` | `isAdmin` or `isSuperAdmin` | Review `/donationPledges`, promote pledges to `/donationReports`, record offline CHF reports |
| `/admin/members` | `isAdmin` or `isSuperAdmin` | Approve category requests, grant fee exemptions, manage roles/deletions (`isSuperAdmin`), re-verify vote weights |
| `/admin/attendance` | `isAdmin`, `isSuperAdmin`, or `canScanQR` | Sub-lazy QR Attendance Scanner (`jsqr` isolated to this chunk) & door cash settlement |
| `/admin/assembly` | `isAdmin` or `isSuperAdmin` | Open/close GA chamber, run **Certify Voter Roll**, moderate motions, answer/escalate inquiries |
| `/admin/bootstrap` | `isSuperAdmin` (pre-seed only) | One-time initial Firestore seed panel (hidden once `/siteConfig/bootstrap` exists) |

### 3. Codebase & Firestore Knowledge Graph

![Percikan-Iman-Community Architecture Knowledge Graph](graphify-out/graph.svg)

Directed knowledge graph (`851` nodes, `2,595` directed edges, `27` communities) mapping relationships across `PublicLayout`, `/admin/*`, `src/lib/firestore*.ts`, brand identity assets, tests, and `firestore.rules`. Explore the [interactive HTML graph](graphify-out/graph.html), [audit report](graphify-out/GRAPH_REPORT.md), or [community wiki](graphify-out/wiki/index.md), and refresh after code changes with `/graphify --update`.

---

## Environment Variables & Firebase App Check

Copy `.env.example` to `.env` (or `.env.local`) and configure your Firebase project:

```bash
cp .env.example .env
```

Key variables:
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID` — Firebase Web SDK configuration
- `VITE_FIREBASE_DATABASE_ID` — Target Firestore database ID (defaults to `(default)`)
- `VITE_USE_FIREBASE_EMULATOR` — Set to `"true"` for local Auth (`:9099`) & Firestore (`:8080`) emulator development
- `VITE_RECAPTCHA_SITE_KEY` — Google reCAPTCHA v3 site key for **Firebase App Check** (`ReCaptchaV3Provider`), protecting public `/donationPledges` writes in production
- `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` — Optional App Check debug token for local development on `localhost`

---

## Development, Testing & Emulator Commands

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run local dev server (port 3000):**
   ```bash
   npm run dev
   ```

3. **TypeScript check (`tsc --noEmit`):**
   ```bash
   npm run lint
   ```

4. **Run unit & component tests (`vitest run`):**
   ```bash
   npm test
   ```

5. **Run Firestore Security Rules tests against the local Firestore Emulator:**
   *(Requires Java 11+ on `PATH` / `JAVA_HOME`)*
   ```bash
   firebase emulators:exec --only firestore "npm run test:rules"
   ```

6. **Build for production:**
   ```bash
   npm run build
   ```

---

## Initial Setup: One-Time `/admin/bootstrap` & Voter Roll Certification

1. **Provision Super Admin:** Sign in with your Super Admin Firebase Auth account whose `/members/{uid}` document has `isSuperAdmin: true` and `isAdmin: true`.
2. **One-Time Bootstrap (`/admin/bootstrap`):** When `/siteConfig/bootstrap` does not yet exist, navigate to `/admin/bootstrap` and trigger the initial seed. This dynamically imports the baseline datasets, seeds `/programs`, `/campaigns`, `/destinations`, `/boardMembers`, `/events`, `/siteConfig/notice`, `/siteConfig/gaSession`, `/assemblyQuestions`, `/boardInquiries`, and `/members`, and locks bootstrapping by creating `/siteConfig/bootstrap`.
3. **Certify Voter Roll (`/admin/assembly`):** Before opening a General Assembly voting session, click **Certify Voter Roll** in `/admin/assembly` (or re-verify individual members in `/admin/members`) so `verifiedVoteWeight` (`1..20`) is stamped on eligible active and fee-exempt `/members/{uid}` documents in accordance with `firestore.rules`.
