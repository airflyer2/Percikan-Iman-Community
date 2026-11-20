# buildBootstrapOperations()

> God node · 25 connections · `src/lib/firestoreBootstrap.ts`

**Community:** [Firestore Content & Public Rules](Firestore_Content_&_Public_Rules.md)

## Connections by Relation

### calls
- stripUndefined() `EXTRACTED`
- calculateVotingPower() `EXTRACTED`
- loadBootstrapSeedData() `EXTRACTED`
- buildBoardMemberPayload() `EXTRACTED`
- buildEventPayload() `EXTRACTED`
- buildProgramPayload() `EXTRACTED`
- buildCampaignPayload() `EXTRACTED`
- buildManualDonationReportPayload() `EXTRACTED`
- buildAssemblyQuestionPayload() `EXTRACTED`
- buildDestinationPayload() `EXTRACTED`
- buildSiteNoticePayload() `EXTRACTED`
- buildGaSessionPayload() `EXTRACTED`

### references
- match /siteConfig/bootstrap `INFERRED`

### shares_data_with
- [match /members/{uid}](match_-members-{uid}.md) `INFERRED`
- match /assemblyQuestions/{questionId} `INFERRED`
- match /siteConfig/gaSession `INFERRED`
- match /donationReports/{reportId} `INFERRED`
- match /boardMembers/{memberId} `INFERRED`
- match /campaigns/{campaignId} `INFERRED`
- match /destinations/{destinationId} `INFERRED`
- match /events/{eventId} `INFERRED`
- match /programs/{programId} `INFERRED`
- match /siteConfig/notice `INFERRED`

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*