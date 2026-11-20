# Graph Report - Percikan-Iman-Community  (2026-11-19)

## Corpus Check
- 109 files · ~184,419 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 3, .pbtxt 2, .example 1)

## Summary
- 851 nodes · 2595 edges · 27 communities (24 shown, 3 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 269 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Routing & Admin Guards
- Firestore Content & Public Rules
- General Assembly & Ballots
- Playwright E2E & Emulators
- Member Auth & Profile Rules
- Firestore Validators & Donations
- Wegweiser Brand & Legal Docs
- Event Attendance & RBAC
- Seed Members & i18n Context
- Admin Architecture & Design
- DevDependencies & Tooling
- Brand Lockup SVG Variants
- Brand Styleguide & IG System
- Spark Motifs & Kawung Patterns
- Runtime NPM Dependencies
- TypeScript Compiler Config
- Brand Assets & Board Data
- Vite & Vitest Build Config
- Public Master Logo SVG
- Vitest DOM Test Setup
- Figma Brand & Slides Spec
- Package NPM Scripts
- Source Assets Legacy Logo
- Vite Global Type Env
- Vite Package Metadata
- Firestore Optional Int Helpers

## God Nodes (most connected - your core abstractions)
1. `getFirebaseServices()` - 74 edges
2. `useLanguage()` - 38 edges
3. `formatFirestoreError()` - 37 edges
4. `react` - 36 edges
5. `match /members/{uid}` - 31 edges
6. `useAuth()` - 30 edges
7. `lucide-react` - 29 edges
8. `AdminDashboard()` - 29 edges
9. `buildBootstrapOperations()` - 25 edges
10. `AdminAssemblyTab()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Master Faceted Teardrop-Flame & Crescent Emblem (public/logo.svg)` --semantically_similar_to--> `LOGO_URL`  [AMBIGUOUS] [semantically similar]
  docs/brand/brand-guidelines.md → src/constants/assets.ts
- `contexts()` --references--> `isAuthenticated()`  [INFERRED]
  tests/firestore.rules.test.ts → firestore.rules
- `Firebase App Check & Emulator Environment Variables` --conceptually_related_to--> `initFirebaseAppCheck()`  [INFERRED]
  README.md → src/lib/firebase.ts
- `Design Restraint & Accessibility Quality Floor` --semantically_similar_to--> `Public Site Decluttering (Removal of isAdminMode)`  [INFERRED] [semantically similar]
  .agents/skills/frontend-design/SKILL.md → docs/designs/dedicated_admin_portal.md
- `v2.0 Color Token Architecture (Limestone Greige, Cobalt & Roasted Teak)` --shares_data_with--> `SURFACES`  [INFERRED]
  docs/brand/brand-guidelines.md → src/components/BrandStyleguideView.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Isolated Lazy-Loaded /admin Portal Architecture** — docs_designs_dedicated_admin_portal_shell_isolation_and_code_splitting, docs_designs_dedicated_admin_portal_public_decluttering, docs_designs_dedicated_admin_portal_auth_and_role_guard, readme_dedicated_admin_portal [INFERRED 0.85]
- **Firestore General Assembly Governance & Voter Roll Certification Flow** — docs_designs_dedicated_admin_portal_firestore_persistence_model, docs_designs_dedicated_admin_portal_ga_ballots_and_voter_roll, docs_designs_dedicated_admin_portal_one_time_bootstrap, readme_bootstrap_and_voter_roll_setup [INFERRED 0.85]
- **App-Check-Protected Two-Tier Public Donation Pledge Flow** — docs_designs_dedicated_admin_portal_two_tier_donations, docs_designs_dedicated_admin_portal_domain_services_and_app_check, readme_firebase_app_check_config [INFERRED 0.85]
- **Verein Percikan Iman v2.0 Brand & Visual Design System** — docs_brand_brand_guidelines_master_brand_guidelines, docs_brand_brand_guidelines_swiss_civic_atelier_nusantara, docs_brand_brand_guidelines_color_token_architecture, docs_brand_brand_guidelines_typography_system, docs_brand_brand_guidelines_logo_emblem_architecture, docs_brand_brand_guidelines_anatomy_of_the_spark_motifs, docs_brand_figma_manifest_figma_design_file_a, docs_brand_wegweiser_slides_manifest_figma_slides_file_b [EXTRACTED 1.00]
- **Percikan Wegweiser Dual-Track Bilingual Handbook & 10-Slide Ecosystem** — docs_brand_percikan_wegweiser_handbook_handbook, docs_brand_brand_guidelines_dual_track_bilingual_voice, docs_brand_wegweiser_slides_manifest_slides_manifest, docs_brand_wegweiser_slides_manifest_row_0_intro_orientierung, docs_brand_wegweiser_slides_manifest_row_1_alltag_schweiz, docs_brand_wegweiser_slides_manifest_row_2_finanzen_notfall_gemeinschaft [EXTRACTED 1.00]
- **Swiss ZGB Legal Identity, Tax Honesty & QR-Rechnung Compliance Core** — docs_brand_brand_guidelines_verein_percikan_iman, docs_brand_brand_guidelines_zgb_art_60_79, docs_brand_brand_guidelines_swiss_qr_twint_standards, docs_brand_brand_guidelines_six_swiss_qr_standard, docs_brand_percikan_wegweiser_handbook_ch01_orientation_zgb, docs_brand_percikan_wegweiser_handbook_ch05_zakat_tax_donations [EXTRACTED 1.00]
- **Admin RBAC & Member Privilege Escalation Guardrail** — firestore_rules_match_members, firestore_rules_caller_doc_path, firestore_rules_is_super_admin, firestore_rules_is_admin, firestore_rules_can_manage_board, firestore_rules_can_scan_qr, firestore_rules_is_authorized_staff, firestore_rules_has_no_privileges_on_create, firestore_rules_is_allowed_self_profile_update, firestore_rules_can_admin_create_member_data, firestore_rules_can_staff_update_member_data, firestore_rules_match_attendance, firestore_rules_match_site_config_bootstrap, firestore_rules_policy_rbac_hierarchy, firestore_rules_policy_member_privilege_escalation_guard, src_lib_authservice, src_lib_firestoreattendance, src_lib_firestorebootstrap, src_components_admin_adminrouteguard_staffroleflags, tests_firestore_rules_test [INFERRED 0.95]
- **General Assembly Voting & Board Inquiry Integrity** — firestore_rules_match_site_config_ga_session, firestore_rules_match_assembly_questions, firestore_rules_match_assembly_question_ballots, firestore_rules_match_board_inquiries, firestore_rules_match_board_inquiry_upvotes, firestore_rules_is_valid_ga_session, firestore_rules_is_valid_assembly_question, firestore_rules_is_valid_final_results, firestore_rules_is_valid_ballot, firestore_rules_is_valid_board_inquiry, firestore_rules_is_valid_inquiry_upvote, firestore_rules_is_member_active_or_exempt, firestore_rules_is_active_or_exempt_member, firestore_rules_policy_ga_ballot_integrity, src_lib_firestoreassembly, src_lib_authservice_batchupdateverifiedvoteweights, tests_firestore_rules_test [INFERRED 0.95]
- **Public Content Catalogs vs. Confidential Donation Ledger** — firestore_rules_match_programs, firestore_rules_match_campaigns, firestore_rules_match_destinations, firestore_rules_match_events, firestore_rules_match_board_members, firestore_rules_match_site_config_notice, firestore_rules_match_donation_pledges, firestore_rules_match_donation_reports, firestore_rules_is_valid_image_url, firestore_rules_is_valid_http_url, firestore_rules_is_valid_donation_pledge_create, firestore_rules_is_valid_donation_pledge_update, firestore_rules_is_valid_donation_report, firestore_rules_policy_public_pledge_admin_ledger, firestore_rules_policy_xss_and_url_hardening, src_lib_firestorecontent, src_lib_firestoredonations, tests_firestore_rules_test [INFERRED 0.95]
- **Verein Percikan Iman Schweiz Horizontal Logo Lockup Family** — public_brand_logo_primary_asset, public_brand_logo_duotone_civic_asset, public_brand_logo_monochrome_ink_asset, public_brand_logo_reverse_white_asset, src_components_brandstyleguideview_brand_svg_assets [INFERRED 0.95]
- **Faceted Spark Emblem-Flame Asset Family** — public_brand_emblem_mark_asset, public_brand_emblem_avatar_ig_asset, public_brand_logo_primary_asset, public_brand_logo_duotone_civic_asset, public_brand_logo_monochrome_ink_asset, public_brand_logo_reverse_white_asset [EXTRACTED 1.00]
- **Anatomy of the Spark Editorial & Wayfinding Motif Suite** — public_brand_motif_corner_stamp_asset, public_brand_motif_kawung_divider_asset, public_brand_motif_teak_signpost_asset, public_brand_motif_topographic_ribbon_asset, src_components_brandstyleguideview_motif_assets [INFERRED 0.95]
- **Swiss-Nusantara Kawung, Topographic & Registration Motif System** — public_brand_pattern_swiss_nusantara_asset, public_brand_motif_corner_stamp_asset, public_brand_motif_kawung_divider_asset, public_brand_motif_topographic_ribbon_asset, public_brand_emblem_avatar_ig_asset [INFERRED 0.85]
- **Brand Styleguide SVG Asset & Test Verification Suite** — public_brand_emblem_avatar_ig_asset, public_brand_emblem_mark_asset, public_brand_logo_duotone_civic_asset, public_brand_logo_monochrome_ink_asset, public_brand_logo_primary_asset, public_brand_logo_reverse_white_asset, public_brand_motif_corner_stamp_asset, public_brand_motif_kawung_divider_asset, public_brand_motif_teak_signpost_asset, public_brand_motif_topographic_ribbon_asset, public_brand_pattern_swiss_nusantara_asset, src_components_brandstyleguideview_brandstyleguideview, tests_brandstyleguide_test_brand_files [INFERRED 0.85]

## Communities (27 total, 3 thin omitted)

### Community 0 - "App Routing & Admin Guards"
Cohesion: 0.06
Nodes (76): lucide-react, react, react-router-dom, AboutRoute(), AdminLoadingFallback(), App(), AppRoutes(), AssemblyRoute() (+68 more)

### Community 1 - "Firestore Content & Public Rules"
Cohesion: 0.06
Nodes (91): areImmutableFieldsUnchanged(fields), canManageBoard(), isAdmin(), match /boardMembers/{memberId}, match /campaigns/{campaignId}, match /destinations/{destinationId}, match /events/{eventId}, match /programs/{programId} (+83 more)

### Community 2 - "General Assembly & Ballots"
Cohesion: 0.06
Nodes (75): isAuthenticated(), isMemberActiveOrExempt(memberData), isOwner(userId), isValidBallot(data, pathQuestionId), match /assemblyQuestions/{questionId}/ballots/{uid}, match /assemblyQuestions/{questionId}, match /boardInquiries/{inquiryId}, match /boardInquiries/{inquiryId}/upvotes/{uid} (+67 more)

### Community 3 - "Playwright E2E & Emulators"
Cohesion: 0.06
Nodes (47): @playwright/test, attachTelemetryTrackers(), createRoleContext(), RoleContextHandle, signInViaAdminGate(), signInViaLoginPage(), TelemetryTrackers, attemptUnauthenticatedOrMemberFirestoreRead() (+39 more)

### Community 4 - "Member Auth & Profile Rules"
Cohesion: 0.09
Nodes (51): canAdminCreateMemberData(c, d), canStaffUpdateMemberData(c), hasNoPrivilegesOnCreate(d), isAllowedSelfProfileUpdate(), match /members/{uid}, AdminLoginGate(), AdminLoginGateProps, AdminMembersTab() (+43 more)

### Community 5 - "Firestore Validators & Donations"
Cohesion: 0.08
Nodes (52): hasOnlyAllowedFields(fields), hasRequiredFields(fields), isValidAssemblyQuestion(data), isValidAttendanceRecord(data), isValidBallotBreakdown(data), isValidBoardInquiry(data), isValidBoardMember(data), isValidBoardResponse(data) (+44 more)

### Community 6 - "Wegweiser Brand & Legal Docs"
Cohesion: 0.09
Nodes (35): v2.0 Color Token Architecture (Limestone Greige, Cobalt & Roasted Teak), Verein Percikan Iman Schweiz Master Brand Guidelines (v2.0), SIX Swiss QR-Rechnung Standard, Swiss Civic Atelier x Archipelago Nusantara Aesthetic, Swiss QR-Rechnung & TWINT Donation Compliance, Two-Font Non-Serif Typography System (Plus Jakarta Sans & JetBrains Mono), Verein Percikan Iman Schweiz (Legal & Community Identity), Swiss Civil Code Art. 60-79 ZGB & Statuten (07.01.2025) (+27 more)

### Community 7 - "Event Attendance & RBAC"
Cohesion: 0.11
Nodes (30): callerData(), callerDocPath(), canScanQR(), hasCallerDoc(), isActiveOrExemptMember(), isAdminData(d), isAdminOrScanner(), isAdminOrScannerData(d) (+22 more)

### Community 8 - "Seed Members & i18n Context"
Cohesion: 0.11
Nodes (22): DEFAULT_ADMIN_USER, DEFAULT_FAMILY_MEMBER, DEFAULT_FEE_EXEMPT_MEMBER, DEFAULT_PENDING_PAYMENT_MEMBER, DEFAULT_PERSONAL_MEMBER, DEFAULT_RELOCATED_MEMBER, DEFAULT_SUPER_ADMIN_USER, INITIAL_MEMBERS_LIST (+14 more)

### Community 9 - "Admin Architecture & Design"
Cohesion: 0.07
Nodes (18): Frontend Design Skill Guide, Critical User Journeys (CUJ 1-5), Dedicated /admin Portal and Firestore Persistence Design Doc, Route-Scoped Firestore Domain Services & App Check Initialization, Staged Rollout, Emulator Rules Testing & Verification Plan, match /{document=**} (Default Deny), index.html SPA Entry Document, #root Mount Element & /src/main.tsx Module Script (+10 more)

### Community 10 - "DevDependencies & Tooling"
Cohesion: 0.09
Nodes (30): devDependencies, autoprefixer@^10.4.21, esbuild@^0.25.0, @firebase/rules-unit-testing@^6.0.0, firebase-tools@^14.0.0, jsdom@^26.0.0, @playwright/test@^1.50.0, tailwindcss@^4.1.14 (+22 more)

### Community 11 - "Brand Lockup SVG Variants"
Cohesion: 0.11
Nodes (21): @verein.pi v2 Instagram Avatar Badge (emblem-avatar-ig.svg), Swiss Cardinal Registration Ticks & Roasted Teak Accent Dots (#B8B0A2, #8C5327), Verein Percikan Iman Schweiz — v2 Emblem Mark (emblem-mark.svg), Verein Percikan Iman Schweiz — Cobalt & Roasted Teak Duotone Logo (logo-duotone-civic.svg), Cobalt & Roasted Teak Duotone Civic Palette (#1D5B8C, #8C5327, #132435), Duotone Horizontal Wordmark & Crescent Lockup (Verein Percikan Iman), Verein Percikan Iman Schweiz — Monochrome Slate-Blue Ink Logo (logo-monochrome-ink.svg), Monochrome Slate-Blue Ink Palette (#132435 Uniform Fill) (+13 more)

### Community 12 - "Brand Styleguide & IG System"
Cohesion: 0.10
Nodes (23): Instagram @verein.pi Profile & 3x3 Feed Grid Cadence, Volunteer 3-Minute Figma Flyer Guardrails, Link-in-Bio Mobile Hub (1080x1920, node 9:127), Figma Page 04: Editable IG Templates & 3x3 Grid (node 9:3), Figma Page 05: Volunteer 3-Min Guardrail (node 11:3), BrandStyleguideView(), BrandStyleguideViewProps, BrandSvgAsset (+15 more)

### Community 13 - "Spark Motifs & Kawung Patterns"
Cohesion: 0.11
Nodes (18): Concentric Greige & Warm Paper Circular Badge Frames (#EAE6DF, #FAF9F6, #D5CFC4, #E1DDD4), Optically Centered Faceted Spark Emblem (#5B7E9E Facets & #5B7E9E->#1D5B8C Gradient Wings), Standalone Faceted Spark Emblem-Flame (#5B7E9E Facets & #5B7E9E->#1D5B8C Gradient Wings), Anatomy of the Spark — Corner Registration Stamp (motif-corner-stamp.svg), 45-Degree Quarter Kawung Facet Derived from Spark Emblem (#DFE8F0, #1D5B8C, #5B7E9E), Swiss '+' Crosshair & Precision Corner Frame (#132435, #D5CFC4, #B8B0A2), Roasted Teak Spark Diamond Node (#8C5327), Anatomy of the Spark — Kawung-Facet Chapter Divider (motif-kawung-divider.svg) (+10 more)

### Community 14 - "Runtime NPM Dependencies"
Cohesion: 0.10
Nodes (20): dependencies, dotenv@^17.2.3, express@^4.21.2, @google/genai@^2.4.0, jsqr@^1.4.0, lucide-react@^0.546.0, motion@^12.23.24, qrcode@^1.5.4 (+12 more)

### Community 15 - "TypeScript Compiler Config"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+7 more)

### Community 16 - "Brand Assets & Board Data"
Cohesion: 0.20
Nodes (10): AUTH_HERO_IMAGE, DONATION_HERO_IMAGE, LOGO_URL, MEMBER_AVATARS, PRESET_BOARD_AVATARS, BOARD_DEPARTMENTS, INITIAL_BOARD_MEMBERS, CAMPAIGNS_DATA (+2 more)

### Community 17 - "Vite & Vitest Build Config"
Cohesion: 0.24
Nodes (6): @tailwindcss/vite@^4.1.14, @vitejs/plugin-react@^5.0.4, vitest@^3.2.0, @tailwindcss/vite, @vitejs/plugin-react, vitest

### Community 18 - "Public Master Logo SVG"
Cohesion: 0.42
Nodes (8): Public Logo SVG (public/logo.svg: Verein Percikan Iman master vector logo), SVG Gradient & ClipPath Definitions (linear-pattern-0..6 and clip-0..13), Logo Color Palette: Cerulean Blue (#4da5e0), Gradient Blue (#4ba1de to #336dbf), White (#ffffff), Charcoal (#393536 / #231f20), Crescent Moon Accent Layer (clip-12/clip-13 above I of Iman with white-to-blue gradient), SVG Viewport & Dimensions: width=745, height=196, viewBox=245 236 745 196, Right-Hand Blue Geometric Lattice & Ribbon Logomark (16 solid facets + 6 clipped gradient arcs), Primary Wordmark Layer: Percikan Iman (12 vector letter paths in dark charcoal #393536), Secondary Wordmark Layer: Verein (6 <use> glyph instances #glyph-0-0..4 above Iman in #231f20)

### Community 20 - "Figma Brand & Slides Spec"
Cohesion: 0.29
Nodes (8): Anatomy of the Spark Modular Motif System, Dual-Track Bilingual (DE + ID) Voice & Copy Architecture, Logo & Emblem Architecture (11 C2PA-Free Brand SVGs), Master Faceted Teardrop-Flame & Crescent Emblem (public/logo.svg), Figma Page 02: Modular Motif Library (node 6:3), Figma Page 03: Logo & Avatar System (node 7:3), Figma Slides File B (OOd4uCcNzxHftyjXjd1EoE, 10 Bilingual Slides), Figma Slides Batch & Polish Scripts (slides-batch-1..3, slides-patch-polish)

### Community 21 - "Package NPM Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, clean, dev, lint, preview, test, test:rules

### Community 22 - "Source Assets Legacy Logo"
Cohesion: 0.73
Nodes (6): src/assets/logo.svg — Verein Percikan Iman Legacy Master Logo (745x196, viewBox 245 236 745 196, byte-identical duplicate of public/logo.svg), Legacy Blue & Charcoal Color Palette (#4DA5E0 facet sky, #4BA1DE->#336DBF ribbon gradient, #FFFFFF->#336DBF crescent, #231F20 & #393536 typography), Crescent Moon Mark (clip-12/clip-13 at x=606.82..637.88 y=314.73..345.80, linear-pattern-6 white #FFFFFF to cobalt #336DBF gradient), "Percikan Iman" Vector Wordmark (12 outlined <path> letters at x=251.76..806.15 y=346.16..410.85, #393536 dark charcoal), Faceted Teardrop-Flame Emblem (16 solid #4DA5E0 diamond facets + 6 clipped #4BA1DE-to-#336DBF gradient curved base ribbons at x=826..985 y=243..424), "Verein" Glyph Lockup (glyph-0-0..glyph-0-4 via xlink:href <use> at y=346.73, #231F20 charcoal black)

### Community 23 - "Vite Global Type Env"
Cohesion: 0.50
Nodes (3): ImportMeta, ImportMetaEnv, Window

### Community 24 - "Vite Package Metadata"
Cohesion: 0.67
Nodes (3): vite@^6.2.3, vite@^6.2.3, vite

## Ambiguous Edges - Review These
- `Master Faceted Teardrop-Flame & Crescent Emblem (public/logo.svg)` → `LOGO_URL`  [AMBIGUOUS]
  docs/brand/brand-guidelines.md · relation: semantically_similar_to

## Knowledge Gaps
- **147 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+142 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 208 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Firestore Security Rules (service cloud.firestore)` connect `Firestore Content & Public Rules` to `General Assembly & Ballots`, `Member Auth & Profile Rules`, `Firestore Validators & Donations`, `Event Attendance & RBAC`, `Admin Architecture & Design`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _147 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Routing & Admin Guards` be split into smaller, more focused modules?**
  _Cohesion score 0.05711068211068211 - nodes in this community are weakly interconnected._
- **Why does `getFirebaseServices()` connect `Firestore Content & Public Rules` to `Member Auth & Profile Rules`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Should `Firestore Content & Public Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.0634828188701223 - nodes in this community are weakly interconnected._
- **Why does `match /members/{uid}` connect `Member Auth & Profile Rules` to `General Assembly & Ballots`, `Firestore Validators & Donations`, `Event Attendance & RBAC`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Master Faceted Teardrop-Flame & Crescent Emblem (public/logo.svg)` and `LOGO_URL`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._