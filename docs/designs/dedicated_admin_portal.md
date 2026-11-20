# Dedicated /admin Portal and Firestore Persistence

*   **Author:** Verein Percikan Iman Team
*   **Status:** Draft
*   **Date:** 2026-11-19

--------------------------------------------------------------------------------

## Overview

Move all administrative controls for Verein Percikan Iman Schweiz out of the public website shell into a dedicated, lazy-loaded `/admin` route on the same domain, and persist all admin-managed datasets (including General Assembly board controls) in Cloud Firestore behind `firestore.rules`.

For visitors and regular members, this keeps the public site clean, focused on community programs and membership services, and free of unused administrative scripts. For board administrators and delegated event volunteers, it provides a single dedicated workspace with reliable, multi-device data persistence across reloads and browsers.

## The Problem

Three issues tie together in the current application:

1.  **Public website clutter**: `Navbar.tsx` displays both an administrative navigation tab (`Admin`, `QR Scanner`, or `Board Admin`) and an `Admin ON/OFF` toggle inside the public header. `HomeView.tsx`, `EventCalendar.tsx`, and `AboutContactViews.tsx` render inline `isAdminMode` edit buttons on visitor pages. `App.tsx` renders `AdminDashboard` inside the public header, broadcast notice bar, and footer. `GeneralAssemblyView.tsx` mixes board moderation controls (opening or closing sessions, placing motions on the floor, creating questions, and answering or escalating member inquiries) into the member voting screen.
2.  **Public bundle weight**: `App.tsx` eagerly imports `AdminDashboard.tsx` (2,107 lines), `AdminMembersTab.tsx` (1,154 lines), `AdminEventAttendanceScanner.tsx` (1,191 lines), and `jsqr` (~4,450 lines of administrative UI code), forcing every public visitor to download code they cannot run.
3.  **Non-persistent, unshared admin state**: `firestore.rules` permits only `/members/{uid}` and `/attendance/{recordId}`, and `AdminEventAttendanceScanner.tsx` still stores attendance records only in `localStorage`. Meanwhile, `programs`, `campaigns`, `destinations`, `donationReports`, `boardMembers`, `events`, and `siteNotice` exist only in React `useState` inside `App.tsx`, while General Assembly session, question, ballot, and board inquiry state exists only in `localStorage`. Without moving these datasets into Cloud Firestore, isolating `/admin` behind its own route breaks live propagation between admin edits and public views and discards edits on page reload.

## Goals

*   Remove all administrative navigation tabs, `Admin ON/OFF` toggles, and inline `isAdminMode` edit controls from public views (`Navbar.tsx`, `HomeView.tsx`, `EventCalendar.tsx`, `AboutContactViews.tsx`, and member-facing `GeneralAssemblyView.tsx`).
*   Isolate all administrative capabilities—Programs, Campaigns and Site Notice, Board of Directors, Events, Donations, Members, Event QR Attendance Scanner, and General Assembly board moderation—under a dedicated `/admin` route with its own minimal layout shell and route-level Firebase Auth and role guard.
*   Code-split `/admin` with lazy loading so public visitors on non-admin routes never download admin components or `jsqr`.
*   Persist all admin-managed domain datasets (`members`, `attendance`, `programs`, `campaigns`, `destinations`, `donationReports`, `boardMembers`, `events`, `siteNotice`, and General Assembly sessions, questions, ballots, and board inquiries) in Cloud Firestore governed by `firestore.rules` so edits survive page reloads and propagate across browsers and devices.
*   Preserve granular role-based access (`isSuperAdmin`, `isAdmin`, `canManageBoard`, `canScanQR`) so operators only see and act on sections their role permits, with staff reaching `/admin` via direct URL or authenticated profile and account menu links (`MemberProfileView.tsx` delegated roles panel and signed-in user dropdown).
*   Maintain mobile browser camera access on `/admin` for QR check-ins over HTTPS and `localhost`, along with existing `de`, `en`, `id`, and `ms` language support.

## Non-Goals

*   Introducing a custom backend HTTP API server (Express or standalone REST backend) or hosting the admin console on a separate subdomain (`admin.<domain>`).
*   Replacing Firebase Authentication or migrating away from Cloud Firestore.
*   Implementing live payment processor webhooks (TWINT, Stripe, or bank feeds) or automated transactional email sending.
*   Redesigning public website visual branding, marketing copy, or Swiss ZGB Art. 60–79 voting eligibility formulas (`src/utils/votingPower.ts`).
*   Supporting headless CLI workflows or external third-party API integrations.

## Open Questions

*   None — all initial architectural questions have been resolved and incorporated into the Technical Plan below.

## Critical User Journeys (CUJs)

### CUJ 1: Public Visitor Browsing Without Admin Clutter or Admin Code

*   **Given**: An unauthenticated visitor or regular non-staff member loads `/` on the public website.
*   **When**: They navigate across Home, Programs, Donate, Gallery, About, and Contact pages.
*   **Then**: No admin tabs, `Admin ON/OFF` switches, or inline edit controls render anywhere in the interface; the browser downloads neither the `/admin` JavaScript chunk nor `jsqr`; public programs, campaigns, events, board members, and site notices reflect data stored in Firestore.

### CUJ 2: Board Administrator Publishing Site Updates Across Devices

*   **Given**: A signed-in user with `isAdmin: true` or `isSuperAdmin: true` navigates to `/admin` via direct URL or from their authenticated account menu or profile panel.
*   **When**: They create or edit a program, event, board member, campaign, or site notice and save the change.
*   **Then**: The update writes to Cloud Firestore under `firestore.rules`, survives a full browser reload, and becomes visible on another user's browser without needing an admin toggle on the public site.

### CUJ 3: Delegated QR Operator Scanning Member Passes at an Event

*   **Given**: A volunteer account with `canScanQR: true` and `isAdmin: false` opens `/admin` on a mobile phone over HTTPS or `localhost`.
*   **When**: They sign in and grant browser camera access inside the attendance view.
*   **Then**: Only the Event QR Attendance Scanner (plus any other roles explicitly granted to that user) loads inside the minimal `/admin` shell without public website chrome; attendance records and door cash settlements save to Cloud Firestore instead of staying local to one browser's `localStorage`.

### CUJ 4: Board Moderator Conducting a Live General Assembly While Members Vote

*   **Given**: A General Assembly session is scheduled, members are viewing the General Assembly portal on the main site, and a board administrator is signed into `/admin`.
*   **When**: The administrator opens the session, places a motion on the floor, or answers and escalates a member inquiry from `/admin`.
*   **Then**: Connected members receive the live session state and active motion without seeing board moderation controls inside `GeneralAssemblyView.tsx`, and eligible members submit ballots that persist in Firestore.

### CUJ 5: Unauthenticated or Non-Privileged User Requesting `/admin`

*   **Given**: A signed-out visitor or a signed-in standard member with no administrative flags navigates directly to `/admin`.
*   **When**: The `/admin` route loads and checks Firebase Authentication and the user's `/members/{uid}` role flags.
*   **Then**: Signed-out visitors see a dedicated sign-in screen scoped to `/admin`, and signed-in non-staff members see an access-denied message with a link back to `/`; administrative collections remain unreadable and unwritable under `firestore.rules`.

## Technical Plan (Architecture)

### 1. Route Topology, Shell Isolation, and Code Splitting

The application introduces `react-router-dom` (`BrowserRouter`) at the root and splits rendering into two layout shells:

*   **`PublicLayout` (`/`, `/programs`, `/donate`, `/gallery`, `/about`, `/contact`, `/login`, `/member`, `/assembly`)**: Renders `Navbar`, the global `SiteNotice` banner read from Firestore `siteConfig/notice`, the active route via `<Outlet />`, `Footer`, `InfoModals`, and `StatutenModal`. Neither `Navbar` nor any public view receives `isAdminMode` state.
*   **`AdminLayout` (`/admin/*`)**: Mounted via `React.lazy()` inside `<Suspense>` and wrapped by `AdminRouteGuard`. `AdminLayout` renders an isolated administrative shell containing a role badge, permitted tab links, `LanguageSelector`, a "Return to Public Site" link to `/`, and a sign-out control. Public navigation headers, broadcast notice bars, and marketing footers are omitted on `/admin/*`, and public visitors never download `AdminDashboard`, `AdminMembersTab`, `AdminEventAttendanceScanner`, `AdminAssemblyTab`, or `jsqr`.

Sub-route mapping and role checks inside `/admin/*`:

*   `/admin`: Index redirect to the signed-in staff user's first permitted route (`isAdmin` or `isSuperAdmin` -> `/admin/programs`; `canManageBoard` only -> `/admin/board`; `canScanQR` only -> `/admin/attendance`).
*   `/admin/programs` (`isAdmin`): Create, edit, and delete programs.
*   `/admin/events` (`isAdmin`): Manage community events (absorbing event creation previously gated behind `isAdminMode` inside `HomeView.tsx` and `EventCalendar.tsx`).
*   `/admin/content` (`isAdmin`): Manage fundraising campaigns and the global `SiteNotice` banner.
*   `/admin/board` (`isAdmin || canManageBoard`): Create, edit, reorder, and delete board of directors entries.
*   `/admin/donations` (`isAdmin`): Review incoming `/donationPledges`, promote verified receipts to `/donationReports`, record manual entries, and manage contribution destinations.
*   `/admin/members` (`isAdmin`; member deletion and `isSuperAdmin` flag edits restricted to `isSuperAdmin`): Manage member profiles, fee exemptions, status history, category change requests, and verified vote weight status.
*   `/admin/attendance` (`isAdmin || canScanQR`): Event QR attendance scanner (dynamically loading `jsqr` inside this route) and door cash dues settlement.
*   `/admin/assembly` (`isAdmin`): Open or close General Assembly sessions, run voter roll certification, create and place motions on the floor, close motions with frozen totals, and answer or escalate member inquiries.
*   `/admin/bootstrap` (`isSuperAdmin` when `siteConfig/bootstrap` does not exist): One-time initial Firestore seed panel.

To support direct navigation and hard reloads on `/admin/*` and public paths in production static hosting, `firebase.json` adds a `hosting` section serving `dist` with a catch-all SPA rewrite (`"source": "**"`, `"destination": "/index.html"`).

Public-site decluttering removes all `isAdminMode` props, `Admin ON/OFF` buttons, and inline edit actions from `Navbar.tsx`, `HomeView.tsx`, `EventCalendar.tsx`, and `AboutContactViews.tsx`, and moves all board moderation modals and buttons out of `GeneralAssemblyView.tsx`. Authorized staff reach `/admin` via direct bookmark/URL, a single menu item inside the authenticated user dropdown in `Navbar.tsx`, or the existing "Delegated Administrative Roles" panel in `MemberProfileView.tsx`.

### 2. Architecture and Data Flow

```text
                       Browser (react-router-dom BrowserRouter)
                                        |
              +-------------------------+-------------------------+
              |                                                   |
     Public & Member Routes                               /admin/* Routes
     (/, /programs, /donate,                              (React.lazy + Suspense)
      /gallery, /about, /contact,                                 |
      /login, /member, /assembly)                         AdminRouteGuard
              |                                           (Auth + Role Check)
         PublicLayout                                             |
     (Navbar without admin                                  AdminLayout
      toggle + SiteNotice +                               (Minimal Admin Shell:
      Footer + Modals)                                     programs, events, content,
              |                                            board, donations, members,
              |                                            attendance + jsqr,
              |                                            assembly, bootstrap)
              +-------------------------+-------------------------+
                                        |
                                        v
                   Shared AuthContext & Domain Firestore Services
              (AuthContext, firestoreContent, firestoreDonations,
               firestoreAttendance, firestoreAssembly,
               firestoreMembers, firestoreBootstrap + App Check)
                                        |
                                        v
                     Cloud Firestore + firestore.rules Enforcement
     +-------------------+--------------------+--------------------+-------------------+
     | Public-Read /     | Staff & Member     | Two-Tier           | General Assembly  |
     | Staff-Write       | Records            | Donations          | & Inquiries       |
     +-------------------+--------------------+--------------------+-------------------+
     | /programs         | /members/{uid}     | /donationPledges   | /siteConfig/      |
     | /campaigns        |  (+ verifiedVote   |  (Public Create +  |  gaSession        |
     | /destinations     |   Weight)          |   App Check;       | /assemblyQuestions|
     | /events           | /attendance/{id}   |   Admin Read/Del)  |  /ballots/{uid}   |
     | /boardMembers     | /siteConfig/       | /donationReports   | /boardInquiries   |
     | /siteConfig/notice|  bootstrap         |  (Admin Only)      |  /upvotes/{uid}   |
     +-------------------+--------------------+--------------------+-------------------+
```

### 3. Authentication, Role Guard, and Removal of Client-Side Impersonation

Firebase Authentication state and the live Firestore subscription to `/members/{uid}` move out of `App.tsx` into a shared `AuthContext` (`src/context/AuthContext.tsx`). All UI privilege checks derive strictly from the authenticated user's live `/members/{uid}` document.

Client-side user switching (`switchedFromSuperAdmin`, `handleSwitchToUser`, `handleReturnToSuperAdmin`, and the demo account switcher bars in `AdminMembersTab.tsx` and `GeneralAssemblyView.tsx`) is removed. Because `firestore.rules` always evaluates `request.auth.uid`, swapping React state in memory leaves the underlying Super Admin Firebase session active, causing security-rule tests and owner-scoped writes (such as `/ballots/{uid}`) to behave differently than real member sessions. Staff and QA verify non-admin permissions by signing into real accounts or Firebase Auth Emulator accounts.

`AdminRouteGuard` handles four states for `/admin/*`:

1.  **Auth or profile loading**: Renders a minimal neutral loading screen without mounting public navigation or admin forms.
2.  **Unauthenticated**: Renders a dedicated `/admin` sign-in view (email/password and Google Sign-In) and navigates back to the originally requested `/admin/*` URL upon success.
3.  **Authenticated without staff flags (`!isAdmin && !isSuperAdmin && !canManageBoard && !canScanQR`)**: Renders an access-denied screen with a button returning to `/`.
4.  **Authenticated with partial staff role (`canScanQR` or `canManageBoard` only)**: Permits only the tabs authorized for that user's flags and redirects unauthorized `/admin/<tab>` sub-paths to the user's first permitted route.

### 4. Cloud Firestore Data Model and Security Rules Design

All collections reside in Cloud Firestore under `firestore.rules`, keeping the existing default-deny fallback (`match /{document=**} { allow read, write: if false; }`) and existing role helper functions (`isSuperAdmin()`, `isAdmin()`, `canManageBoard()`, `canScanQR()`, `isAuthorizedStaff()`, `isAdminOrScanner()`).

*   **Public Content Collections (`/programs/{id}`, `/campaigns/{id}`, `/destinations/{id}`, `/events/{id}`, `/siteConfig/notice`)**:
    *   Rules: `allow read: if true; allow write: if isAdmin();` with field allowlists, required fields, and string/numeric bounds matching `src/types.ts`.
*   **Board Directory (`/boardMembers/{id}`)**:
    *   Rules: `allow read: if true; allow write: if isAdmin() || canManageBoard();` with `BoardMember` field validation.
*   **One-Time Bootstrap Marker (`/siteConfig/bootstrap`)**:
    *   Rules: `allow read, create: if isSuperAdmin(); allow update, delete: if false;` recording `seededAt` and `seededBy`.
*   **Members (`/members/{uid}`)**:
    *   Retains existing get/list/create/update/delete rules and adds three admin-controlled fields: `verifiedVoteWeight` (integer `0..20`), `voteWeightVerifiedAt`, and `voteWeightVerifiedBy`.
    *   `hasNoPrivilegesOnCreate()` rejects `verifiedVoteWeight` on self-registration, and `isAllowedSelfProfileUpdate()` adds `verifiedVoteWeight`, `voteWeightVerifiedAt`, and `voteWeightVerifiedBy` to `protectedPrivilegeAndFinancialFields` so members cannot inflate vote weight by editing `spouse` or `children`.
    *   Replaces full-array `onUpdateMembers` state syncing with targeted single-document updates (`updateDoc`/`setDoc` with merge) and `isSuperAdmin()` `deleteDoc`.
*   **Attendance (`/attendance/{recordId}`)**:
    *   Retains existing `isAdminOrScanner()` read/create/update rules (with immutable `id`, `eventId`, `memberCode`) and `isAdmin()` delete rules.
    *   `AdminEventAttendanceScanner.tsx` drops `localStorage` (`vpi_event_attendance_records`) and reads/writes `/attendance/{recordId}` in real time via Firestore, keeping door cash settlement aligned with `isAllowedScannerDoorSettlementUpdate()`.
*   **Two-Collection Donations (`/donationPledges/{pledgeId}` and `/donationReports/{reportId}`)**:
    *   `/donationPledges/{pledgeId}`: Public `create` is allowed so unauthenticated visitors on `/donate` can submit a transfer pledge. Firebase App Check enforcement protects the endpoint against automated script floods, and rules validate `hasOnlyAllowedFields`, `amount` (`1..100000`), `currency == 'CHF'`, `status == 'Processing'`, and bounded strings. `read`, `update`, and `delete` are restricted to `isAdmin()`.
    *   `/donationReports/{reportId}`: Strictly `isAdmin()` for `read`, `create`, `update`, and `delete`. Promoting a pledge in `/admin/donations` executes a Firestore `writeBatch` that creates a completed `/donationReports/{reportId}` record referencing `sourcePledgeId` and marks or deletes the corresponding `/donationPledges/{pledgeId}` document.
*   **General Assembly (`/siteConfig/gaSession`, `/assemblyQuestions/{questionId}`, `/assemblyQuestions/{questionId}/ballots/{uid}`)**:
    *   `/siteConfig/gaSession`: Stores `GASessionState` (`isOpen`, `sessionTitle`, `scheduledDate`, `activeQuestionId`, `openedAt`, `closedAt`, `openedBy`, `location`). `allow read: if isAuthenticated(); allow write: if isAdmin();`.
    *   `/assemblyQuestions/{questionId}`: Stores motion metadata, `status` (`'draft' | 'on_floor' | 'closed'`), `options`, a flat `optionIds: string[]` array for O(1) rule checks, and frozen `finalResults` written when an admin closes the motion. The mutable `ballots[]` array is removed from the parent document. `allow read: if isAuthenticated(); allow write: if isAdmin();`.
    *   `/assemblyQuestions/{questionId}/ballots/{uid}`: Stores immutable per-member ballots (`id`, `questionId`, `memberCode`, `memberName`, `membershipCategory`, `votedOptionId`, `voteWeight`, `timestamp`, `breakdown`), omitting member email and postal address. `allow read: if isAuthenticated(); allow update, delete: if false;`. `allow create` uses 3 `get()` calls (within Firestore's 10 `get()` limit) to enforce:
        1. `isOwner(uid)` (one ballot document per Firebase UID per motion).
        2. `gaSession.isOpen == true` and `gaSession.activeQuestionId == questionId`.
        3. `question.status == 'on_floor'` and `request.resource.data.votedOptionId in question.optionIds`.
        4. Caller `/members/$(uid)` has `membershipStatus == 'active'` or `feeExemption.isExempt == true`, `member.verifiedVoteWeight >= 1 && member.verifiedVoteWeight <= 20`, and `request.resource.data.voteWeight == member.verifiedVoteWeight`.
    *   Clients compute live open-motion tallies by subscribing to the `/ballots` subcollection of the active question; when an admin closes a motion, `/admin/assembly` snapshots the final weighted totals onto `/assemblyQuestions/{questionId}`.
*   **Board Inquiries (`/boardInquiries/{inquiryId}`, `/boardInquiries/{inquiryId}/upvotes/{uid}`)**:
    *   `/boardInquiries/{inquiryId}`: `allow read: if isAuthenticated();`. Active or fee-exempt members can `create` inquiries with `authorUid == request.auth.uid`, `status == 'submitted'`, and no `boardResponse` or `convertedToQuestionId`. Only `isAdmin()` can `update` (answer or escalate to an assembly motion) or `delete`.
    *   `/boardInquiries/{inquiryId}/upvotes/{uid}`: Replaces the shared `upvotes: string[]` array with one document per member UID (`allow read: if isAuthenticated(); allow create, delete: if isOwner(uid) && isActiveOrExemptMember(); allow update: if false;`) to prevent concurrent overwrite races and cross-user tampering.

### 5. Domain Service Layer, Voter Roll Certification, and One-Time Bootstrap

*   **Domain Services & Route-Scoped Subscriptions**: Dedicated Firestore modules (`src/lib/firestoreContent.ts`, `src/lib/firestoreDonations.ts`, `src/lib/firestoreAttendance.ts`, `src/lib/firestoreAssembly.ts`, `src/lib/firestoreBootstrap.ts`, and updated `src/lib/authService.ts`) expose `onSnapshot` listeners and typed write helpers. Subscriptions attach only when needed by the active route (for example, `/admin/donations` subscribes to `/donationPledges` and `/donationReports`, while public `/donate` subscribes only to `/campaigns` and `/destinations`), preventing unprivileged `permission-denied` console errors and redundant reads.
*   **Firebase App Check Initialization**: `src/lib/firebase.ts` initializes App Check via `initializeAppCheck` with `ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY)` and supports `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` for `localhost` development before mounting public pledge writes.
*   **Voter Roll Certification**: `calculateVotingPower()` in `src/utils/votingPower.ts` remains the client preview calculation for member eligibility breakdowns, while `/admin/assembly` (and `/admin/members`) provides a "Certify Voter Roll" action that computes `verifiedVoteWeight` across active and fee-exempt members and writes `verifiedVoteWeight`, `voteWeightVerifiedAt`, and `voteWeightVerifiedBy` in Firestore batches before opening a General Assembly session. Members whose `spouse` or `children` data changed since `voteWeightVerifiedAt` show a pending re-verification indicator in `/admin/members`.
*   **One-Time Bootstrap Without Static Fallbacks**: Public hooks do not fall back to `src/data/*.ts` arrays when a Firestore collection returns zero documents; instead, they distinguish loading state from an explicit empty state so deleted items never reappear on reload. Static seed datasets are imported dynamically only inside `AdminBootstrapPanel` (`/admin/bootstrap`), visible solely to `isSuperAdmin` when `siteConfig/bootstrap` is absent. Clicking bootstrap executes `writeBatch` across initial programs, campaigns, destinations, board members, events, site notice, initial GA state/questions/inquiries, and seeded `verifiedVoteWeight` values, then writes `/siteConfig/bootstrap` so repeated seeding is blocked.

## Alternatives Considered

### Alternative A: Separate Admin Subdomain App (`admin.<domain>`) Sharing Firebase Auth and Firestore

*   **Pros**: Origin isolation between the public site and the admin console, independent deploy cadence, and the option to put VPN or Cloudflare Access in front of the admin subdomain alone.
*   **Cons**: Two separate builds and deployments, separate Firebase Auth sessions across subdomains, duplicated OAuth authorized domains and redirect URIs in `firebase.json`, and shared type/schema synchronization overhead.
*   **Reason for Rejection**: Rejected by author: A lazy-loaded `/admin` route on the same domain removes public UI clutter and bundle weight without operating two deployments, split Auth sessions, or extra OAuth domains for a volunteer-run Verein.

### Alternative B: Dedicated Custom Backend HTTP API Server (Express or Firebase Cloud Functions)

*   **Pros**: Server-side authorization and audit logging, a reusable REST contract for external tools or CLIs, and server-side execution of Firebase Admin SDK operations (provisioning Auth users, custom claims, and payment webhooks).
*   **Cons**: Highest engineering and maintenance cost—requires backend hosting, CORS configuration, Firebase ID token verification middleware, rate limiting, monitoring, and runtime upgrades in a repository with no server runtime today.
*   **Reason for Rejection**: Rejected by author: Direct Cloud Firestore governed by strict `firestore.rules` covers all current Verein workflows without hosting and maintaining a live backend API server.

### Alternative C: UI/Bundle Isolation Only or Partial Persistence Leaving General Assembly in `localStorage`

*   **Pros**: Smaller initial diff and deferred Firestore schema design for donations and General Assembly voting.
*   **Cons**: Leaving `programs`, `campaigns`, `boardMembers`, `events`, `siteNotice`, `donationReports`, `attendance`, or General Assembly controls in React state or `localStorage` causes detached `/admin` edits to vanish on reload and fail to sync across browsers, or leaves GA board controls outside `/admin`.
*   **Reason for Rejection**: Rejected by author: All admin domains—including General Assembly moderation—must live under `/admin` and persist across reloads and devices in Firestore.

### Alternative D: Targeted Cloud Function (`castBallot`) or Client-Submitted Weight with Post-Vote Audit for General Assembly Ballots

*   **Pros**: A `castBallot` Cloud Function avoids client read fan-out on `/ballots` and runs `calculateVotingPower()` server-side; client-submitted weights avoid adding `verifiedVoteWeight` to `/members/{uid}`.
*   **Cons**: A Cloud Function introduces Firebase Blaze billing and backend function deployment solely for GA voting; client-submitted weights allow direct Firestore SDK callers to forge weights up to a numeric cap and rely only on post-vote audit.
*   **Reason for Rejection**: Rejected by author: Immutable per-UID ballot subcollections validated against admin-certified `verifiedVoteWeight` enforce one-vote-per-UID and weight integrity inside `firestore.rules` with zero backend functions.

### Alternative E: Custom History API Hook (`/admin/*` Only) or Hash Routing (`/#/admin/*`)

*   **Pros**: A custom History hook avoids adding `react-router-dom`; hash routing works on any static host without SPA fallback rewrites.
*   **Cons**: A custom History hook leaves public screens without shareable URLs or browser back/forward history and adds bespoke path-parsing code; hash routing produces `#/` URLs and conflicts with native anchor fragments such as `#main-content`.
*   **Reason for Rejection**: Rejected by author: Standard `react-router-dom` `BrowserRouter` paired with a hosting SPA rewrite in `firebase.json` gives clean bookmarkable URLs and browser history across both public and `/admin` routes.

### Alternative F: Local-Only Public Donation Reference or Authenticated-Only Donation Pledges

*   **Pros**: Eliminates unauthenticated Firestore write rules and Firebase App Check setup on `/donate`.
*   **Cons**: Local-only transfer instructions lose pre-settlement donor pledge visibility in `/admin/donations`; authenticated-only pledges exclude non-member public donors who do not create an account.
*   **Reason for Rejection**: Rejected by author: Separating write-only public `/donationPledges` (locked to `Processing` status and protected by App Check) from admin-only `/donationReports` captures anonymous pledges without risking verified ledger corruption.

### Alternative G: Read-Only Client Role Preview (`switchedFromSuperAdmin`) and Offline CLI Seed Script (`firebase-admin`)

*   **Pros**: A read-only UI preview lets Super Admins inspect role layouts without signing out; a `tsx` + `firebase-admin` CLI script removes seed files from client bundles and supports automated CI seeding.
*   **Cons**: Client-side role preview cannot test actual `firestore.rules` denials (the active Auth UID stays Super Admin) and adds preview-guard branches across admin forms; `firebase-admin` CLI seeding adds a dependency and requires local GCP IAM or service-account credentials.
*   **Reason for Rejection**: Rejected by author: Removing client-side user impersonation keeps UI identity aligned with Firebase Auth rules, and a one-time Super Admin `/admin/bootstrap` panel seeds empty databases without distributing service-account credentials.

--------------------------------------------------------------------------------

## Non-Functional Requirements

### Security & Privacy

*   Default-deny `firestore.rules` remains enforced (`match /{document=**} { allow read, write: if false; }`), with explicit field allowlists, required-field checks, type checks, and string/numeric bounds on every new collection.
*   Firebase App Check (`ReCaptchaV3Provider`) must be enabled and enforced on Cloud Firestore before exposing public `/donationPledges` creates in production to prevent automated write-quota abuse.
*   Ballot documents under `/assemblyQuestions/{questionId}/ballots/{uid}` omit member email and postal street address because authenticated members read `/ballots` for live tallying.
*   Shared-origin XSS hygiene: because `/admin` shares an origin with `/`, public and admin components must never render untrusted HTML (`dangerouslySetInnerHTML`) and must validate URL schemes (`https://` or `http://`) on admin-entered image and online-event links.
*   Existing demo-password fallback in `src/lib/authService.ts` (`ensureDefaultVaultSeeded` and hardcoded password normalization) must be gated to local emulator/dev mode only (`import.meta.env.DEV` or emulator enabled) and disabled in production builds.

### Performance & Latency

*   Lazy-loading `/admin/*` removes ~4,450 lines of admin UI code plus `jsqr` and static seed modules from the initial public bundle.
*   Route-scoped `onSnapshot` subscriptions avoid opening unused listeners on public pages.
*   Live General Assembly ballot tallying performs `O(N)` ballot document reads per connected viewer for the active motion (practical for tens to a few hundred Verein members; migrate to Cloud Function aggregation if concurrent attendance grows into the thousands).

### Rollout & Rollback

*   **Rollout sequence**:
    1. Configure Firebase App Check (reCAPTCHA v3) and deploy updated `firestore.rules` and `firestore.indexes.json` first, keeping `/members` and `/attendance` backward-compatible.
    2. Deploy the updated frontend build along with the `firebase.json` hosting SPA rewrite (`**` to `/index.html`).
    3. Sign in as Super Admin at `/admin/bootstrap` to seed initial collections and run "Certify Voter Roll" to stamp `verifiedVoteWeight` on active and fee-exempt members.
    4. Turn on App Check enforcement for Cloud Firestore after verifying public `/donate` pledge submissions.
*   **Rollback**: Redeploy the previous static hosting build; new Firestore collections and optional member fields (`verifiedVoteWeight`, `voteWeightVerifiedAt`, `voteWeightVerifiedBy`) are ignored by the prior client, and prior `firestore.rules` can be restored via `firebase deploy --only firestore:rules`.

--------------------------------------------------------------------------------

### Future Improvements

*   **Server-Side Automation**: Add Cloud Functions for transactional donation and membership emails, live TWINT or bank reconciliation webhooks, and automatic `verifiedVoteWeight` recomputation when a family child reaches age 16.
*   **Strict Origin & Network Isolation**: Move `/admin` to a separate origin (`admin.<domain>`) behind Cloudflare Access or VPN if dedicated network isolation becomes a requirement.
*   **Seed Module Cleanup**: Remove temporary static seed data files (`src/data/*.ts` initial arrays) once production Firestore has been bootstrapped and backed up.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

### Target Files to Create/Modify

#### 1. `package.json` (Modify)

*   **Type / Scope**: Project manifest and npm scripts
*   **Proposed Changes**: Add `react-router-dom` to `dependencies`, add `vitest`, `@testing-library/react`, `jsdom`, and `@firebase/rules-unit-testing` to `devDependencies`, and add `"test": "vitest run"` and `"test:rules"` scripts so client routing works and unit and Firestore rules tests can run.

#### 2. `.env.example` (Modify)

*   **Type / Scope**: Environment variable template
*   **Proposed Changes**: Add `VITE_RECAPTCHA_SITE_KEY=""` and `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=""` to document the Firebase App Check configuration keys needed by the client.

#### 3. `src/vite-env.d.ts` (Modify)

*   **Type / Scope**: TypeScript Vite environment declarations
*   **Proposed Changes**: Declare typed `ImportMetaEnv` properties for `VITE_FIREBASE_*`, `VITE_USE_FIREBASE_EMULATOR`, `VITE_RECAPTCHA_SITE_KEY`, and `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` so `tsc --noEmit` validates environment variable lookups.

#### 4. `firebase.json` (Modify)

*   **Type / Scope**: Firebase Hosting and Emulator configuration
*   **Proposed Changes**: Add a `hosting` block (`"public": "dist"` with SPA rewrite `"source": "**"` to `"/index.html"`) so direct loads and hard reloads on `/admin/*` and public routes never return 404, plus an `emulators` block (`auth: 9099`, `firestore: 8080`, `hosting: 5000`) for local rules and end-to-end verification.

#### 5. `firestore.rules` (Modify)

*   **Type / Scope**: Cloud Firestore Security Rules
*   **Proposed Changes**: Keep default-deny (`match /{document=**}`) and existing role helpers (`isSuperAdmin()`, `isAdmin()`, `canManageBoard()`, `canScanQR()`, `isAuthorizedStaff()`, `isAdminOrScanner()`). Add `isActiveOrExemptMember()`. Extend `isValidMember()` with optional `verifiedVoteWeight` (`0..20`), `voteWeightVerifiedAt`, and `voteWeightVerifiedBy`, forbid setting them in `hasNoPrivilegesOnCreate()`, and list all three in `protectedPrivilegeAndFinancialFields` inside `isAllowedSelfProfileUpdate()`. Add public-read / `isAdmin()`-write rules for `/programs/{id}`, `/campaigns/{id}`, `/destinations/{id}`, `/events/{id}`, and `/siteConfig/notice`, and `isAdmin() || canManageBoard()` writes for `/boardMembers/{id}`. Add `/siteConfig/bootstrap` (`read, create: isSuperAdmin()`, `update, delete: false`). Add write-only public `/donationPledges/{pledgeId}` (`create: true` with strict field allowlist, `amount` `1..100000`, `currency == 'CHF'`, `status == 'Processing'`, bounded strings; `read, update, delete: isAdmin()`) alongside admin-only `/donationReports/{reportId}`. Add `/siteConfig/gaSession`, `/assemblyQuestions/{questionId}` (requiring `optionIds` list and disallowing embedded mutable ballots), `/assemblyQuestions/{questionId}/ballots/{uid}` (`read: isAuthenticated()`, `create` enforcing `isOwner(uid)`, `gaSession.isOpen == true`, `gaSession.activeQuestionId == questionId`, `question.status == 'on_floor'`, active/exempt standing, `voteWeight == member.verifiedVoteWeight`, and `votedOptionId in question.optionIds`; `update, delete: false`), `/boardInquiries/{inquiryId}` (`read: isAuthenticated()`, active/exempt member `create` with `authorUid == request.auth.uid`, `status == 'submitted'`, and no `boardResponse` or `convertedToQuestionId`; `update, delete: isAdmin()`), and `/boardInquiries/{inquiryId}/upvotes/{uid}` (`read: isAuthenticated()`, `create, delete: isOwner(uid) && isActiveOrExemptMember()`, `update: false`). Rules authoring during implementation must go through strict production security-rules verification (`firestore-rules-author`) and pass emulator unit tests.

#### 6. `firestore.indexes.json` (Modify)

*   **Type / Scope**: Cloud Firestore composite index definitions
*   **Proposed Changes**: Add composite indexes on `attendance` (`eventId` ASC, `scannedAt` DESC) and `donationPledges` (`status` ASC, `date` DESC) to support filtered queries in `/admin/attendance` and `/admin/donations`.

#### 7. `src/types.ts` (Modify)

*   **Type / Scope**: Shared TypeScript domain interfaces
*   **Proposed Changes**: Narrow `NavScreen` to public and member routes (removing `'admin'`), add `AdminTabId` (`'programs' | 'events' | 'content' | 'board' | 'donations' | 'members' | 'attendance' | 'assembly' | 'bootstrap'`); add optional `verifiedVoteWeight`, `voteWeightVerifiedAt`, and `voteWeightVerifiedBy` to `UserAccount`; add `DonationPledge` (`status: 'Processing' | 'Promoted' | 'Rejected'`, optional `promotedReportId`) and optional `sourcePledgeId` on `DonationReport`; add `optionIds: string[]` and optional `finalResults` to `AssemblyQuestion` while omitting `memberEmail` from `CastBallot` and removing embedded ballots from `AssemblyQuestion`; add `authorUid` and hydrated upvote summary fields to `BoardInquiry`; add `BootstrapMetadata` (`seededAt`, `seededBy`, `version`).

#### 8. `src/lib/firebase.ts` (Modify)

*   **Type / Scope**: Firebase Web SDK initialization and App Check setup
*   **Proposed Changes**: Initialize Firebase App Check (`initializeAppCheck` using `ReCaptchaV3Provider` with `VITE_RECAPTCHA_SITE_KEY` and optional `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` in development) before Firestore writes, export `getAppCheckStatus()`, and restrict runtime `localStorage` Firebase config overrides (`saveRuntimeFirebaseConfig`, `clearRuntimeFirebaseConfig`) to `import.meta.env.DEV`.

#### 9. `src/lib/authService.ts` (Modify)

*   **Type / Scope**: Authentication and member registry service
*   **Proposed Changes**: Gate `ensureDefaultVaultSeeded` and legacy demo-password normalization behind `import.meta.env.DEV` or emulator mode so production builds rely solely on Firebase Auth; remove eager production import of `INITIAL_MEMBERS_LIST`; add targeted single-document Firestore writes (`updateMemberDocument(uid, patch)`, `deleteMemberDocument(uid)`, `batchUpdateVerifiedVoteWeights(updates)`) replacing array-level `localStorage` persistence.

#### 10. `src/context/AuthContext.tsx` (Create)

*   **Type / Scope**: React Context provider for authentication and live profile roles
*   **Proposed Changes**: Centralize Firebase `onAuthStateChanged` and the live `/members/{uid}` Firestore subscription, exposing `authStatus` (`'loading' | 'unauthenticated' | 'authenticated'`), `currentUser`, derived role booleans (`hasFullAdmin`, `isSuperAdmin`, `canManageBoard`, `canScanQR`, `hasAnyStaffRole`), and `signOut` so routes and guards share one live auth source without prop drilling from `App.tsx`.

#### 11. `src/lib/urlValidation.ts` (Create)

*   **Type / Scope**: Client security utility
*   **Proposed Changes**: Export `isSafeHttpUrl(url: string): boolean` enforcing `https://` or `http://` schemes for admin-entered image URLs and online event links to reduce shared-origin XSS exposure.

#### 12. `src/lib/firestoreContent.ts` (Create)

*   **Type / Scope**: Firestore service module for public and editable content collections
*   **Proposed Changes**: Provide route-scoped `onSnapshot` subscriptions (`subscribePrograms`, `subscribeCampaigns`, `subscribeDestinations`, `subscribeEvents`, `subscribeBoardMembers`, `subscribeSiteNotice`) returning `{ data, loading, error }` without static seed fallbacks, plus typed admin create, update, and delete functions.

#### 13. `src/lib/firestoreDonations.ts` (Create)

*   **Type / Scope**: Firestore service module for donation pledges and verified reports
*   **Proposed Changes**: Provide `submitDonationPledge(pledge)` for public `/donate` submissions into `/donationPledges/{id}` (`status: 'Processing'`), admin subscriptions for `/donationPledges` and `/donationReports`, atomic `writeBatch` `promotePledgeToReport(pledge, adminName)` promotion, pledge rejection, and manual report creation.

#### 14. `src/lib/firestoreAttendance.ts` (Create)

*   **Type / Scope**: Firestore service module for event QR attendance
*   **Proposed Changes**: Provide live Firestore subscription to `/attendance` (with optional `eventId` filter), `recordAttendanceCheckIn(record)`, `deleteAttendanceRecord(recordId)`, and `settleDoorCashFee(memberUid, settlementPatch)` touching only the fields allowed by `isAllowedScannerDoorSettlementUpdate()`.

#### 15. `src/lib/firestoreAssembly.ts` (Create)

*   **Type / Scope**: Firestore service module for General Assembly voting and board inquiries
*   **Proposed Changes**: Provide subscriptions and write helpers for `/siteConfig/gaSession`, `/assemblyQuestions`, `/assemblyQuestions/{questionId}/ballots/{uid}`, `/boardInquiries`, and `/boardInquiries/{inquiryId}/upvotes/{uid}`, including `castMemberBallot(questionId, ballot)`, `closeMotionWithFinalResults(questionId, ballots, adminName)`, `toggleInquiryUpvote(inquiryId, uid)`, and admin inquiry response and escalation functions.

#### 16. `src/lib/firestoreBootstrap.ts` (Create)

*   **Type / Scope**: One-time Firestore seed service
*   **Proposed Changes**: Check `/siteConfig/bootstrap` existence and implement `runInitialBootstrap(adminUser)` using dynamic `import('../data/...')` calls, computing initial `verifiedVoteWeight` via `calculateVotingPower()`, committing documents in chunked `writeBatch` operations (under 500 writes per batch), and creating `/siteConfig/bootstrap`.

#### 17. `src/main.tsx` (Modify)

*   **Type / Scope**: Application bootstrap entry point
*   **Proposed Changes**: Wrap `<App />` with `<BrowserRouter>`, `<LanguageProvider>`, and `<AuthProvider>` so URL routing, translations, and auth state apply across both public and lazy-loaded `/admin` routes.

#### 18. `src/App.tsx` (Modify)

*   **Type / Scope**: Root route dispatcher
*   **Proposed Changes**: Replace the 834-line `currentScreen` state container with a route table mounting `<PublicLayout />` routes (`/`, `/programs`, `/donate`, `/gallery`, `/about`, `/contact`, `/login`, `/member`, `/assembly`, catch-all `*` redirect to `/`) and `<Route path="/admin/*" element={<Suspense ...><LazyAdminApp /></Suspense>} />`. Remove in-memory `useState` copies of programs, campaigns, destinations, donations, board members, events, notice, and GA state; remove `isAdminMode`, `switchedFromSuperAdmin`, `handleSwitchToUser`, `handleReturnToSuperAdmin`, and all eager imports of admin components and `src/data/*`.

#### 19. `src/components/PublicLayout.tsx` (Create)

*   **Type / Scope**: Shared layout shell for public and member routes
*   **Proposed Changes**: Render the `#main-content` skip link, decluttered `Navbar`, Firestore-backed `SiteNotice` banner, `<Outlet />`, `Footer`, `InfoModals`, and `StatutenModal`, and synchronize `document.title` with the active route path.

#### 20. `src/components/admin/AdminApp.tsx` (Create)

*   **Type / Scope**: Lazy-loaded `/admin/*` router entry chunk
*   **Proposed Changes**: Wrap nested admin routes inside `AdminRouteGuard` and `AdminLayout`, redirecting `/admin` to the signed-in staff user's first permitted sub-route and mounting `/admin/programs`, `/admin/events`, `/admin/content`, `/admin/board`, `/admin/donations`, `/admin/members`, `/admin/attendance` (sub-lazy chunk isolating `AdminEventAttendanceScanner` and `jsqr`), `/admin/assembly`, and `/admin/bootstrap`.

#### 21. `src/components/admin/AdminRouteGuard.tsx` (Create)

*   **Type / Scope**: Route-level auth and role guard for `/admin/*`
*   **Proposed Changes**: Inspect `AuthContext` state: render a neutral loading view while auth or profile loads, render `AdminLoginGate` when unauthenticated (preserving the requested `/admin/*` path for post-login redirect), render an Access Denied view with a return link to `/` for authenticated non-staff users, and enforce per-route role checks redirecting partial-privilege staff (`canScanQR`, `canManageBoard`) to their first permitted tab.

#### 22. `src/components/admin/AdminLoginGate.tsx` (Create)

*   **Type / Scope**: Dedicated `/admin` sign-in component
*   **Proposed Changes**: Provide email/password, admin member-code lookup, and Google Sign-In scoped to `/admin`, excluding public member sign-up paywalls and developer Firebase configuration modals.

#### 23. `src/components/admin/AdminLayout.tsx` (Create)

*   **Type / Scope**: Minimal isolated layout shell for `/admin/*`
*   **Proposed Changes**: Render the admin navigation bar/sidebar with active role badge, links filtered to permitted `AdminTabId` tabs, `LanguageSelector`, a "Return to Public Site" link to `/`, and a Sign Out button while omitting public marketing navigation, notice bar, and footer.

#### 24. `src/components/AdminDashboard.tsx` (Modify)

*   **Type / Scope**: Admin content, board, and donations workspace component
*   **Proposed Changes**: Remove embedded header/tab chrome (moved to `AdminLayout` and routes), remove `onExitAdminMode` and eager `INITIAL_BOARD_MEMBERS` reset imports, wire Programs, Content (Campaigns and Site Notice), Board, and Donations (adding the `/donationPledges` review and promotion queue beside `/donationReports`) directly to `firestoreContent` and `firestoreDonations`, and validate entered image URLs with `isSafeHttpUrl`.

#### 25. `src/components/admin/AdminEventsTab.tsx` (Create)

*   **Type / Scope**: Dedicated `/admin/events` management view
*   **Proposed Changes**: Provide community event creation, editing, and deletion backed by `firestoreContent` (validating `imageUrl` and `onlineLink` via `isSafeHttpUrl`), replacing the inline `isAdminMode` event creation modal previously embedded in `HomeView.tsx` and `EventCalendar.tsx`.

#### 26. `src/components/AdminMembersTab.tsx` (Modify)

*   **Type / Scope**: Admin member directory and governance tab
*   **Proposed Changes**: Replace whole-array `onUpdateMembers` and `onSwitchUser` callbacks with targeted single-document Firestore mutations (`updateMemberDocument`, `deleteMemberDocument`), remove Role Testing Mode user-switcher controls, and display each member's `verifiedVoteWeight` alongside a mismatch indicator and one-click re-verify button when `calculateVotingPower(member).totalVotes !== member.verifiedVoteWeight`.

#### 27. `src/components/AdminEventAttendanceScanner.tsx` (Modify)

*   **Type / Scope**: Admin/volunteer QR attendance scanner tab
*   **Proposed Changes**: Replace `localStorage` (`vpi_event_attendance_records`) and static `INITIAL_COMMUNITY_EVENTS` with live Firestore subscriptions (`firestoreAttendance`, `firestoreContent` events, and `subscribeToFirestoreMembers`), save check-ins to `/attendance/{recordId}`, and submit door cash dues updates via `settleDoorCashFee()`.

#### 28. `src/components/admin/AdminAssemblyTab.tsx` (Create)

*   **Type / Scope**: Dedicated `/admin/assembly` General Assembly moderation console
*   **Proposed Changes**: House all board moderation controls extracted from `GeneralAssemblyView.tsx`: GA session open/close toggle, batch "Certify Voter Roll" action writing `verifiedVoteWeight` across active and fee-exempt members, motion authoring (`draft`), placing a motion `on_floor`, closing a motion with frozen `finalResults`, and answering or escalating `/boardInquiries`.

#### 29. `src/components/admin/AdminBootstrapPanel.tsx` (Create)

*   **Type / Scope**: Super Admin one-time database seed view
*   **Proposed Changes**: Mount at `/admin/bootstrap` only for `isSuperAdmin` when `/siteConfig/bootstrap` does not exist; show current collection counts and trigger `runInitialBootstrap()`.

#### 30. `src/components/Navbar.tsx` (Modify)

*   **Type / Scope**: Public website navigation header
*   **Proposed Changes**: Switch navigation buttons to `react-router-dom` `NavLink`/`useNavigate`; remove `isAdminMode`, `onToggleAdminMode`, the public header `Admin`/`QR Scanner`/`Board Admin` tab, and both desktop and mobile `Admin ON/OFF` toggles; render a single `/admin` entry inside the signed-in user dropdown strictly when `hasAnyStaffRole` is true.

#### 31. `src/components/Footer.tsx` (Modify)

*   **Type / Scope**: Public website footer
*   **Proposed Changes**: Replace `onNavigate(screen)` callbacks with router navigation to `/`, `/programs`, `/donate`, `/gallery`, `/about`, and `/contact`.

#### 32. `src/components/HomeView.tsx` (Modify)

*   **Type / Scope**: Public home page view
*   **Proposed Changes**: Remove `isAdminMode`, `onAddEvent`, and direct `PROGRAMS_DATA` imports; subscribe to live events and featured programs from `firestoreContent` with explicit loading and empty states, and navigate CTAs through the router.

#### 33. `src/components/EventCalendar.tsx` (Modify)

*   **Type / Scope**: Public event calendar widget
*   **Proposed Changes**: Remove `isAdminMode` prop and inline event creation button and modal (moved to `AdminEventsTab.tsx`), and navigate program links via `react-router-dom`.

#### 34. `src/components/ProgramsView.tsx` (Modify)

*   **Type / Scope**: Public programs catalog view
*   **Proposed Changes**: Remove `PROGRAMS_DATA` import and static fallback prop; subscribe to `/programs` via `firestoreContent` with loading and empty states, and route donate CTAs to `/donate`.

#### 35. `src/components/DonateView.tsx` (Modify)

*   **Type / Scope**: Public donations view
*   **Proposed Changes**: Remove `CAMPAIGNS_DATA` and `INITIAL_DESTINATIONS` imports and static fallbacks; subscribe to `/campaigns` and `/destinations` via `firestoreContent`; replace fake `'Completed'` report generation with `submitDonationPledge()` writing a `'Processing'` pledge to `/donationPledges/{id}` and display clear pending-verification confirmation alongside PostFinance IBAN details.

#### 36. `src/components/AboutContactViews.tsx` (Modify)

*   **Type / Scope**: Public About and Contact views
*   **Proposed Changes**: Remove `isAdminMode`, `onNavigateToAdminBoard`, inline board edit controls, and `INITIAL_BOARD_MEMBERS` fallback; read `/boardMembers` from `firestoreContent` and route sign-in actions to `/login`.

#### 37. `src/components/GalleryView.tsx` (Modify)

*   **Type / Scope**: Public photo gallery view
*   **Proposed Changes**: Replace `onNavigate` prop with router navigation to `/login`.

#### 38. `src/components/AuthView.tsx` (Modify)

*   **Type / Scope**: Member sign-in and statutory registration view
*   **Proposed Changes**: Connect login and registration flows to `AuthContext` and `useNavigate` (navigating standard members to `/member` or preserving redirect state); gate the runtime Firebase configuration override modal behind `import.meta.env.DEV` so production `/login` exposes no developer override UI.

#### 39. `src/components/MemberProfileView.tsx` (Modify)

*   **Type / Scope**: Authenticated member profile and membership card view
*   **Proposed Changes**: Replace `onNavigate` and `onNavigateToAdminTab` callbacks with router navigation, linking the existing "Delegated Administrative Roles" buttons directly to `/admin/attendance`, `/admin/board`, and `/admin/programs`, and persist allowed self-service profile edits via `updateMemberDocument`.

#### 40. `src/components/GeneralAssemblyView.tsx` (Modify)

*   **Type / Scope**: Member General Assembly voting and board inquiry portal
*   **Proposed Changes**: Strip all board moderation controls, question-authoring modals, and `onSwitchUser` demo switchers (moved to `AdminAssemblyTab.tsx`); subscribe to `gaSession`, `assemblyQuestions`, active motion `/ballots`, `boardInquiries`, and `/upvotes` via `firestoreAssembly`; submit votes via `castMemberBallot()` checking `currentUser.verifiedVoteWeight` and informing members if family vote weight awaits board verification.

#### 41. `src/i18n/types.ts` and `src/i18n/translations/{de,en,id,ms}.ts` (Modify)

*   **Type / Scope**: Multilingual UI translation schema and dictionaries
*   **Proposed Changes**: Add localized strings across all four locales (`de`, `en`, `id`, `ms`) for `/admin` shell navigation (`events`, `assembly`, `bootstrap`, "Return to Public Site", "Access Denied"), pending donation pledge confirmation, and voter roll verification status; remove unused `adminOn` and `adminOff` navbar toggle keys.

#### 42. `README.md` (Modify)

*   **Type / Scope**: Repository developer documentation
*   **Proposed Changes**: Document the `/admin` route topology, Firebase App Check environment variables (`VITE_RECAPTCHA_SITE_KEY`, `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN`), emulator security-rules test commands, and the one-time `/admin/bootstrap` setup flow.

#### 43. `tests/firestore.rules.test.ts` (Create)

*   **Type / Scope**: Automated Firestore Security Rules unit test suite
*   **Proposed Changes**: Use `@firebase/rules-unit-testing` against the Firestore Emulator to verify default-deny, public-read/admin-write content rules, `canManageBoard` scope, rejection of member self-edits to `verifiedVoteWeight`, write-only `'Processing'` `/donationPledges` versus admin-only `/donationReports`, `/ballots/{uid}` immutability and weight/session/floor/`optionIds` checks, and `/upvotes/{uid}` owner-only create/delete rules.

#### 44. `tests/adminRouteGuard.test.tsx` (Create)

*   **Type / Scope**: Unit and component test suite for admin routing and URL validation
*   **Proposed Changes**: Use Vitest and React Testing Library to verify unauthenticated users see `AdminLoginGate`, non-staff users see Access Denied, `canScanQR`-only operators redirect from `/admin/members` to `/admin/attendance`, `canManageBoard`-only operators access only `/admin/board`, and `isSafeHttpUrl` rejects non-HTTP(S) schemes.

### Verification Plan

*   **Compilation and Type Checking**: Run `npm run lint` (`tsc --noEmit`) and verify exit code `0` with zero TypeScript errors.
*   **Production Build and Bundle Split Verification**: Run `npm run build` (`vite build`) and verify exit code `0`; inspect `dist/assets/` to confirm the initial public entry bundle contains zero references to `AdminDashboard`, `AdminEventAttendanceScanner`, `jsqr`, or `src/data/*` static seed modules, confirming `/admin/*` loads solely as lazy chunks.
*   **Firestore Security Rules Tests**: Run `firebase emulators:exec --only firestore "npm run test:rules"` and verify all rule cases pass across unauthenticated, standard member, `canScanQR`, `canManageBoard`, `isAdmin`, and `isSuperAdmin` contexts.
*   **Unit and Guard Tests**: Run `npm test` (`vitest run`) and verify all `AdminRouteGuard` role-routing tests and `isSafeHttpUrl` validation tests pass.
*   **End-to-End and Hosting Verification (Local Emulators / `localhost:3000`)**:
    *   Walk through CUJ 1 through CUJ 5 against Firebase Emulators (`firebase emulators:start` plus `vite`) and built `hosting` preview.
    *   Verify direct navigation and hard browser refresh on `/admin/attendance` resolves via the `firebase.json` SPA rewrite without 404.
    *   Verify camera QR scanning works on `/admin/attendance` on `localhost` and HTTPS.
    *   Verify changes saved in `/admin/programs` propagate in real time to a second browser tab on `/programs`.
    *   Verify submitting a public pledge on `/donate` creates a `'Processing'` `/donationPledges` document and promoting it in `/admin/donations` updates `/donationReports`.
    *   Verify "Certify Voter Roll" in `/admin/assembly` stamps `verifiedVoteWeight` and enables live ballot casting across two concurrent signed-in browser sessions.

--------------------------------------------------------------------------------

*Drafted with EGM*
