# Firestore Validators & Donations

> 55 nodes · cohesion 0.08

## Key Concepts

- **firestoreDonations.ts** (33 connections) — `src/lib/firestoreDonations.ts`
- **hasOnlyAllowedFields(fields)** (16 connections) — `firestore.rules`
- **isValidOptionalString(field, minLen, maxLen)** (16 connections) — `firestore.rules`
- **hasRequiredFields(fields)** (15 connections) — `firestore.rules`
- **validStringLength(field, minLen, maxLen)** (15 connections) — `firestore.rules`
- **match /donationPledges/{pledgeId}** (13 connections) — `firestore.rules`
- **match /donationReports/{reportId}** (12 connections) — `firestore.rules`
- **isValidEvent(data)** (10 connections) — `firestore.rules`
- **isValidBoardMember(data)** (9 connections) — `firestore.rules`
- **isValidDonationPledgeUpdate(data)** (9 connections) — `firestore.rules`
- **promotePledgeToReport()** (9 connections) — `src/lib/firestoreDonations.ts`
- **isValidAssemblyQuestion(data)** (8 connections) — `firestore.rules`
- **isValidAttendanceRecord(data)** (8 connections) — `firestore.rules`
- **isValidCampaign(data)** (8 connections) — `firestore.rules`
- **isValidDonationPledgeCreate(data)** (8 connections) — `firestore.rules`
- **isValidBoardInquiry(data)** (7 connections) — `firestore.rules`
- **isValidDonationReport(data)** (7 connections) — `firestore.rules`
- **isValidImageUrl(url)** (7 connections) — `firestore.rules`
- **isValidProgram(data)** (7 connections) — `firestore.rules`
- **submitDonationPledge()** (7 connections) — `src/lib/firestoreDonations.ts`
- **isValidBootstrap(data)** (6 connections) — `firestore.rules`
- **isValidDestination(data)** (6 connections) — `firestore.rules`
- **isValidEmail(email)** (6 connections) — `firestore.rules`
- **isValidGASession(data)** (6 connections) — `firestore.rules`
- **isValidSiteNotice(data)** (6 connections) — `firestore.rules`
- *... and 30 more nodes in this community*

## Relationships

- [Firestore Content & Public Rules](Firestore_Content_&_Public_Rules.md) (23 shared connections)
- [General Assembly & Ballots](General_Assembly_&_Ballots.md) (2 shared connections)
- [Admin Architecture & Design](Admin_Architecture_&_Design.md) (1 shared connections)
- [Member Auth & Profile Rules](Member_Auth_&_Profile_Rules.md) (1 shared connections)
- [Event Attendance & RBAC](Event_Attendance_&_RBAC.md) (1 shared connections)

## Source Files

- `firestore.rules`
- `src/lib/firestoreDonations.ts`

## Audit Trail

- EXTRACTED: 142 (92%)
- INFERRED: 12 (8%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*