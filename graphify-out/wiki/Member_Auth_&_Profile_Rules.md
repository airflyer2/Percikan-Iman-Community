# Member Auth & Profile Rules

> 60 nodes · cohesion 0.09

## Key Concepts

- **authService.ts** (51 connections) — `src/lib/authService.ts`
- **match /members/{uid}** (31 connections) — `firestore.rules`
- **AuthView.tsx** (29 connections) — `src/components/AuthView.tsx`
- **AdminMembersTab.tsx** (25 connections) — `src/components/AdminMembersTab.tsx`
- **firebase.ts** (24 connections) — `src/lib/firebase.ts`
- **AdminLoginGate.tsx** (17 connections) — `src/components/admin/AdminLoginGate.tsx`
- **AuthView()** (15 connections) — `src/components/AuthView.tsx`
- **registerMember()** (14 connections) — `src/lib/authService.ts`
- **signInMember()** (14 connections) — `src/lib/authService.ts`
- **AdminMembersTab()** (13 connections) — `src/components/AdminMembersTab.tsx`
- **authenticateWithGoogle()** (11 connections) — `src/lib/authService.ts`
- **isDevOrEmulatorMode()** (11 connections) — `src/lib/authService.ts`
- **AdminLoginGate()** (10 connections) — `src/components/admin/AdminLoginGate.tsx`
- **sendMemberPasswordReset()** (10 connections) — `src/lib/authService.ts`
- **subscribeToFirestoreMembers()** (10 connections) — `src/lib/authService.ts`
- **updateMemberDocument()** (10 connections) — `src/lib/authService.ts`
- **completeGoogleMemberRegistration()** (9 connections) — `src/lib/authService.ts`
- **loadDevSeedMembers()** (9 connections) — `src/lib/authService.ts`
- **sanitizeFirestorePayload()** (9 connections) — `src/lib/authService.ts`
- **batchUpdateVerifiedVoteWeights()** (8 connections) — `src/lib/authService.ts`
- **MembershipCategory** (8 connections) — `src/types.ts`
- **getFirebaseOptions()** (7 connections) — `src/lib/firebase.ts`
- **deleteMemberDocument()** (6 connections) — `src/lib/authService.ts`
- **ensureDefaultVaultSeeded()** (6 connections) — `src/lib/authService.ts`
- **isEmulatorMode()** (6 connections) — `src/lib/authService.ts`
- *... and 35 more nodes in this community*

## Relationships

- [App Routing & Admin Guards](App_Routing_&_Admin_Guards.md) (28 shared connections)
- [Firestore Content & Public Rules](Firestore_Content_&_Public_Rules.md) (20 shared connections)
- [General Assembly & Ballots](General_Assembly_&_Ballots.md) (14 shared connections)
- [Event Attendance & RBAC](Event_Attendance_&_RBAC.md) (7 shared connections)
- [Brand Assets & Board Data](Brand_Assets_&_Board_Data.md) (3 shared connections)
- [Firestore Validators & Donations](Firestore_Validators_&_Donations.md) (2 shared connections)
- [Admin Architecture & Design](Admin_Architecture_&_Design.md) (2 shared connections)
- [Seed Members & i18n Context](Seed_Members_&_i18n_Context.md) (2 shared connections)

## Source Files

- `firestore.rules`
- `src/components/AdminMembersTab.tsx`
- `src/components/AuthView.tsx`
- `src/components/admin/AdminLoginGate.tsx`
- `src/lib/authService.ts`
- `src/lib/firebase.ts`
- `src/types.ts`

## Audit Trail

- EXTRACTED: 223 (92%)
- INFERRED: 19 (8%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*