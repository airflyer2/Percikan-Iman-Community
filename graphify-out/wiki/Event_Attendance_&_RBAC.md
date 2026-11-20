# Event Attendance & RBAC

> 35 nodes · cohesion 0.11

## Key Concepts

- **AdminEventAttendanceScanner.tsx** (25 connections) — `src/components/AdminEventAttendanceScanner.tsx`
- **firestoreAttendance.ts** (24 connections) — `src/lib/firestoreAttendance.ts`
- **hasCallerDoc()** (10 connections) — `firestore.rules`
- **match /attendance/{recordId}** (10 connections) — `firestore.rules`
- **match /siteConfig/bootstrap** (10 connections) — `firestore.rules`
- **AdminEventAttendanceScanner()** (10 connections) — `src/components/AdminEventAttendanceScanner.tsx`
- **callerData()** (9 connections) — `firestore.rules`
- **isSuperAdmin()** (9 connections) — `firestore.rules`
- **Policy: Member-Backed RBAC Hierarchy (SuperAdmin > Admin > Board/Scanner > Active Member)** (9 connections) — `firestore.rules`
- **runInitialBootstrap()** (9 connections) — `src/lib/firestoreBootstrap.ts`
- **settleDoorCashFee()** (8 connections) — `src/lib/firestoreAttendance.ts`
- **isAuthorizedStaff()** (7 connections) — `firestore.rules`
- **recordAttendanceCheckIn()** (7 connections) — `src/lib/firestoreAttendance.ts`
- **isActiveOrExemptMember()** (6 connections) — `firestore.rules`
- **deleteAttendanceRecord()** (6 connections) — `src/lib/firestoreAttendance.ts`
- **subscribeAttendanceRecords()** (6 connections) — `src/lib/firestoreAttendance.ts`
- **isAdminOrScanner()** (5 connections) — `firestore.rules`
- **FormalStatusRecord** (5 connections) — `src/types.ts`
- **Cloud Firestore Persistence & Default-Deny Security Rules Model** (4 connections) — `docs/designs/dedicated_admin_portal.md`
- **callerDocPath()** (4 connections) — `firestore.rules`
- **Policy: SuperAdmin-Only Create-Once Immutable Bootstrap Marker** (4 connections) — `firestore.rules`
- **buildAttendanceRecordPayload()** (4 connections) — `src/lib/firestoreAttendance.ts`
- **SubscriptionResult** (4 connections) — `src/lib/firestoreContent.ts`
- **canScanQR()** (3 connections) — `firestore.rules`
- **isAdminData(d)** (3 connections) — `firestore.rules`
- *... and 10 more nodes in this community*

## Relationships

- [Firestore Content & Public Rules](Firestore_Content_&_Public_Rules.md) (26 shared connections)
- [Member Auth & Profile Rules](Member_Auth_&_Profile_Rules.md) (7 shared connections)
- [General Assembly & Ballots](General_Assembly_&_Ballots.md) (6 shared connections)
- [App Routing & Admin Guards](App_Routing_&_Admin_Guards.md) (6 shared connections)
- [Firestore Validators & Donations](Firestore_Validators_&_Donations.md) (4 shared connections)
- [Runtime NPM Dependencies](Runtime_NPM_Dependencies.md) (1 shared connections)
- [Admin Architecture & Design](Admin_Architecture_&_Design.md) (1 shared connections)

## Source Files

- `docs/designs/dedicated_admin_portal.md`
- `firestore.rules`
- `src/components/AdminEventAttendanceScanner.tsx`
- `src/lib/firestoreAttendance.ts`
- `src/lib/firestoreBootstrap.ts`
- `src/lib/firestoreContent.ts`
- `src/types.ts`

## Audit Trail

- EXTRACTED: 105 (91%)
- INFERRED: 11 (9%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*