# Firestore Content & Public Rules

> 102 nodes · cohesion 0.06

## Key Concepts

- **getFirebaseServices()** (74 connections) — `src/lib/firebase.ts`
- **firestoreContent.ts** (72 connections) — `src/lib/firestoreContent.ts`
- **firestoreBootstrap.ts** (56 connections) — `src/lib/firestoreBootstrap.ts`
- **AdminDashboard.tsx** (55 connections) — `src/components/AdminDashboard.tsx`
- **formatFirestoreError()** (37 connections) — `src/lib/firestoreContent.ts`
- **AdminDashboard()** (29 connections) — `src/components/AdminDashboard.tsx`
- **buildBootstrapOperations()** (25 connections) — `src/lib/firestoreBootstrap.ts`
- **AdminEventsTab.tsx** (24 connections) — `src/components/admin/AdminEventsTab.tsx`
- **stripUndefined()** (22 connections) — `src/lib/firestoreContent.ts`
- **Firestore Security Rules (service cloud.firestore)** (19 connections) — `firestore.rules`
- **DonateView.tsx** (18 connections) — `src/components/DonateView.tsx`
- **isAdmin()** (17 connections) — `firestore.rules`
- **isSafeHttpUrl()** (15 connections) — `src/lib/urlValidation.ts`
- **AdminEventsTab()** (14 connections) — `src/components/admin/AdminEventsTab.tsx`
- **EventCalendar.tsx** (14 connections) — `src/components/EventCalendar.tsx`
- **BootstrapSeedData** (12 connections) — `src/lib/firestoreBootstrap.ts`
- **normalizeSafeHttpUrl()** (12 connections) — `src/lib/firestoreContent.ts`
- **match /boardMembers/{memberId}** (11 connections) — `firestore.rules`
- **CommunityEvent** (11 connections) — `src/types.ts`
- **areImmutableFieldsUnchanged(fields)** (10 connections) — `firestore.rules`
- **match /campaigns/{campaignId}** (10 connections) — `firestore.rules`
- **match /destinations/{destinationId}** (10 connections) — `firestore.rules`
- **match /events/{eventId}** (10 connections) — `firestore.rules`
- **match /programs/{programId}** (10 connections) — `firestore.rules`
- **isValidFirestoreImageUrl()** (10 connections) — `src/lib/firestoreContent.ts`
- *... and 77 more nodes in this community*

## Relationships

- [General Assembly & Ballots](General_Assembly_&_Ballots.md) (31 shared connections)
- [App Routing & Admin Guards](App_Routing_&_Admin_Guards.md) (29 shared connections)
- [Firestore Validators & Donations](Firestore_Validators_&_Donations.md) (27 shared connections)
- [Event Attendance & RBAC](Event_Attendance_&_RBAC.md) (12 shared connections)
- [Brand Assets & Board Data](Brand_Assets_&_Board_Data.md) (7 shared connections)
- [Member Auth & Profile Rules](Member_Auth_&_Profile_Rules.md) (5 shared connections)
- [Admin Architecture & Design](Admin_Architecture_&_Design.md) (3 shared connections)
- [Brand Styleguide & IG System](Brand_Styleguide_&_IG_System.md) (2 shared connections)
- [Seed Members & i18n Context](Seed_Members_&_i18n_Context.md) (2 shared connections)
- [Vite & Vitest Build Config](Vite_&_Vitest_Build_Config.md) (1 shared connections)

## Source Files

- `firestore.rules`
- `src/components/AdminDashboard.tsx`
- `src/components/DonateView.tsx`
- `src/components/EventCalendar.tsx`
- `src/components/PhotoUpload.tsx`
- `src/components/admin/AdminEventsTab.tsx`
- `src/data/donations.ts`
- `src/data/events.ts`
- `src/lib/firebase.ts`
- `src/lib/firestoreAssembly.ts`
- `src/lib/firestoreBootstrap.ts`
- `src/lib/firestoreContent.ts`
- `src/lib/firestoreDonations.ts`
- `src/lib/urlValidation.ts`
- `src/types.ts`
- `tests/urlValidation.test.ts`

## Audit Trail

- EXTRACTED: 399 (89%)
- INFERRED: 48 (11%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*