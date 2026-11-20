// slides-batch-2.js — Verein Percikan Iman Schweiz · PERCIKAN WEGWEISER (v2.0)
// Target: Figma Slides fileKey `OOd4uCcNzxHftyjXjd1EoE` (`https://www.figma.com/slides/OOd4uCcNzxHftyjXjd1EoE`)
// Builds Slides 5–7 (Ch 03 Gebet/Moscheen/Ramadan, Ch 04 Schweizer Schule/Familie, Ch 05 Zakat/Steuern/IBAN)
// Skill: `figma-use-slides` (appendChild BEFORE x/y/resize on every node at every nesting level)

const SLIDE_W = 1920;
const SLIDE_H = 1080;

// ── Locked v2 Palette (Limestone Greige · Cobalt & Steel Blue · Roasted Teak Pop) ──
const C = {
  greige:      "#EAE6DF",
  stone:       "#F4F2ED",
  ivory:       "#FAF9F6",
  white:       "#FFFFFF", // ONLY for SIX Swiss QR quiet zone & reverse SVG marks
  recessed:    "#E1DDD4",
  pebble:      "#D5CFC4",
  strongStone: "#B8B0A2",
  ink:         "#132435",
  inkPanel:    "#192E44",
  inkCard:     "#1E354D",
  steelMuted:  "#4A5E72",
  cobalt:      "#1D5B8C",
  cobaltHover: "#15466E",
  steel:       "#5B7E9E",
  iceMist:     "#DFE8F0",
  powderSky:   "#9CC4E4", // ONLY on #132435 or #1D5B8C dark grounds
  teak:        "#8C5327",
  teakDeep:    "#6F401D",
  teakSand:    "#F3E8DF",
  black:       "#000000",
};

const hex = (h) => ({
  r: parseInt(h.slice(1, 3), 16) / 255,
  g: parseInt(h.slice(3, 5), 16) / 255,
  b: parseInt(h.slice(5, 7), 16) / 255,
});
const solid = (h, opacity = 1) =>
  opacity < 1 ? [{ type: "SOLID", color: hex(h), opacity }] : [{ type: "SOLID", color: hex(h) }];

// ── Exact Verified Figma Font Styles (Strictly 2 Non-Serif Fonts) ─────────────
const F = {
  sansReg:   { family: "Plus Jakarta Sans", style: "Regular" },
  sansMed:   { family: "Plus Jakarta Sans", style: "Medium" },
  sansSemi:  { family: "Plus Jakarta Sans", style: "SemiBold" },
  sansBold:  { family: "Plus Jakarta Sans", style: "Bold" },
  sansExtra: { family: "Plus Jakarta Sans", style: "ExtraBold" },
  sansItal:  { family: "Plus Jakarta Sans", style: "Italic" },
  monoReg:   { family: "JetBrains Mono", style: "Regular" },
  monoMed:   { family: "JetBrains Mono", style: "Medium" },
  monoBold:  { family: "JetBrains Mono", style: "Bold" },
  monoExtra: { family: "JetBrains Mono", style: "ExtraBold" },
};

// Fonts loaded right after first slide of batch is ensured

const createdNodeIds = [];
const track = (n) => {
  createdNodeIds.push(n.id);
  return n;
};

// ── Slide-Safe Creation Helpers (ALWAYS appendChild BEFORE resize/fills/x/y) ───
function addFrame(parent, x, y, w, h, fill, opts = {}) {
  const f = track(figma.createFrame());
  parent.appendChild(f);
  f.resize(w, h);
  f.fills = fill ? solid(fill, opts.fillOpacity ?? 1) : [];
  if (opts.border) {
    f.strokes = solid(opts.border, opts.borderOpacity ?? 1);
    f.strokeWeight = opts.bw ?? 1;
    f.strokeAlign = "INSIDE";
  }
  if (opts.radius !== undefined) f.cornerRadius = opts.radius;
  if (opts.clip !== undefined) f.clipsContent = opts.clip;
  if (opts.name) f.name = opts.name;
  f.x = x;
  f.y = y;
  return f;
}

function addRect(parent, x, y, w, h, fill, opts = {}) {
  const r = track(figma.createRectangle());
  parent.appendChild(r);
  r.resize(w, h);
  r.fills = fill ? solid(fill, opts.opacity ?? 1) : [];
  if (opts.border) {
    r.strokes = solid(opts.border);
    r.strokeWeight = opts.bw ?? 1;
    r.strokeAlign = "INSIDE";
  }
  if (opts.radius !== undefined) r.cornerRadius = opts.radius;
  if (opts.name) r.name = opts.name;
  r.x = x;
  r.y = y;
  return r;
}

function addText(parent, font, size, color, chars, x, y, w, h, opts = {}) {
  const t = track(figma.createText());
  parent.appendChild(t);
  t.fontName = font;
  t.fontSize = size;
  if (opts.lh) t.lineHeight = typeof opts.lh === "number" ? { value: opts.lh, unit: "PIXELS" } : opts.lh;
  if (opts.ls !== undefined) t.letterSpacing = typeof opts.ls === "number" ? { value: opts.ls, unit: "PERCENT" } : opts.ls;
  if (opts.upper) t.textCase = "UPPER";
  if (opts.align) t.textAlignHorizontal = opts.align;
  t.fills = solid(color, opts.opacity ?? 1);
  t.characters = String(chars);
  if (w !== undefined) {
    t.resize(w, h ?? 40);
    t.textAutoResize = opts.fixedH ? "NONE" : "HEIGHT";
  } else {
    t.textAutoResize = "WIDTH_AND_HEIGHT";
  }
  if (opts.name) t.name = opts.name;
  t.x = x;
  t.y = y;
  return t;
}

function addSvg(parent, svgStr, x, y, w, h, name) {
  const node = track(figma.createNodeFromSvg(svgStr));
  parent.appendChild(node);
  if (name) node.name = name;
  if (w !== undefined && h !== undefined) node.resize(w, h);
  node.x = x;
  node.y = y;
  return node;
}

function buildCornerStampSvg(crossColor = C.strongStone, arcColor = C.steel, dotColor = C.teak, size = 32) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2V22M2 12H22" stroke="${crossColor}" stroke-width="1.5"/><path d="M22 12C22 17.52 17.52 22 12 22" stroke="${arcColor}" stroke-width="1.5"/><circle cx="12" cy="12" r="2.8" fill="${dotColor}"/></svg>`;
}

function buildKawungDividerSvg(w = 960, h = 24, dark = false) {
  const lineCol = dark ? C.steel : C.pebble;
  const motifCol = dark ? C.powderSky : C.cobalt;
  const step = 120;
  const count = Math.floor(w / step);
  const midX = Math.floor(count / 2);
  let items = `<line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke="${lineCol}" stroke-width="1"/>`;
  for (let i = 0; i <= count; i++) {
    const cx = Math.min(w - 12, Math.max(12, i * step));
    const col = i === midX ? C.teak : motifCol;
    items += `<path d="M${cx} ${h / 2 - 7}L${cx + 7} ${h / 2}L${cx} ${h / 2 + 7}L${cx - 7} ${h / 2}Z" fill="${col}"/>`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">${items}</svg>`;
}

function buildTopoRibbonSvg(w = 680, h = 114, dark = true) {
  const s1 = dark ? C.powderSky : C.steel;
  const s2 = dark ? C.ivory : C.cobalt;
  const step = Math.round(h * 0.14);
  const paths = [0, step, step * 2, step * 3].map((dy, idx) => {
    const col = idx === 1 ? s2 : s1;
    const op = idx === 1 ? "0.75" : "0.4";
    return `<path d="M0 ${Math.round(h * 0.34) + dy} C ${w * 0.3} ${Math.round(h * 0.08) + dy}, ${w * 0.62} ${Math.round(h * 0.52) + dy}, ${w} ${Math.round(h * 0.14) + dy}" stroke="${col}" stroke-opacity="${op}" stroke-width="1.5" fill="none"/>`;
  }).join("");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">${paths}<circle cx="${w * 0.62}" cy="${Math.round(h * 0.52) + step}" r="4.5" fill="${C.teak}"/></svg>`;
}

function addSignpostBadge(parent, x, y, text, opts = {}) {
  const h = opts.h ?? 36;
  const w = Math.max(opts.w ?? 0, 180, Math.round(text.length * 10.6) + 64);
  const bg = opts.bg ?? C.teak;
  const txtCol = opts.color ?? C.ivory;
  const wrap = addFrame(parent, x, y, w, h, null, { name: `Signpost · ${text}` });
  const bodyW = w - 18;
  addRect(wrap, 0, 0, bodyW, h, bg, { radius: 4, name: "Signpost Body" });
  const tipSvg = `<svg width="20" height="${h}" viewBox="0 0 20 ${h}" xmlns="http://www.w3.org/2000/svg"><path d="M0 0L20 ${h / 2}L0 ${h}Z" fill="${bg}"/></svg>`;
  addSvg(wrap, tipSvg, bodyW - 2, 0, 20, h, "Signpost Pointer");
  addText(wrap, F.monoBold, opts.fontSize ?? 13, txtCol, text, 16, Math.round((h - 18) / 2), bodyW - 22, 20, {
    ls: 7,
    upper: true,
    name: "Signpost Label",
  });
  return wrap;
}

function addSlideHeader(slide, badgeText, titleDe, titleId, rightTag, opts = {}) {
  const bg = opts.bg ?? C.greige;
  const h = opts.h ?? 164;
  const w = opts.w ?? SLIDE_W;
  const hdr = addFrame(slide, 0, 0, w, h, bg, { border: opts.border ?? C.pebble, bw: 1, name: "Slide Header" });
  addSvg(hdr, buildCornerStampSvg(C.strongStone, C.steel, C.teak, 32), 28, 22, 32, 32, "Corner Stamp TL");
  if (w === SLIDE_W) {
    addSvg(hdr, buildCornerStampSvg(C.strongStone, C.steel, C.teak, 32), w - 60, 22, 32, 32, "Corner Stamp TR");
  }
  addText(hdr, F.monoBold, 14, C.cobalt, "VEREIN PERCIKAN IMAN · SCHWEIZ", 80, 28, 440, 22, { ls: 8, upper: true });
  addText(hdr, F.monoReg, 14, C.steelMuted, rightTag, w - 580, 28, 500, 22, { ls: 6, upper: true, align: "RIGHT" });
  addSignpostBadge(hdr, 80, 62, badgeText, { w: opts.badgeW ?? 340, h: 34, fontSize: 13 });
  if (w === SLIDE_W) {
    addText(hdr, F.sansExtra, 42, C.ink, titleDe, 80, 104, 980, 52, { lh: 50, ls: -2 });
    addText(hdr, F.sansMed, 20, C.steelMuted, titleId, 1080, 114, 760, 36, { lh: 28, align: "RIGHT" });
  } else {
    addText(hdr, F.sansExtra, 40, C.ink, titleDe, 80, 104, w - 120, 50, { lh: 46, ls: -2 });
  }
  return hdr;
}

function addSlideFooter(slide, pageLabel, chapterTag, opts = {}) {
  const w = opts.w ?? SLIDE_W;
  const bg = opts.bg ?? C.greige;
  const ftr = addFrame(slide, 0, 1004, w, 76, bg, { name: "Slide Footer" });
  const divW = w - 160;
  addSvg(ftr, buildKawungDividerSvg(divW, 20, false), 80, 4, divW, 20, "Footer Kawung Divider");
  addText(
    ftr,
    F.monoReg,
    13,
    C.steelMuted,
    w === SLIDE_W
      ? "VEREIN «PERCIKAN IMAN» · ART. 60–79 ZGB · 8000 ZÜRICH · UID CHE-382.914.820 · POSTFINANCE CH89 0900 0000 6049 6610 7"
      : "VEREIN «PERCIKAN IMAN» · 8000 ZÜRICH · UID CHE-382.914.820",
    80,
    34,
    w === SLIDE_W ? 1260 : 660,
    22,
    { ls: 4 }
  );
  addText(ftr, F.monoBold, 13, C.teak, `${chapterTag}  ·  ${pageLabel}`, w - 420, 34, 340, 22, {
    ls: 6,
    align: "RIGHT",
    upper: true,
  });
  return ftr;
}

function findSlideByName(name) {
  const grid = figma.getSlideGrid();
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c].name === name) return grid[r][c];
    }
  }
  return null;
}

function ensureSlide(slideName) {
  let slide = findSlideByName(slideName);
  if (slide) {
    for (const ch of [...slide.children]) ch.remove();
  } else {
    const grid = figma.getSlideGrid();
    if (
      grid.length === 1 &&
      grid[0].length === 1 &&
      grid[0][0].children.length === 0 &&
      (!grid[0][0].name || grid[0][0].name === "Slide 1")
    ) {
      slide = grid[0][0];
    } else {
      slide = figma.createSlide();
    }
  }
  slide.name = slideName;
  try {
    slide.clipsContent = true;
  } catch (e) {}
  return slide;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 05 · 03 GEBET, MOSCHEEN & RAMADAN (Ice-Mist Main + Full Cobalt Tower)
// ═══════════════════════════════════════════════════════════════════════════════
const s5 = ensureSlide("05 · 03 Gebet, Moscheen & Ramadan");
const probe = figma.createText();
s5.appendChild(probe);
const initFont = probe.fontName;
probe.remove();
const fontsToLoad = [...Object.values(F)];
if (initFont && typeof initFont === "object" && initFont.family && initFont.style) {
  fontsToLoad.unshift(initFont);
}
await Promise.all(fontsToLoad.map((font) => figma.loadFontAsync(font)));
s5.fills = solid(C.iceMist);

// Left Zone Header (w: 1240) + Footer (w: 1240) leaving x: 1240..1920 for full-bleed Cobalt Tower
addSlideHeader(
  s5,
  "KAPITEL 03 · SPIRITUELLE PRAXIS",
  "Gebet, Moscheen & Ramadan",
  "",
  "IBADAH & ETIKA MASJID · 47° N",
  { w: 1240, bg: C.iceMist, border: C.steel, badgeW: 360 }
);

// Left Top Horizontal Block: Schweizer Hinterhofmoscheen Etikette
const s5Etikette = addFrame(s5, 80, 184, 1120, 366, C.stone, { border: C.strongStone, bw: 1, radius: 12, name: "Ch03 Etikette Block" });
addText(s5Etikette, F.monoBold, 14, C.cobalt, "3.2 ETIKETTE IN SCHWEIZER «HINTERHOFMOSCHEEN» · GELEBTES IHSAN", 28, 22, 1064, 22, { ls: 5 });
addText(s5Etikette, F.sansExtra, 26, C.ink, "Rücksichtnahme sichert langfristig unsere Gebetsräume", 28, 48, 1064, 34, { ls: -1 });

const etiketteCards = [
  {
    title: "1. Nacht- & Sonntagsruhe (22:00–06/07 Uhr)",
    body: "Bei Fajr, Isha & Tarawih draussen leise sprechen, Autotüren behutsam schliessen, keine Gespräche auf dem Trottoir.",
    bg: C.ivory,
  },
  {
    title: "2. Parkplatz-Disziplin",
    body: "Nie Nachbar-, Privat- oder Firmenparkplätze belegen! Bei Jumu'ah & Ta'lim SBB/Bus oder Fahrgemeinschaften nutzen.",
    bg: C.ivory,
  },
  {
    title: "3. Fluchtwege & Wudu-Nassräume",
    body: "Schuhe ordentlich ins Regal (Feuerpolizei: Treppenhäuser stets frei!). Nach Wudu Becken & Boden trocken hinterlassen.",
    bg: C.ivory,
  },
  {
    title: "4. Nachbarschaft & ID Dakwah bil-Hal",
    body: "«Grüezi» grüssen, Abfall trennen, vor Iftar/Eid informieren. Sikap tertib di sekitar masjid menjaga izin sewa jangka panjang.",
    bg: C.teakSand,
  },
];
etiketteCards.forEach((ec, idx) => {
  const col = idx % 2;
  const row = Math.floor(idx / 2);
  const card = addFrame(s5Etikette, 28 + col * 540, 96 + row * 124, 524, 112, ec.bg, {
    border: idx === 3 ? C.teak : C.pebble,
    bw: 1,
    radius: 8,
    name: `Etikette ${idx + 1}`,
  });
  addText(card, F.sansBold, 17, idx === 3 ? C.teakDeep : C.cobalt, ec.title, 18, 14, 488, 24);
  addText(card, F.sansReg, 15, C.ink, ec.body, 18, 42, 488, 58, { lh: 22 });
});

// Left Bottom Block: ~47° N Summer / Winter Daylight & Fasting Bars
const s5Astro = addFrame(s5, 80, 568, 1120, 416, C.ivory, { border: C.pebble, bw: 1, radius: 12, name: "Ch03 Daylight Bars" });
addText(s5Astro, F.monoBold, 14, C.teak, "3.3 HOHE BREITENGRADE (46°–47.8° N) · JADWAL SHALAT & PUASA", 28, 22, 1064, 22, { ls: 5 });
addText(s5Astro, F.sansExtra, 26, C.ink, "Extreme Tageslängen: Sommer ~18 Std. vs. Winter ~8.5 Std.", 28, 48, 1064, 34, { ls: -1 });

const seasons = [
  {
    label: "HOCHSOMMER (JUNI / JULI)",
    time: "05:25 → 21:25 · ~17–18+ Std. Fasten",
    barW: 640,
    barCol: C.teak,
    note: "Kurze Nacht & Shafaq-Übergang; lokalem VIOZ/FIDS-Plan folgen!",
  },
  {
    label: "TIEFER WINTER (DEZ. / JAN.)",
    time: "06:20 → 16:35 · ~8.5 Std. Fasten",
    barW: 310,
    barCol: C.cobalt,
    note: "Dhuhr ca. 12:25, Maghrib bereits 16:35 Uhr — sehr kurzer Wintertag.",
  },
  {
    label: "REFERENZ ÄQUATOR (INDONESIEN)",
    time: "Ganzjährig ~12 Std. Tag / ~12 Std. Nacht",
    barW: 440,
    barCol: C.steel,
    note: "Di Swiss jangan asal ganti metode hisab di aplikasi; ikuti masjid setempat.",
  },
];
seasons.forEach((se, idx) => {
  const sy = 98 + idx * 78;
  const row = addFrame(s5Astro, 28, sy, 1064, 66, C.stone, { border: C.pebble, bw: 1, radius: 8, name: `Season Bar ${idx + 1}` });
  addText(row, F.monoBold, 13, C.ink, se.label, 18, 10, 290, 20);
  addText(row, F.monoMed, 13, C.steelMuted, se.time, 18, 34, 320, 20);
  // Track + proportional daylight bar
  const trackFrame = addFrame(row, 354, 14, 686, 16, C.recessed, { radius: 4, clip: true, name: "Day Track" });
  addRect(trackFrame, 0, 0, se.barW, 16, se.barCol, { radius: 4, name: "Day Fill" });
  addText(row, F.sansReg, 14, C.steelMuted, se.note, 354, 38, 686, 20);
});

const campusTip = addFrame(s5Astro, 28, 340, 1064, 56, C.iceMist, { border: C.steel, bw: 1, radius: 8, name: "Campus & Office Tip" });
addText(
  campusTip,
  F.sansMed,
  16,
  C.ink,
  "ID · Kampus & Kantor (ETH / UZH / EPFL): Bawa sajadah lipat bersih & lap cipratan air di wastafel usai wudhu sebagai adab publik Swiss.",
  20,
  16,
  1024,
  24
);

addSlideFooter(s5, "05 / 10", "03 · GEBET & RAMADAN", { w: 1240, bg: C.iceMist });

// Right Full-Height Cobalt #1D5B8C Hub Tower (x: 1240..1920, y: 0..1080)
const s5Tower = addFrame(s5, 1240, 0, 680, SLIDE_H, C.cobalt, { name: "Ch03 Cobalt Hub Tower" });
addSvg(s5Tower, buildTopoRibbonSvg(680, 114, true), 0, 66, 680, 114, "Tower Topo Ribbon");
addSvg(s5Tower, buildCornerStampSvg(C.powderSky, C.ivory, C.teak, 32), 620, 22, 32, 32, "Tower Stamp TR");

addText(s5Tower, F.monoBold, 14, C.powderSky, "3.1 OFFIZIELLE VERZEICHNISSE", 44, 190, 592, 22, { ls: 6 });
addText(s5Tower, F.sansExtra, 30, C.ivory, "VIOZ & FIDS (>250 Zentren CH)", 44, 218, 592, 40, { ls: -1 });
addText(
  s5Tower,
  F.sansReg,
  17,
  C.iceMist,
  "• VIOZ: Vereinigung der Islamischen Organisationen in Zürich.\n• FIDS: Nationaler Dachverband inkl. BIK (Basel), UVAM (Waadt), KIOG (Bern).\n• Khutbah-Sprachen je nach Moschee: DE, AR, TR, BS, SQ oder EN.",
  44,
  268,
  592,
  106,
  { lh: 25 }
);

addSvg(s5Tower, buildKawungDividerSvg(592, 24, true), 44, 392, 592, 24, "Tower Kawung Divider");

addSignpostBadge(s5Tower, 44, 434, "VPI-SCHWERPUNKTORTE (TA'LIM)", { w: 380, h: 36, fontSize: 13 });

const hubs = [
  { name: "Iman Zentrum", addr: "Juchstrasse 15, 8604 Volketswil (ZH)", tag: "HAUPTORT · ZH" },
  { name: "Bilal Moschee", addr: "Baar (Kanton Zug)", tag: "ZENTRALSCHWEIZ" },
  { name: "Sahabat Nusantara", addr: "Stadel (Kanton Zürich)", tag: "ZÜRCHER UNTERLAND" },
  { name: "Regionale Gastgeber", addr: "Bäch (SZ) & St. Gallen (SG)", tag: "OST- & ZENTRALSCHWEIZ" },
];
hubs.forEach((hb, i) => {
  const hy = 492 + i * 116;
  const hc = addFrame(s5Tower, 44, hy, 592, 100, C.ink, { border: C.powderSky, bw: 1, radius: 10, name: `Hub · ${hb.name}` });
  addRect(hc, 18, 18, 180, 26, C.teak, { radius: 4, name: `Hub Tag ${i + 1}` });
  addText(hc, F.monoBold, 11, C.ivory, hb.tag, 18, 23, 180, 16, { align: "CENTER", ls: 5 });
  addText(hc, F.sansExtra, 22, C.ivory, hb.name, 18, 52, 270, 30);
  addText(hc, F.sansMed, 17, C.powderSky, hb.addr, 304, 24, 268, 60, { lh: 24, align: "RIGHT" });
});

addText(
  s5Tower,
  F.monoReg,
  13,
  C.powderSky,
  "MONATLICHES PENGAJIAN · SONNTAGS 11:00–16:00 CET",
  44,
  1016,
  592,
  22,
  { ls: 5 }
);

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 06 · 04 SCHWEIZER SCHULE, KINDER & FAMILIE (Timeline + Dual Action Split)
// ═══════════════════════════════════════════════════════════════════════════════
const s6 = ensureSlide("06 · 04 Schweizer Schule, Kinder & Familie");
s6.fills = solid(C.greige);

addSlideHeader(
  s6,
  "KAPITEL 04 · BILDUNGSWESEN",
  "Schweizer Schule, Kinder & Familie",
  "Sekolah Publik Swiss, Jokertage & Pengajian Anak",
  "VOLKSSCHULE · JOKERTAGE VS. DISPENSATION"
);

// Top Band (x: 80, y: 180, w: 1760, h: 248): 11-Year Timeline + Jokertage vs Eid Dispensation
const s6Top = addFrame(s6, 80, 180, 1760, 248, C.stone, { border: C.strongStone, bw: 1, radius: 12, name: "Ch04 Top Timeline Band" });

// Left 44%: 11 Jahre Volksschule horizontal steps
addText(s6Top, F.monoBold, 14, C.cobalt, "4.1 OBLIGATORISCHE VOLKSSCHULE (11 JAHRE · GRATIS & HOCHWERTIG)", 28, 20, 740, 20, { ls: 5 });
const schoolStages = [
  { st: "KINDERGARTEN", yr: "2 Jahre", desc: "Sozial-spielerischer Einstieg (oft ab 4 J.)", col: C.steel },
  { st: "PRIMARSCHULE", yr: "6 Jahre", desc: "Grundlagen + erste Fremdsprachen", col: C.cobalt },
  { st: "SEKUNDARSTUFE I", yr: "3 Jahre", desc: "Vor Berufslehre (EFZ) oder Gymnasium", col: C.ink },
];
schoolStages.forEach((ss, idx) => {
  const sx = 28 + idx * 248;
  const box = addFrame(s6Top, sx, 54, 232, 168, C.ivory, { border: C.pebble, bw: 1, radius: 8, name: `Stage ${idx + 1}` });
  addRect(box, 0, 0, 232, 34, ss.col, { radius: 4, name: `Stage Bar ${idx + 1}` });
  addText(box, F.monoBold, 13, C.ivory, ss.st, 12, 8, 208, 18, { align: "CENTER", ls: 4 });
  addText(box, F.sansExtra, 26, C.ink, ss.yr, 16, 48, 200, 34);
  addText(box, F.sansReg, 15, C.steelMuted, ss.desc, 16, 90, 200, 66, { lh: 22 });
});

// Right 55%: Jokertage vs Religiöse Dispensation
const dispPanel = addFrame(s6Top, 796, 18, 940, 212, C.ivory, { border: C.pebble, bw: 1, radius: 10, name: "Jokertage vs Dispensation" });
addText(dispPanel, F.monoBold, 14, C.teak, "4.2 ABSENZEN KLAR UNTERSCHEIDEN · JOKERTAGE VS. FEIERTAGS-DISPENSATION", 24, 16, 892, 20, { ls: 5 });

const jCard = addFrame(dispPanel, 24, 48, 434, 144, C.recessed, { border: C.pebble, bw: 1, radius: 8, name: "Jokertage Box" });
addText(jCard, F.sansExtra, 22, C.ink, "2 Jokertage / Schuljahr", 18, 14, 398, 28);
addText(
  jCard,
  F.sansReg,
  15,
  C.ink,
  "In vielen Kantonen (z. B. ZH) frei wählbar ohne Begründung — jedoch gelten oft Sperrfristen direkt vor/nach Schulferien.",
  18,
  48,
  398,
  84,
  { lh: 22 }
);

const eCard = addFrame(dispPanel, 476, 48, 440, 144, C.teakSand, { border: C.teak, bw: 1.5, radius: 8, name: "Eid Dispensation Box" });
addText(eCard, F.sansExtra, 22, C.teakDeep, "Eid al-Fitr & Eid al-Adha", 18, 14, 404, 28);
addText(
  eCard,
  F.sansMed,
  15,
  C.ink,
  "Zusätzliche religiöse Dispensation (z. B. ZH § 29 VSV) OHNE Verbrauch der Jokertage! Schriftliches Gesuch mind. 2–4 Wochen vorher einreichen.",
  18,
  48,
  404,
  84,
  { lh: 22 }
);

// Bottom-Left (x: 80, y: 446, w: 856, h: 538): Musterbrief & Dialog (Schwimmen / Lager)
const s6Left = addFrame(s6, 80, 446, 856, 538, C.ivory, { border: C.pebble, bw: 1, radius: 12, name: "Ch04 Left Dialog & Letter" });
addText(s6Left, F.monoBold, 14, C.cobalt, "4.3 DIALOG MIT LEHRPERSONEN & MUSTERBRIEF", 28, 22, 800, 20, { ls: 5 });
addText(s6Left, F.sansExtra, 26, C.ink, "Proaktiv, ruhig & lösungsorientiert (Art. 2 Abs. III Statuten)", 28, 48, 800, 34, { ls: -1 });

const letterBox = addFrame(s6Left, 28, 96, 800, 146, C.recessed, { border: C.strongStone, bw: 1, radius: 8, name: "Musterbrief Snippet" });
addText(letterBox, F.monoBold, 12, C.teak, "KOPIERVORLAGE DISPENSATIONSGESUCH (AN KLASSENLEHRPERSON / SCHULLEITUNG)", 18, 12, 764, 18);
addText(
  letterBox,
  F.monoReg,
  14,
  C.ink,
  "Betreff: Dispensationsgesuch Eid al-Fitr / Eid al-Adha · Schüler/in: [Name], Klasse [...]\n«Gemäss den kantonalen Richtlinien über die Dispensation an hohen religiösen Feiertagen bitten wir höflich um Beurlaubung am [Datum]. Verpassten Stoff holen wir selbstverständlich nach.»",
  18,
  38,
  764,
  96,
  { lh: 21 }
);

const dialogItems = [
  {
    h: "Schwimmunterricht (Bundesgericht-Praxis)",
    b: "Obligatorisch für alle Kinder — Lösungen in Praxis: körperbedeckende Kleidung (Burkini / UV-Schwimmanzug) & getrennte Umkleiden.",
  },
  {
    h: "Schullager (4–6 Wochen Vorlauf)",
    b: "Vorgespräch klärt ruhig: (1) schweinefleisch-/alkoholfreie Verpflegung, (2) geschützte Umkleide/Dusche, (3) Kontakt bei Heimweh.",
  },
  {
    h: "ID · Pendampingan VPI",
    b: "Pendekatan kolaboratif jauh lebih efektif di Swiss. Jika ada kendala dengan sekolah, hubungi pengurus VPI via info@percikaniman.ch.",
  },
];
dialogItems.forEach((di, idx) => {
  const dy = 256 + idx * 94;
  const row = addFrame(s6Left, 28, dy, 800, 84, C.stone, { border: C.pebble, bw: 1, radius: 8, name: `Dialog ${idx + 1}` });
  addText(row, F.sansBold, 16, C.cobalt, di.h, 18, 10, 764, 22);
  addText(row, F.sansReg, 15, C.ink, di.b, 18, 34, 764, 42, { lh: 20 });
});

// Bottom-Right (x: 964, y: 446, w: 876, h: 538): Kinder- & Jugendprogramme VPI
const s6Right = addFrame(s6, 964, 446, 876, 538, C.iceMist, { border: C.steel, bw: 1, radius: 12, name: "Ch04 Right Kids Programs" });
addText(s6Right, F.monoBold, 14, C.cobalt, "4.4 KINDER- & JUGENDPROGRAMME · PENGAJIAN ANAK & REMAJA", 28, 22, 820, 20, { ls: 5 });
addText(s6Right, F.sansExtra, 26, C.ink, "Starke Wurzeln für die nächste Generation in der Schweiz", 28, 48, 820, 34, { ls: -1 });

const kidsPrograms = [
  { p: "Quran Tilawah & Iqra", who: "Kinder & Jugendliche", when: "Mi & Sa via Zoom", lead: "Team: Sr. Sri, Sr. Susan & Sr. Atik", pop: true },
  { p: "Quran Tilawah – Jugend", who: "Teenager & junge Erw.", when: "Jeden Mittwochabend (Zoom)", lead: "Leitung: Br. Adi · Anm. Sr. Lusi", pop: false },
  { p: "Jugend Outdoor & Daytrips", who: "Jugendliche", when: "Saisonale Wandertage (Juni)", lead: "Br. Brandon Egger & Br. David Schneiter", pop: false },
  { p: "Familienlager VPI", who: "Ganze Familien (max. 60)", when: "Jährlich Herbst (DJH Lörrach)", lead: "Vorstand VPI & Gastreferenten", pop: true },
  { p: "Mualaf-Begleitung", who: "Neue Musliminnen & Muslime", when: "Individuell Online & Vor-Ort", lead: "VPI Seelsorge- & Bildungsteam", pop: false },
];
kidsPrograms.forEach((kp, idx) => {
  const ky = 100 + idx * 84;
  const kCard = addFrame(s6Right, 28, ky, 820, 74, C.ivory, { border: kp.pop ? C.teak : C.pebble, bw: 1, radius: 8, name: `Kids Prog ${idx + 1}` });
  addRect(kCard, 14, 14, 210, 46, kp.pop ? C.teak : C.cobalt, { radius: 6, name: `Prog Tag ${idx + 1}` });
  addText(kCard, F.sansBold, 15, C.ivory, kp.p, 18, 24, 202, 26, { align: "CENTER" });
  addText(kCard, F.sansBold, 16, C.ink, `${kp.who}  ·  ${kp.when}`, 242, 14, 560, 22);
  addText(kCard, F.monoMed, 14, C.steelMuted, kp.lead, 242, 40, 560, 22);
});

addSlideFooter(s6, "06 / 10", "04 · SCHULE & FAMILIE");

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 07 · 05 ZAKAT, STEUERN & SPENDENRECHT (4-KPI Hero + Tax/IBAN Split)
// ═══════════════════════════════════════════════════════════════════════════════
const s7 = ensureSlide("07 · 05 Zakat, Steuern & Spendenrecht");
s7.fills = solid(C.stone);

addSlideHeader(
  s7,
  "KAPITEL 05 · FINANZIELLE INTEGRITÄT",
  "Zakat, Steuern & Spendenrecht",
  "Zakat, Nisab CHF, Transparansi & Pajak Swiss",
  "SEKTION 03 · FINANZEN, NOTFALL & GEMEINSCHAFT",
  { bg: C.stone, border: C.pebble }
);

// Top 4-KPI Transparency Strip (x: 80, y: 180, w: 1760, h: 196)
const kpiRow = addFrame(s7, 80, 180, 1760, 196, C.stone, { name: "Ch05 Top KPI Strip" });
const kpis = [
  {
    bg: C.ink,
    valCol: C.powderSky,
    lblCol: C.ivory,
    subCol: C.iceMist,
    val: "2.5 %",
    lbl: "ZAKAT MAAL · NISAB",
    sub: "85 g Gold oder 595 g Silber über 1 Mondjahr (Hawl) zum CHF-Tageskurs (CH + ID Vermögen).",
  },
  {
    bg: C.cobalt,
    valCol: C.ivory,
    lblCol: C.powderSky,
    subCol: C.iceMist,
    val: "CHF 5'370",
    lbl: "ZAKAT-WEITERLEITUNG 2025",
    sub: "Zakat Fitrah & Maal 100 % zweckgebunden an Asnaf & Waisen weitergeleitet.",
  },
  {
    bg: C.ivory,
    valCol: C.ink,
    lblCol: C.cobalt,
    subCol: C.steelMuted,
    val: "CHF 2'775",
    lbl: "QURBAN AKTION 2025",
    sub: "15 Schafe zum Eid al-Adha vollständig für bedürftige Dörfer dokumentiert.",
  },
  {
    bg: C.teakSand,
    valCol: C.teak,
    lblCol: C.teakDeep,
    subCol: C.ink,
    val: "795+ BOXEN",
    lbl: "SHARING IS CARING",
    sub: "Ramadan Iftar-Mahlzeitboxen & soziale Nothilfe mit voller Vereinsrevision.",
  },
];
kpis.forEach((kp, idx) => {
  const kx = idx * 446;
  const card = addFrame(kpiRow, kx, 0, 422, 196, kp.bg, {
    border: idx >= 2 ? C.strongStone : C.steel,
    bw: 1,
    radius: 12,
    name: `KPI Card ${idx + 1}`,
  });
  addText(card, F.monoBold, 13, kp.lblCol, kp.lbl, 24, 20, 374, 20, { ls: 6 });
  addText(card, F.monoExtra, 42, kp.valCol, kp.val, 24, 52, 374, 50, { ls: -1 });
  addText(card, F.sansReg, 15, kp.subCol, kp.sub, 24, 114, 374, 68, { lh: 22 });
});

// Bottom-Left (x: 80, y: 398, w: 844, h: 586): Swiss Tax Integrity (Art. 33a DBG)
const s7Left = addFrame(s7, 80, 398, 844, 586, C.ivory, { border: C.pebble, bw: 1, radius: 12, name: "Ch05 Left Tax Honesty" });
addText(s7Left, F.monoBold, 14, C.cobalt, "5.2 SCHWEIZER STEUERRECHT · KEINE FALSCHEN VERSPRECHEN", 28, 22, 788, 20, { ls: 5 });
addText(s7Left, F.sansExtra, 26, C.ink, "Abzugsfähigkeit von Spenden in der Schweiz", 28, 48, 788, 34, { ls: -1 });

const taxRules = [
  {
    t: "1. Kantonale Steuerbefreiung entscheidend (Art. 33a DBG)",
    d: "Spenden können nur vom steuerbaren Einkommen abgezogen werden, wenn die empfangende Organisation vom zuständigen kantonalen Steueramt für das betreffende Steuerjahr formell steuerbefreit wurde.",
  },
  {
    t: "2. Ideeller Zweck (Art. 1 Abs. III & Art. 11 Abs. IV Statuten)",
    d: "VPI verfolgt keinerlei Erwerbszwecke; bei Auflösung fliesst Restvermögen zwingend an eine steuerbefreite Schweizer Institution. Massgeblich ist stets der aktuelle Bescheid des Steueramtes Zürich.",
  },
  {
    t: "3. Mitgliederbeiträge nicht abzugsfähig",
    d: "Ordentliche Vereinsmitgliederbeiträge gelten im Schweizer Steuerrecht grundsätzlich nicht als gemeinnützige Spende. Prüfen Sie Ihre persönliche Spendenbescheinigung & kantonale Wegleitung.",
  },
];
taxRules.forEach((tr, i) => {
  const ty = 100 + i * 124;
  const r = addFrame(s7Left, 28, ty, 788, 112, C.stone, { border: C.pebble, bw: 1, radius: 8, name: `Tax Rule ${i + 1}` });
  addText(r, F.sansBold, 17, C.cobalt, tr.t, 18, 12, 752, 24);
  addText(r, F.sansReg, 15, C.ink, tr.d, 18, 40, 752, 62, { lh: 21 });
});

const taxIdBox = addFrame(s7Left, 28, 478, 788, 88, C.iceMist, { border: C.steel, bw: 1, radius: 8, name: "Tax ID Tip" });
addText(
  taxIdBox,
  F.sansMed,
  15,
  C.ink,
  "ID · Catatan Donatur: Pisahkan selalu tujuan dana antara Zakat (8 golongan Asnaf) dan Infaq Operasional Verein (sewa ruang kajian, materi pendidikan) pada kolom Verwendungszweck!",
  18,
  18,
  752,
  54,
  { lh: 23 }
);

// Bottom-Right (x: 952, y: 398, w: 888, h: 586): Official PostFinance IBAN & 6 Zweckcodes
const s7Right = addFrame(s7, 952, 398, 888, 586, C.greige, { border: C.strongStone, bw: 1, radius: 12, name: "Ch05 Right IBAN & Zweckcodes" });

const ibanCard = addFrame(s7Right, 24, 22, 840, 160, C.ink, { border: C.steel, bw: 1, radius: 10, name: "PostFinance Creditor Card" });
addText(ibanCard, F.monoBold, 13, C.powderSky, "5.3 OFFIZIELLE ZAHLUNGSWEGE · KONTOINHABER VEREIN PERCIKAN IMAN", 24, 18, 792, 18, { ls: 5 });
addText(ibanCard, F.monoExtra, 30, C.ivory, "CH89 0900 0000 6049 6610 7", 24, 46, 792, 38, { ls: 2 });
addText(
  ibanCard,
  F.sansMed,
  16,
  C.iceMist,
  "PostFinance AG · 8000 Zürich, Schweiz · UID CHE-382.914.820\nSwiss QR-Rechnung · Banküberweisung · TWINT (Empfänger «Verein Percikan Iman» prüfen!)",
  24,
  96,
  792,
  48,
  { lh: 23 }
);

addText(s7Right, F.monoBold, 14, C.teak, "VERBINDLICHE ZWECKCODES (VERWENDUNGSZWECK / TWINT-NOTIZ)", 28, 200, 832, 20, { ls: 5 });

const codes = [
  ["INFAQ", "Vereinsbetrieb, Raummieten (Volketswil, Baar, Stadel), Unterrichtsmaterial"],
  ["ZAKAT-FITRAH", "Zakat zum Ende des Ramadan (100 % an Asnaf & Bedürftige)"],
  ["ZAKAT-MAAL", "2.5 % Vermögens-Zakat (100 % zweckgebunden für Asnaf & Waisen)"],
  ["QURBAN", "Opfertiere zum Eid al-Adha · transparente Dorfabwicklung"],
  ["SHARING-CARING", "Ramadan Iftar-Boxen & akute soziale / humanitäre Nothilfe"],
  ["TRAUERFALL / LAGER", "TRAUERFALL (Solidaritätsfonds) · FAMILIENLAGER (Teilnehmerbeitrag)"],
];
codes.forEach(([code, desc], i) => {
  const cy = 230 + i * 56;
  const row = addFrame(s7Right, 24, cy, 840, 48, C.ivory, { border: C.pebble, bw: 1, radius: 6, name: `Zweckcode ${code}` });
  addRect(row, 10, 8, 204, 32, C.teak, { radius: 4, name: `Pill ${code}` });
  addText(row, F.monoBold, 13, C.ivory, code, 10, 14, 204, 20, { align: "CENTER", ls: 4 });
  addText(row, F.sansMed, 15, C.ink, desc, 228, 13, 598, 24);
});

addSlideFooter(s7, "07 / 10", "05 · ZAKAT & STEUERN", { bg: C.stone });

// ── Batch 2 Deterministic Layout Validation ───────────────────────────────────
function validateSlides(slideList) {
  const issues = [];
  const OVERLAP_PX = 4;
  const OVERFLOW_PX = 1;
  for (const slide of slideList) {
    const kids = slide.children.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      x: c.x,
      y: c.y,
      w: c.width,
      h: c.height,
      node: c,
    }));
    for (let i = 0; i < kids.length; i++) {
      for (let j = i + 1; j < kids.length; j++) {
        const a = kids[i], b = kids[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ox >= OVERLAP_PX && oy >= OVERLAP_PX) {
          issues.push({ slide: slide.name, type: "overlap", nodes: [a.name, b.name] });
        }
      }
      const c = kids[i];
      if (c.x < -OVERFLOW_PX || c.y < -OVERFLOW_PX || c.x + c.w > SLIDE_W + OVERFLOW_PX || c.y + c.h > SLIDE_H + OVERFLOW_PX) {
        issues.push({ slide: slide.name, type: "outOfBounds", node: c.name, rect: [c.x, c.y, c.w, c.h] });
      }
      if (c.type === "FRAME") {
        const texts = c.node.findAllWithCriteria({ types: ["TEXT"] });
        for (const t of texts) {
          const abs = t.absoluteBoundingBox;
          const pAbs = c.node.absoluteBoundingBox;
          if (!abs || !pAbs) continue;
          if (
            abs.x + abs.width > pAbs.x + pAbs.width + OVERFLOW_PX ||
            abs.y + abs.height > pAbs.y + pAbs.height + OVERFLOW_PX
          ) {
            issues.push({ slide: slide.name, type: "textClip", node: t.name, parent: c.name });
          }
        }
      }
    }
  }
  return { clean: issues.length === 0, issues };
}

const batchSlides = [s5, s6, s7];
const validation = validateSlides(batchSlides);

return {
  batch: 2,
  slides: batchSlides.map((s) => ({ id: s.id, name: s.name })),
  validation,
  createdNodeIdsCount: createdNodeIds.length,
  createdNodeIds,
};
