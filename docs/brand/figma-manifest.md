# Verein Percikan Iman Schweiz — Master Brand System & IG Grid Manifest (v2)

> **Status:** Complete · All 5 v2 Master Brand System pages on File A (`tJA2fcaYcckLkwHmRGYvf9`) were built cleanly via Figma Plugin API (`use_figma`) and visually QA'd (`get_screenshot`) with zero overlaps, zero clipping, and zero broken font fallbacks.

---

## 01 · Figma File Metadata & v2 Design Direction

| Field | Value |
| :--- | :--- |
| **Figma File URL** | [https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9) |
| **File Key (`fileKey`)** | `tJA2fcaYcckLkwHmRGYvf9` |
| **Workspace / Folder** | ETH Education · Folder `694480215` (`verein percikan iman`) |
| **Page Architecture** | 5 Dedicated Named Figma Pages (`01`–`05`) built from modular `use_figma` scripts [`docs/brand/figma-scripts/v2-01`..`v2-05`](./figma-scripts/) |
| **Aesthetic Direction** | **Swiss Civic Atelier × Archipelago Nusantara (v2):** Limestone Greige & Warm Stone grounds (`#EAE6DF`, `#F4F2ED`, `#FAF9F6`, `#E1DDD4`, `#D5CFC4`, `#B8B0A2`) + Percikan Cobalt & Slate-Blue structure (`#132435`, `#4A5E72`, `#1D5B8C`, `#15466E`, `#5B7E9E`, `#DFE8F0`, `#9CC4E4`) + Roasted Teak warm pop (`#8C5327`, `#6F401D`, `#F3E8DF`). Pure `#FFFFFF` reserved strictly for the SIX QR-Rechnung quiet zone and reverse white logo marks. |
| **Typography Stack** | Strictly **2 non-serif font families:** `Plus Jakarta Sans` (`Regular`, `Medium`, `SemiBold`, `Bold`, `ExtraBold`, `Italic`) + `JetBrains Mono` (`Regular`, `Medium`, `Bold`, `ExtraBold`). Zero serif/script fonts. |
| **Language & Spelling** | Dual-Track Bilingual (`DE + ID`): structural civic headlines in German (`DE`), warm community copy in Bahasa Indonesia (`ID`); Schweizer Hochdeutsch (`ss` only, no sz-ligature). |

---

## 02 · Figma Pages, Variables & Board Directory

| # | Figma Page | `pageId` | Board `nodeId` | Clickable Figma Node URL | Script Source | Visual QA Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | `01 · Foundations & Variables` | `0:1` | `3:42` | [Open Page 01 (`3:42`)](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=3-42) | [`v2-01-foundations.js`](./figma-scripts/v2-01-foundations.js) | `steps/390/media_0.png` (PASS) |
| **02** | `02 · Modular Motif Library` | `3:2` | `6:3` | [Open Page 02 (`6:3`)](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=6-3) | [`v2-02-motif-library.js`](./figma-scripts/v2-02-motif-library.js) | `steps/391/media_0.png` (PASS) |
| **03** | `03 · Logo & Avatar System` | `3:3` | `7:3` | [Open Page 03 (`7:3`)](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=7-3) | [`v2-03-logos.js`](./figma-scripts/v2-03-logos.js) | `steps/392/media_0.png` (PASS) |
| **04** | `04 · Editable IG Templates & 3×3 Grid` | `3:4` | `9:3` | [Open Page 04 (`9:3`)](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=9-3) | [`v2-04-ig-templates.js`](./figma-scripts/v2-04-ig-templates.js) | `steps/393,395,423–426/media_0.png` (PASS) |
| **05** | `05 · Volunteer 3-Min Guardrail` | `3:5` | `11:3` | [Open Page 05 (`11:3`)](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=11-3) | [`v2-05-guardrails.js`](./figma-scripts/v2-05-guardrails.js) | `steps/447/media_0.png` (PASS) |

### Figma Variable Collections & Text Styles (`01 · Foundations & Variables`)
- **`Percikan Iman v2 — Greige, Blue & Teak`** (`VariableCollectionId:3:7`):
  - **16 `COLOR` variables** with explicit `scopes` and `WEB` CSS `codeSyntax`: `canvas/limestone-greige` (`#EAE6DF`), `surface/warm-stone` (`#F4F2ED`), `surface/crisp-ivory` (`#FAF9F6`), `surface/recessed-greige` (`#E1DDD4`), `border/pebble` (`#D5CFC4`), `border/stone-strong` (`#B8B0A2`), `ink/slate-blue` (`#132435`), `ink/steel-muted` (`#4A5E72`), `brand/percikan-cobalt` (`#1D5B8C`), `brand/cobalt-hover` (`#15466E`), `brand/steel-undertone` (`#5B7E9E`), `brand/ice-mist` (`#DFE8F0`), `brand/powder-sky` (`#9CC4E4`), `pop/roasted-teak` (`#8C5327`), `pop/teak-deep` (`#6F401D`), `pop/teak-sand` (`#F3E8DF`).
  - **4 `FLOAT` variables**: `space/flyer-safe-zone` (`64`), `space/card-padding` (`24`), `radius/swiss-card` (`12`), `radius/pill` (`999`).
- **`Card Theme`** (`VariableCollectionId:3:28`):
  - **3 Modes:** `Limestone Greige` · `Ice-Blue Mist` · `Deep Slate-Blue` aliasing `theme/bg`, `theme/card`, `theme/text-primary`, `theme/text-muted`, `theme/accent`, `theme/pop`, and `theme/border`.
- **6 Local Text Styles (`Plus Jakarta Sans` + `JetBrains Mono`):**
  - `Display/Hero Jakarta` (`48px`), `Display/Section Jakarta` (`32px`), `UI/Headline Jakarta` (`22px`), `UI/Body Jakarta` (`16px`), `Mono/Micro Kicker` (`12px`), `Mono/Legal Tabular` (`13px`).

### Reusable Modular Motif Components (`02 · Modular Motif Library`)
Derived from the *"Anatomy of the Spark"* breakdown (`8-Point Facet Diamond`, `1px Architectural Grid`, `+ Crosshair Anchor`, `Alpine Contour Arc`):

| Component Name | `nodeId` | Direct Figma URL | Usage |
| :--- | :--- | :--- | :--- |
| `Motif / Corner Stamp` | `6:67` | [Open `6:67`](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=6-67) | Top-left/right structural flyer corner mark |
| `Motif / Kawung-Facet Divider` | `6:76` | [Open `6:76`](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=6-76) | Section divider for Eid greetings, Wegweiser & quotes |
| `Motif / Topographic Ribbon` | `6:88` | [Open `6:88`](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=6-88) | Horizontal Swiss Alpine contour band |
| `Motif / Teak Signpost Badge` | `6:98` | [Open `6:98`](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=6-98) | Roasted Teak (`#8C5327`) signpost & program callout |
| `Motif / Spark Program Seal` | `6:104` | [Open `6:104`](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=6-104) | Circular civic verification seal for handbooks & recaps |

Board `6:3` also documents **3 1:1 undistorted seamless pattern editions**: `Limestone Greige (#EAE6DF)`, `Ice-Blue Mist (#DFE8F0)`, and `Deep Slate-Blue × Roasted Teak (#132435 + #8C5327)`.

---

## 03 · Logo, IG Templates & Guardrail Node Inventory

### `03 · Logo & Avatar System` (`nodeId: 7:3`)
- Preserves the authentic faceted diamond teardrop-flame + crescent paths from [`public/logo.svg`](../../public/logo.svg) across 5 v2 lockup variants:
  1. **Primary Cobalt Full-Color** on `#EAE6DF` (`#1D5B8C` / `#5B7E9E` flame + `#132435` Slate-Blue Ink wordmark)
  2. **Monochrome Slate-Blue Ink** (`#132435` flat silhouette on `#FAF9F6`)
  3. **Reverse White** on `#132435` & `#1D5B8C` dark stages (`#FFFFFF` + `#9CC4E4` facets)
  4. **Cobalt & Roasted Teak Duotone** (`#1D5B8C` upper facets + `#8C5327` crescent wings + `#132435` wordmark)
  5. **`1080×1080` IG Avatar Frame** (`avatarFrameId: 7:294`, [Open `7:294`](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=7-294)) on Limestone Greige / Crisp Ivory with `1×` cap-height `"V"` clearspace & minimum-size specs (`120px / 32mm` horizontal, `24px / 8mm` emblem).

### `04 · Editable IG Templates & 3×3 Grid` (`nodeId: 9:3`)
- **`@verein.pi` Profile Header Makeover** (`profileCardId: 9:17`, [Open `9:17`](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=9-17)): Clean UTF-8 `DE + ID` bio + 5 Highlight Covers (`Ta'lim`, `Kids`, `Muslimah`, `Events`, `Spenden`) + 3×3 chromatic cadence matrix.
- **Link-in-Bio Mobile Hub (`1080×1920`)** (`hubId: 9:127`, [Open `9:127`](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=9-127)): 6 editable Auto-Layout action cards routing to *Percikan Wegweiser*, *Monatliche Ta'lim*, *Pengajian Anak*, *Muslimah Offline*, *Familienlager*, and *Spenden (PostFinance / TWINT)*.
- **3×3 Launch Grid (`feedGridId: 9:212`, [Open `9:212`](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=9-212)) — 9× `1080×1350` Editable Auto-Layout Templates:**
  1. **Post 01 (`9:216`):** Monatliche Ta'lim Flyer (Warm Stone `#F4F2ED`, Iman Zentrum Volketswil) — [Open](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=9-216)
  2. **Post 02 (`9:281`):** Event Photo Recap (Cobalt `#1D5B8C` -> Deep Slate-Blue `#132435` bottom gradient + drop-photo slot) — [Open](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=9-281)
  3. **Post 03 (`9:334`):** Editorial Qur'an Quote (`Sure Al-Baqarah 2:286`, Ice-Blue Mist `#DFE8F0`, `Plus Jakarta Sans Bold/Italic`) — [Open](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=9-334)
  4. **Post 04 (`9:387`):** Kinder-Koranunterricht & Pengajian Anak (Crisp Ivory `#FAF9F6`, Gruppe A 5–8 / Gruppe B 9–13) — [Open](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=9-387)
  5. **Post 05 (`9:445`):** *Percikan Wegweiser* Guidebook Launch (Limestone Greige `#EAE6DF`, Cobalt cover + Roasted Teak CTA) — [Open](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=9-445)
  6. **Post 06 (`9:526`):** Muslimah Offline Gathering (Warm Stone `#F4F2ED` + Roasted Teak `#8C5327` / `#F3E8DF`, Sr. Sri / Sr. Susan / Sr. Atik) — [Open](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=9-526)
  7. **Post 07 (`9:582`):** Ramadan & Eid Al-Fitr Greeting (Deep Slate-Blue `#132435` + Roasted Teak kawung motif band) — [Open](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=9-582)
  8. **Post 08 (`9:639`):** Familienlager Recap Carousel Cover (`10.–11. OKTOBER · LÖRRACH / DREILÄNDERECK`, Alpine peaks + Cobalt/Slate gradient) — [Open](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=9-639)
  9. **Post 09 (`9:692`):** Swiss QR-Rechnung & TWINT Donation Card (Deep Slate-Blue `#132435` + pure `#FFFFFF` SIX Swiss QR quiet zone, `CH89 0900 0000 6049 6610 7`, `UID CHE-382.914.820`) — [Open](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=9-692)

### `05 · Volunteer 3-Min Guardrail` (`nodeId: 11:3`)
- **Side-by-Side Comparison:** DON'T flyer (`dontFlyerId: 11:24`, [Open `11:24`](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=11-24)) vs. DO Swiss Civic Atelier flyer (`doFlyerId: 11:43`, [Open `11:43`](https://www.figma.com/design/tJA2fcaYcckLkwHmRGYvf9?node-id=11-43)).
- **Safe-Zone & Hierarchy Rules:** `64px` margin inset (`952×1222` live box inside `1080×1350`), 60/30/10 ratio (`60%` Greige grounds / `30%` Cobalt & Slate-Blue / `10%` Roasted Teak pop), strictly 2 font families (`Plus Jakarta Sans` + `JetBrains Mono`), and the 3-step Figma duplicate-edit-export (`PNG @2x`) workflow.

---

## 04 · Locked Legal & Banking Verification Block

- **Official Name:** `Verein "Percikan Iman"` / `Verein Percikan Iman Schweiz`
- **Legal Form:** `Schweizer Verein gemäss Art. 60–79 ZGB`
- **Seat:** `8000 Zürich, Schweiz`
- **UID:** `CHE-382.914.820`
- **Email / Social:** `info@percikaniman.ch` · `@verein.pi`
- **Bank / IBAN:** `PostFinance` · `CH89 0900 0000 6049 6610 7`
