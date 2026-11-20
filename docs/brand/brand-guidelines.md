# Verein Percikan Iman Schweiz — Master Brand Guidelines (v2.0)
**Visual Identity, Bilingual Voice Architecture, Modular Motif System & Volunteer Figma Guardrail**

```text
+-----------------------------------------------------------------------------+
| +  BRAND SYSTEM MANUAL · VERSION 2.0 (2026)                                 |
|    AESTHETIC: "SWISS CIVIC ATELIER × ARCHIPELAGO NUSANTARA"                 |
|    PALETTE: LIMESTONE GREIGE · COBALT & STEEL BLUE · ROASTED TEAK POP       |
|    VEREIN "PERCIKAN IMAN" · ART. 60–79 ZGB · UID CHE-382.914.820            |
|    8000 ZÜRICH, SCHWEIZ · INFO@PERCIKANIMAN.CH · @VEREIN.PI                 |
+-----------------------------------------------------------------------------+
```

---

## 01 · Brand Story, Mission & Legal Identity

### 1.1 Who We Are (`DE + ID`)
**Verein «Percikan Iman»** (Verein Percikan Iman Schweiz) evolved from an Indonesian-Southeast Asian Muslim community network active in Switzerland since **2012** into a formally constituted **Swiss non-profit association under Art. 60–79 ZGB** on **23 February 2025** (`Statuten 07.01.2025`).

Our visual and verbal identity carries a clear dual responsibility:
1. **Swiss Civic Credibility:** When interacting with Swiss municipalities (*Gemeinden*), schools (*Schulleitungen*), cantonal authorities, donors, and interfaith partners, our communication projects legal clarity, financial accountability, and Swiss International Typographic discipline.
2. **Archipelago Nusantara Warmth:** For our 77+ families, youth, Mualaf, and students across Zürich, Zug, Schwyz, Aargau, Basel, Bern, St. Gallen, and Romandie, our presence feels welcoming, grounded, and culturally connected to our Indonesian/Southeast Asian heritage through warm Limestone Greige grounds, Roasted Teak warmth, and faceted Kawung geometry.

### 1.2 Locked Legal & Banking Metadata
Every official publication, flyer footer, donation card, Figma template, and slide deck MUST reproduce these identifiers verbatim:

| Field | Locked Official Value |
| :--- | :--- |
| **Legal Name** | `Verein "Percikan Iman"` / `Verein Percikan Iman Schweiz` |
| **Legal Form** | `Schweizer Verein gemäss Art. 60–79 ZGB` |
| **Registered Seat** | `8000 Zürich, Schweiz` |
| **UID** | `CHE-382.914.820` |
| **Email** | `info@percikaniman.ch` |
| **Instagram** | `@verein.pi` (`https://www.instagram.com/verein.pi`) |
| **Bank & IBAN** | `PostFinance` · `CH89 0900 0000 6049 6610 7` |
| **Founding / Statuten** | Active since `2012` · Constituted `23. Februar 2025` (`PERCIKAN_IMAN_STATUTEN_20250107_FINAL`) |

---

## 02 · Design Philosophy: "Swiss Civic Atelier × Archipelago Nusantara"

Our v2 design system pairs warm architectural Swiss print sensibility with structural clarity and Indonesian geometric craft—completely free of cliché mosque domes, serif ornamentation, or off-brand pastel/green templates:

1. **Swiss International Typographic Style & Limestone Tactility:**
   - Warm architectural **Limestone Greige (`#EAE6DF`)** ground paired with **Warm Stone (`#F4F2ED`)** and **Crisp Ivory (`#FAF9F6`)** editorial surfaces.
   - Visible **`1px` Pebble Border hairline grids (`#D5CFC4`)**, **Strong Stone (`#B8B0A2`)** card frames, and Swiss **`+` registration crosshairs** at grid intersections.
   - Structural micro-wordmark **`VEREIN PERCIKAN IMAN · SCHWEIZ`** in `JetBrains Mono` at top-left or metadata headers.
   - Subtle **Alpine topographic contour ribbons** and the **Roasted Teak (`#8C5327`) Wegweiser trail signpost badge**.
   - **PPI-style bottom-gradient photo recap overlays** (`#132435` Slate-Blue Ink / `#1D5B8C` Percikan Cobalt) for crisp legibility over event photography.
2. **Archipelago Nusantara Geometric Heritage ("Anatomy of the Spark"):**
   - The authentic **faceted diamond teardrop-flame + crescent emblem** from `public/logo.svg` ("spark of faith" / *Percikan Iman*).
   - Modular **Nusantara Kawung / 45° Diamond Facet geometry** engineered as reusable Swiss-hairline stamps, chapter dividers, and seamless structural tiles.

---

## 03 · Color Token Architecture (v2.0)

### 3.1 Master Palette Matrix (Beige-Grey + Blue Undertones + Brown Pop)
All web (`src/index.css`), SVG (`public/brand/`), Figma Design (`tJA2fcaYcckLkwHmRGYvf9`), and Figma Slides (`OOd4uCcNzxHftyjXjd1EoE`) assets use **only** the locked v2 palette below:

| Group | Token Name | CSS Variable | HEX | Role & Usage Rule | WCAG Guidance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Grounds** | **Limestone Greige** | `--color-canvas` | `#EAE6DF` | Primary page, IG studio & slide ground | Tactile beige-grey stone base |
| **Grounds** | **Warm Stone** | `--color-surface-elevated` | `#F4F2ED` | Elevated cards, checklist panels, editorial blocks | High contrast with `#132435` |
| **Grounds** | **Crisp Ivory** | `--color-surface-ivory` | `#FAF9F6` | Highlighted tables, quote panels, light badges | Pure `#FFFFFF` ONLY for SIX QR quiet zone |
| **Grounds** | **Recessed Greige** | `--color-surface-subtle` | `#E1DDD4` | Secondary inset wells, recessed rows, input tracks | Pair with `#132435` / `#4A5E72` |
| **Borders** | **Pebble Border** | `--color-border-stone` | `#D5CFC4` | `1px` Swiss structural hairline grids & dividers | Structural grid only (non-text) |
| **Borders** | **Strong Stone** | `--color-border-strong` | `#B8B0A2` | Card hover borders, registration `+` marks, rules | Subtle structural anchors |
| **Blues** | **Slate-Blue Ink** | `--color-ink` | `#132435` | Primary display text, monochrome logo, dark cover/closing slides | 12.6:1 vs `#EAE6DF` (AAA) |
| **Blues** | **Steel Muted** | `--color-ink-muted` | `#4A5E72` | Body prose, Indonesian translations, captions | 5.4:1 vs `#EAE6DF` (AA+) |
| **Blues** | **Percikan Cobalt** | `--color-cerulean` | `#1D5B8C` | Primary civic accent, CTAs, German structural headings | 6.8:1 with `#FAF9F6` text (AAA) |
| **Blues** | **Cobalt Hover** | `--color-cerulean-hover` | `#15466E` | Interactive hover states, deep gradient transitions | High-contrast white/ivory text |
| **Blues** | **Steel Undertone** | `--color-steel` | `#5B7E9E` | Topographic lines, secondary labels, blueprint strokes | Architectural linework & subtle tags |
| **Blues** | **Ice-Blue Mist** | `--color-cerulean-tint` | `#DFE8F0` | Callout panels, prayer/school schedule tints | Pair with `#132435` or `#1D5B8C` |
| **Blues** | **Powder Sky** | `--color-primary-fixed-dim` | `#9CC4E4` | Highlight text/emblem facets **ONLY** on `#132435` or `#1D5B8C` | **Never** on `#EAE6DF` / `#F4F2ED` / `#FAF9F6` |
| **Brown Pop** | **Roasted Teak** | `--color-teak` | `#8C5327` | Signature contrast pop: Wegweiser signpost badges, chapter pills (`01`–`06`), urgent alerts, Ramadan/Zakat highlights | 5.9:1 with `#FAF9F6` text (AA+) |
| **Brown Pop** | **Teak Deep** | `--color-teak-hover` | `#6F401D` | Pressed/hover states, deep border accents on Teak pills | High-contrast `#FAF9F6` text |
| **Brown Pop** | **Teak Sand** | `--color-teak-tint` | `#F3E8DF` | Warm highlight fills, E-code/callout chips, Ramadan accent cards | Pair with `#8C5327` or `#132435` |

### 3.2 Strict Forbidden Color Rules
- **ZERO Green Tones:** Green accents are completely excluded in v2.0. Ramadan, Eid, Qurban, and Wegweiser highlights use **Roasted Teak (`#8C5327`)**, **Teak Sand (`#F3E8DF`)**, **Percikan Cobalt (`#1D5B8C`)**, and **Slate-Blue Ink (`#132435`)**.
- **ZERO** pastel purple/lavender, neon orange, magenta/hot pink, or generic multi-color rainbow gradients.
- **ZERO** **Powder Sky (`#9CC4E4`)** text on light grounds (`#EAE6DF`, `#F4F2ED`, `#FAF9F6`) — fails WCAG contrast.
- **PURE `#FFFFFF` IS RESERVED FOR SIX QR-RECHNUNG ONLY:** Use `#FAF9F6` (Crisp Ivory) for light cards and badges; keep `#FFFFFF` exclusively for the SIX Swiss QR-Rechnung quiet zone and never recolor the centered Swiss Cross (`7×7mm`).

---

## 04 · Typography System (Strictly 2 Non-Serif Fonts)

### 4.1 Locked Typeface Stack
v2.0 uses a tight, high-contrast **2-font non-serif system** natively available across Web (`Google Fonts`) and Figma (`listAvailableFontsAsync()`):

| Role | Font Family | Exact Figma Styles | Styling & Hierarchy Rules |
| :--- | :--- | :--- | :--- |
| **Display, UI & Bilingual Body** | `Plus Jakarta Sans` | `"Regular"`, `"Medium"`, `"SemiBold"`, `"Bold"`, `"ExtraBold"`, `"Italic"` *(NO spaces in `SemiBold`/`ExtraBold`)* | Display/hero titles use `Bold` / `ExtraBold` with tight tracking (`-0.025em` hero, `-0.02em` section) and `text-wrap: balance`; body prose uses `Regular` / `Medium` at `1.45–1.55` line-height; `Italic` reserved for Qur'anic/editorial emphasis. |
| **Civic Metadata Mono** | `JetBrains Mono` | `"Regular"`, `"Medium"`, `"Bold"`, `"ExtraBold"` *(NOTE: NO `SemiBold` in JetBrains Mono — use `"Bold"` or `"Medium"`)* | `font-variant-numeric: tabular-nums`, `0.06em–0.12em` uppercase tracking for kickers, dates, IBAN, UID, emergency numbers, E-codes, and chapter indices (`01`–`06`). |

### 4.2 Type Hierarchy & Orthography Rules
1. **Strictly Zero Serif Anywhere:** Only `Plus Jakarta Sans` and `JetBrains Mono` are permitted across web, Figma Design, and Figma Slides. Never introduce editorial serif, slab-serif, or classical display serif fonts.
2. **No Fake Unicode Styling:** Never use Unicode mathematical bold/italic/script generators (e.g., `𝑚𝑢𝑠𝑙𝑖𝑚`) in Instagram bios, captions, or flyers.
3. **Tabular Numerals Everywhere:** All CHF amounts (`CHF 5'370.00`), dates (`14.05.2026`), times (`11:00–16:00 CET`), IBAN strings, and UID numbers MUST use `tabular-nums` / monospace alignment.
4. **Swiss Punctuation:** Follow *Schweizer Hochdeutsch* conventions in German copy—always use **`ss`** instead of the eszett ligature (`gemäss`, `Strasse`, `Schluss`, `Grösse`, `grösser`) and Swiss thousands apostrophe (`CHF 5'370`, `2'775`, `2'100`).

---

## 05 · Logo & Emblem Architecture (`public/brand/`)

The master symbol is sourced directly from `public/logo.svg` (a faceted diamond teardrop-flame paired with a subtle crescent & crisp `Verein Percikan Iman` lockup). Clean, C2PA-stripped production vectors live in `public/brand/` (**11 SVGs total**):

| Asset File | Variant | Background & Usage Rule |
| :--- | :--- | :--- |
| `public/brand/logo-primary.svg` | Full-color horizontal lockup (`#1D5B8C`/`#5B7E9E` facets + `#132435` wordmark) | `#EAE6DF` Limestone Greige or `#F4F2ED` Warm Stone |
| `public/brand/logo-monochrome-ink.svg` | Solid Slate-Blue Ink (`#132435`) flat vector | Light backgrounds, laser/monochrome print, official ZGB letters |
| `public/brand/logo-reverse-white.svg` | `#FFFFFF` wordmark + `#FFFFFF` / `#9CC4E4` faceted mark | Dark backgrounds (`#132435` Slate-Blue Ink or `#1D5B8C` Cobalt) |
| `public/brand/logo-duotone-civic.svg` | **Cobalt & Teak Duotone:** `#1D5B8C` Cobalt + `#8C5327` Roasted Teak facets + `#132435` wordmark | Civic partnership headers, Wegweiser chapters, Slide 10 |
| `public/brand/emblem-mark.svg` | Standalone faceted teardrop-flame mark | App icons, corner stamps, document headers |
| `public/brand/emblem-avatar-ig.svg` | `1080×1080` IG Avatar (`#EAE6DF` / `#FAF9F6` studio badge with `#D5CFC4` hairline ring) | Instagram `@verein.pi`, WhatsApp Group, YouTube |
| `public/brand/pattern-swiss-nusantara.svg` | Seamless Swiss-Nusantara tile (Greige / Cobalt / Steel / Teak) | Flyer borders, slide bands, IG templates |
| `public/brand/motif-corner-stamp.svg` | **Anatomy of the Spark #1:** Swiss `+` crosshair + quarter-kawung + Teak dot | Slide corners, poster registration frames |
| `public/brand/motif-kawung-divider.svg` | **Anatomy of the Spark #2:** Horizontal diamond-kawung rhythmic strip | Section dividers across slides, flyers & web `/brand` |
| `public/brand/motif-topographic-ribbon.svg` | **Anatomy of the Spark #3:** Alpine elevation arcs + Steel Undertone contours | Cover slides, Wegweiser chapter headers, hero banners |
| `public/brand/motif-teak-signpost.svg` | **Anatomy of the Spark #4:** Roasted Teak `#8C5327` Wegweiser trail signpost badge | Wegweiser chapter indicators (`01`–`06`), callout pointers |

### Logo Clearspace & Misuse Prevention
- **Minimum Clearspace:** Equal to the height of the capital `V` (or `1×` cap height of the emblem) on all four sides. Never crowd text or borders inside this zone.
- **Minimum Print / Digital Size:** Horizontal lockup min width `120px` digital / `32mm` print; standalone `emblem-mark.svg` min `24px` digital / `8mm` print.
- **Forbidden Misuse:** Never stretch or skew aspect ratio; never place dark `#132435` wordmarks on dark photography; never apply drop shadows, outer glows, or neon outlines; never alter the internal facet geometry of the flame/crescent.

---

## 06 · Modular Motif System ("Anatomy of the Spark")

Instead of static background wallpaper, v2.0 defines a modular geometric toolkit derived from the 45° facet angle of `public/logo.svg`, built as reusable Figma `COMPONENT`s and standalone SVGs:

1. **Motif / Corner Stamp (`motif-corner-stamp.svg`):** Pairs a crisp Swiss `+` registration crosshair (`#B8B0A2`) with a quarter-kawung arc (`#5B7E9E`) and a `6px` Roasted Teak (`#8C5327`) anchor dot. Anchors outer frame corners on flyers, cards, and Wegweiser slides.
2. **Motif / Kawung-Facet Divider (`motif-kawung-divider.svg`):** `16px–24px` tall repeating diamond-kawung sequence punctuated by `+` crosshairs and a centered Roasted Teak facet—separates Dual-Track `DE` and `ID` blocks cleanly.
3. **Motif / Topographic Ribbon (`motif-topographic-ribbon.svg`):** Layered Alpine elevation contour paths (`#5B7E9E` / `#9CC4E4` at controlled contrast) flowing across cover headers and dark Slate-Blue panels without obstructing text legibility.
4. **Motif / Teak Signpost Badge (`motif-teak-signpost.svg`):** Inspired by Swiss *Wanderwegweiser* trail pointers—a sharp pointed `#8C5327` Roasted Teak pill badge (`#FAF9F6` JetBrains Mono label) signaling chapter indices (`01`–`06`), urgent notices, and key action tags.
5. **Motif / Spark Program Seal:** Circular/octagonal Figma `COMPONENT` stamp combining the emblem flame with `VEREIN PERCIKAN IMAN · 8000 ZÜRICH` ring text.

### Seamless Pattern Colorway Editions
| Edition | Canvas / Ground | Linework & Accent | Primary Use Case |
| :--- | :--- | :--- | :--- |
| **01 · Limestone Greige** | `#EAE6DF` | `#D5CFC4` hairlines + `#B8B0A2` `+` marks + `#1D5B8C` diamond anchors + `#8C5327` corner dots | Everyday announcements, Wegweiser body pages, Statuten covers |
| **02 · Ice-Blue Mist** | `#DFE8F0` | `#5B7E9E` contours + `#1D5B8C` facets + `#FAF9F6` inlays | Civic keynotes, school & prayer guides, Kinder/Jugend cards |
| **03 · Deep Slate-Blue & Teak** | `#132435` | `#5B7E9E` contours + `#9CC4E4` facets + `#8C5327` Teak signpost accents | Wegweiser Cover & Impressum, Ramadan/Eid greetings, photo recap overlays |

---

## 07 · Dual-Track Bilingual (`DE + ID`) Voice & Copy Rules

### 7.1 The Dual-Track Principle
Every public asset speaks clearly to two overlapping audiences without cluttering either language:
1. **Primary Structural / Civic Track — German (`DE`):**
   - Used for top-level kicker labels, program names, legal/banking notices, dates/venues, and Swiss school/authority templates.
   - *Tone:* Clear, respectful, precise, Swiss civic standards (*Schweizer Hochdeutsch* with `ss`).
2. **Warm Community / Guidance Track — Bahasa Indonesia (`ID`):**
   - Used for warm subtitles, community invitations, Islamic explanations, potluck/silaturahmi notes, and practical family nuances.
   - *Tone:* Warm, inclusive (*kekeluargaan*), encouraging, grounded in Al-Qur'an & Sunnah without preachiness.

### 7.2 Layout Pairing Patterns
- **Pattern A (Stacked Headline):**
  - `DE` Kicker (`JetBrains Mono`, `Bold`, 11–13pt, `#8C5327` Teak or `#1D5B8C` Cobalt): `VEREIN PERCIKAN IMAN · MONATLICHE TA'LIM`
  - `DE` Display Title (`Plus Jakarta Sans`, `ExtraBold`, 36–56pt, `-0.025em` tracking, `#132435`): *Back to Qur'an — Sura Al-Baqara*
  - `ID` Subtitle (`Plus Jakarta Sans`, `Regular`/`Medium`, 18–22pt, `#4A5E72`): *Kajian Bulanan & Silaturahmi Keluarga Muslim Indonesia di Swiss*
- **Pattern B (Asymmetric Split for Manuals & Slides):** Left zone `DE` (Structural/Legal) on `#F4F2ED`, Right zone `ID` (Community Context & Practical Tips) on `#DFE8F0` or `#FAF9F6`, separated by a `1px` `#D5CFC4` hairline or vertical Kawung-Facet Divider.
- **Pattern C (No Mid-Sentence Macaronic Mixing):** Keep each clause cleanly in either `DE` or `ID` (except established proper program names like *Monatliches Pengajian*, *Familienlager VPI*, or Islamic terms like *Ta'lim*, *Zakat*, *Infaq*).

---

## 08 · Instagram `@verein.pi` Grid Cadence & Makeover (Figma Master)

All social templates live natively inside the editable Figma Master file ([`figma-manifest.md`](./figma-manifest.md), `tJA2fcaYcckLkwHmRGYvf9`) with Auto-Layout text layers and reusable Motif components—replacing all earlier external slide/template tools.

### 8.1 Profile Header & Bio Standard
- **Avatar:** `emblem-avatar-ig.svg` (`1080×1080` Limestone Greige `#EAE6DF` + Crisp Ivory `#FAF9F6` circle, `#D5CFC4` hairline ring, generous breathing room so IG circular crop never touches the flame).
- **Bio Structure (Plain clean UTF-8, NO fake Unicode italic fonts):**
  - Line 1 (Civic Identity): `Verein Percikan Iman Schweiz (Art. 60–79 ZGB)`
  - Line 2 (Bilingual Mission): `Kajian, Pendidikan Al-Qur'an & Keluarga Muslim 🇨🇭🇮🇩`
  - Line 3 (Presence & Location): `Zürich · Baar · Stadel · St. Gallen · Online`
  - Line 4 (CTA): `Wegweiser, Program & Spenden 👇 percikaniman.ch`
- **5 Unified Highlight Covers (`1080×1920`, Greige / Ice-Mist / Cobalt / Slate-Blue / Teak):**
  `Ta'lim` · `Kids` · `Muslimah` · `Events` · `Spenden`

### 8.2 Cohesive 3×3 Feed Grid Architecture (`1080×1350`, `4:5` Portrait)
Maintain an alternating **Limestone Greige / Warm Stone (`#EAE6DF` / `#F4F2ED`) ↔ Deep Slate-Blue / Cobalt Photo Recap (`#132435` / `#1D5B8C`) ↔ Roasted Teak & Ice-Blue Mist (`#8C5327` / `#DFE8F0`)** rhythm across the 3-column grid:

| Slot | Content Archetype | Surface & Visual Signature |
| :--- | :--- | :--- |
| **1 (Top-L)** | **Monatliche Ta'lim Flyer** | `#EAE6DF` Swiss hairline grid, `#1D5B8C` Cobalt speaker frame, Zürich/Volketswil metadata block |
| **2 (Top-C)** | **Event Photo Recap (PPI-style)** | Event photo + `#132435`/`#1D5B8C` bottom gradient overlay, top-left `VEREIN PERCIKAN IMAN · SCHWEIZ` micro-wordmark |
| **3 (Top-R)** | **Editorial Qur'an / Hadith Quote** | `#FAF9F6` Crisp Ivory card, `Plus Jakarta Sans` Italic/Bold quote, Kawung-Facet divider + `#8C5327` Teak accent |
| **4 (Mid-L)** | **Pengajian Anak / Kinder-Koranunterricht** | `#DFE8F0` Ice-Blue Mist + `#F4F2ED` Warm Stone schedule block (Wed & Sat Zoom, Sr. Sri/Susan/Atik) |
| **5 (Mid-C)** | **Percikan Wegweiser Launch** | `#132435` Deep Slate-Blue hero cover with Roasted Teak `#8C5327` Wegweiser signpost & chapter index `01–06` |
| **6 (Mid-R)** | **Muslimah Offline / Tahsin Poster** | `#EAE6DF` Limestone Greige + `#8C5327` Roasted Teak & `#F3E8DF` Teak Sand structural frame |
| **7 (Bot-L)** | **Ramadan / Eid Holiday Greeting** | `#132435` Deep Slate-Blue + `#8C5327` Teak kawung-facet ornament + `#9CC4E4` Powder Sky accents |
| **8 (Bot-C)** | **Familienlager Recap Carousel Cover** | Photo with `Motif / Corner Stamp` `+` crosshairs + `10.–11. OKTOBER · LÖRRACH` Mono signpost |
| **9 (Bot-R)** | **Swiss QR-Rechnung & TWINT Donation Card** | `#132435` / `#F4F2ED` split with pure `#FFFFFF` SIX QR frame showing `CH89 0900 0000 6049 6610 7` & `UID CHE-382.914.820` |

---

## 09 · Swiss QR-Rechnung & TWINT Donation Standards

1. **Mandatory Creditor Block on All Donation Graphics:**
   - `Verein Percikan Iman, 8000 Zürich, Schweiz`
   - `UID CHE-382.914.820`
   - `PostFinance IBAN: CH89 0900 0000 6049 6610 7`
2. **Swiss QR-Rechnung Compliance (SIX Standard):**
   - QR code MUST be pure **black (`#000000`) on pure white (`#FFFFFF`)** with the official centered Swiss Cross (`7×7mm` proportion) and generous quiet zone. This is the **only** element in the entire brand system permitted to use `#FFFFFF` instead of `#FAF9F6`. Never tint QR modules Cobalt or Teak, as banking apps may fail to scan!
3. **TWINT Card Compliance:**
   - Always label the target project clearly (`INFAQ`, `ZAKAT-FITRAH`, `ZAKAT-MAAL`, `QURBAN`, `SHARING-CARING`, `FAMILIENLAGER`, `TRAUERFALL`) and direct donors to verify the recipient name `Verein Percikan Iman` before confirming in the TWINT app.
4. **Tax-Deductibility Honesty:** Never advertise "tax-deductible everywhere in Switzerland" indiscriminately; state accurately that donations follow Swiss Verein transparency under Art. 60–79 ZGB and tax deductibility depends on cantonal *Steuerbefreiung* rules for the relevant tax year.

---

## 10 · Volunteer "3-Minute Figma Flyer" Guardrails

Designed so any volunteer in Zürich, Baar, Stadel, or St. Gallen can duplicate an Auto-Layout template in our master Figma file and export a dignified, on-brand flyer in under 3 minutes without breaking visual consistency:

### 10.1 Exact Structural Specifications (`1080×1350` IG `4:5`)
- **Outer Safe Margin:** Minimum **`64px`** on all four sides (never place text or logos closer than `64px` to the edge).
- **Header Micro-Wordmark:** Top-left `VEREIN PERCIKAN IMAN · SCHWEIZ` (`JetBrains Mono` Bold, `18–22px`, uppercase, tracking `+0.08em`) + `Motif / Corner Stamp` in outer corners.
- **Strictly 2 Fonts · Max 3 Scale Levels per Card:**
  1. Metadata / Kicker (`JetBrains Mono` Bold/Regular, `20–24px`)
  2. Headline (`Plus Jakarta Sans` ExtraBold/Bold, `52–68px` DE, `-0.025em` tracking)
  3. Subtitle + Venue/Time Body (`Plus Jakarta Sans` Medium/Regular, `24–30px` ID/DE)
- **Max 2 Accents + Ground:** Use `#EAE6DF` (Limestone Greige) or `#132435` (Slate-Blue Ink) as ground + **Percikan Cobalt `#1D5B8C`** and/or **Roasted Teak `#8C5327`** pop (never add external clip-art stickers, serifs, or green accents).

### 10.2 Visual Do vs. Don't Matrix
| Rule Area | DO (v2 Swiss Civic Atelier) | DON'T (Off-Brand / Volunteer Drift) |
| :--- | :--- | :--- |
| **Palette** | Limestone Greige `#EAE6DF` / Slate-Blue Ink `#132435` + Cobalt `#1D5B8C` & Roasted Teak `#8C5327` | Green hues, pastel purple, neon orange, hot pink, or rainbow gradients |
| **Typography** | Strictly `Plus Jakarta Sans` + `JetBrains Mono` (max 3 scale sizes) | Any serif fonts, handwritten brush scripts, Comic fonts, 5+ conflicting sizes |
| **Layout** | `64px` safe zone, `1px` `#D5CFC4` hairline boxes, left-aligned Swiss hierarchy | Centered wall-of-text touching flyer edges, overlapping clip-art stickers |
| **Photo Overlays** | Bottom gradient `#132435` / `#1D5B8C` with crisp `#FAF9F6` text | Raw white text directly over bright/busy photo faces |
| **Legal / Donation** | Exact `CH89 0900 0000 6049 6610 7` & `UID CHE-382.914.820` + `#FFFFFF` SIX QR box | Unverified personal IBANs, tinted QR codes, or vague "send to DM" payment text |

### 10.3 The 3-Step Pre-Publish Volunteer Workflow (Duplicate → Edit → Export)
1. **Duplicate (`15 sec`):** Open `04 · Editable IG Templates & 3x3 Grid` in the master Figma file (`tJA2fcaYcckLkwHmRGYvf9`), duplicate the matching Auto-Layout card (`Ta'lim`, `Kids`, `Muslimah`, `Recap`, or `Donation`).
2. **Edit Text & Check Margins (`2 min`):** Replace `DE` headline, `ID` subtitle, exact date (`DD.MM.YYYY`), time (`CET`), and venue address (*Iman Zentrum, Juchstrasse 15, 8604 Volketswil*); verify `64px` safe margins, `Plus Jakarta Sans` + `JetBrains Mono` integrity, and `CH89 0900 0000 6049 6610 7` / `UID CHE-382.914.820` if collecting funds.
3. **Export (`30 sec`):** Export selected frame at **`2× PNG`** (for Instagram `2160×2700` crispness) or **`PDF`** (for Volketswil/Baar print handouts).

---

## 11 · Companion Brand & Publication Ecosystem

- **Master Design System & IG Templates (Figma Design):** [`figma-manifest.md`](./figma-manifest.md)
- **Percikan Wegweiser Handbook (Markdown Source):** [`percikan-wegweiser-handbook.md`](./percikan-wegweiser-handbook.md)
- **Percikan Wegweiser 10-Slide Deck (Figma Slides):** [`wegweiser-slides-manifest.md`](./wegweiser-slides-manifest.md)
- **Live Web Showcase (`/brand`):** `src/components/BrandStyleguideView.tsx` & `public/brand/` (11 C2PA-free SVGs)
