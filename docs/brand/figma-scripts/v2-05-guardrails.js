// v2-05-guardrails.js — Verein Percikan Iman Schweiz v2 · Page 05: Volunteer 3-Min Figma Guardrail Sheet
// Target: fileKey tJA2fcaYcckLkwHmRGYvf9

const TARGET_PAGE = "05 · Volunteer 3-Min Guardrail";
let page = figma.root.children.find((p) => p.name === TARGET_PAGE);
if (!page) {
  page = figma.createPage();
  page.name = TARGET_PAGE;
}
await figma.setCurrentPageAsync(page);

const BOARD_NAME = "05 · Volunteer 3-Minute Guardrail Sheet (v2)";
const BOARD_W = 1600;
const PAD = 64;
const INNER_W = BOARD_W - PAD * 2; // 1472

for (const child of [...figma.currentPage.children]) {
  if (child.name === BOARD_NAME) child.remove();
}

const hex = (h) => ({
  r: parseInt(h.slice(1, 3), 16) / 255,
  g: parseInt(h.slice(3, 5), 16) / 255,
  b: parseInt(h.slice(5, 7), 16) / 255,
});
const rgba = (h, a = 1) => ({ ...hex(h), a });
const solid = (h, opacity = 1) =>
  opacity < 1 ? [{ type: "SOLID", color: hex(h), opacity }] : [{ type: "SOLID", color: hex(h) }];

const available = await figma.listAvailableFontsAsync();
const byFam = new Map();
for (const f of available) {
  if (!byFam.has(f.fontName.family)) byFam.set(f.fontName.family, new Set());
  byFam.get(f.fontName.family).add(f.fontName.style);
}
const pickFont = (families, styleCandidates) => {
  for (const fam of families) {
    const styles = byFam.get(fam);
    if (!styles) continue;
    for (const st of styleCandidates) {
      if (styles.has(st)) return { family: fam, style: st };
    }
    const first = styles.values().next().value;
    if (first) return { family: fam, style: first };
  }
  return { family: "Inter", style: "Regular" };
};

// Strictly 2 non-serif font families: Plus Jakarta Sans + JetBrains Mono
const FONTS = {
  sansReg: pickFont(["Plus Jakarta Sans", "Inter"], ["Regular"]),
  sansMed: pickFont(["Plus Jakarta Sans", "Inter"], ["Medium", "Regular"]),
  sansSemi: pickFont(["Plus Jakarta Sans", "Inter"], ["SemiBold", "Semi Bold", "Bold"]),
  sansBold: pickFont(["Plus Jakarta Sans", "Inter"], ["Bold", "SemiBold"]),
  sansExtra: pickFont(["Plus Jakarta Sans", "Inter"], ["ExtraBold", "Extra Bold", "Bold"]),
  sansItalic: pickFont(["Plus Jakarta Sans", "Inter"], ["Italic", "Regular"]),
  monoReg: pickFont(["JetBrains Mono", "Inter"], ["Regular"]),
  monoMed: pickFont(["JetBrains Mono", "Inter"], ["Medium", "Regular"]),
  monoBold: pickFont(["JetBrains Mono", "Inter"], ["Bold", "Medium", "Regular"]),
};

const probe = figma.createText();
const uniqueFonts = [
  ...new Map([probe.fontName, ...Object.values(FONTS)].map((f) => [`${f.family}::${f.style}`, f])).values(),
];
probe.remove();
await Promise.all(uniqueFonts.map((f) => figma.loadFontAsync(f)));

const createdNodeIds = [];
const track = (n) => {
  createdNodeIds.push(n.id);
  return n;
};

const makeBox = (dir, props = {}) => {
  const f = track(figma.createAutoLayout(dir));
  if (props.w !== undefined || props.h !== undefined) f.resize(props.w ?? 100, props.h ?? 100);
  if (props.name) f.name = props.name;
  if (props.gap !== undefined) f.itemSpacing = props.gap;
  if (props.pad !== undefined) {
    f.paddingTop = props.pad;
    f.paddingBottom = props.pad;
    f.paddingLeft = props.pad;
    f.paddingRight = props.pad;
  }
  if (props.px !== undefined) {
    f.paddingLeft = props.px;
    f.paddingRight = props.px;
  }
  if (props.py !== undefined) {
    f.paddingTop = props.py;
    f.paddingBottom = props.py;
  }
  if (props.bg) f.fills = solid(props.bg, props.bgOpacity ?? 1);
  else if (props.noFill) f.fills = [];
  if (props.border) {
    f.strokes = solid(props.border, props.borderOpacity ?? 1);
    f.strokeWeight = props.bw ?? 1;
    f.strokeAlign = "INSIDE";
  }
  if (props.radius !== undefined) f.cornerRadius = props.radius;
  if (props.alignMain) f.primaryAxisAlignItems = props.alignMain;
  if (props.alignCross) f.counterAxisAlignItems = props.alignCross;
  if (props.clip) f.clipsContent = true;
  if (props.w !== undefined) f.layoutSizingHorizontal = "FIXED";
  if (props.h !== undefined) f.layoutSizingVertical = "FIXED";
  else if (props.w !== undefined) f.layoutSizingVertical = "HUG";
  return f;
};

const addText = (parent, str, opts = {}) => {
  const t = track(figma.createText());
  parent.appendChild(t);
  t.fontName = opts.font || FONTS.sansReg;
  t.fontSize = opts.size || 16;
  if (opts.lh) t.lineHeight = typeof opts.lh === "number" ? { value: opts.lh, unit: "PIXELS" } : opts.lh;
  if (opts.ls !== undefined) {
    t.letterSpacing = typeof opts.ls === "number" ? { value: opts.ls, unit: "PERCENT" } : opts.ls;
  }
  if (opts.upper) t.textCase = "UPPER";
  if (opts.align) t.textAlignHorizontal = opts.align;
  t.fills = solid(opts.color || "#132435", opts.opacity ?? 1);
  t.characters = String(str);
  if (opts.w) {
    t.resize(opts.w, 40);
    t.textAutoResize = "HEIGHT";
    if (parent.layoutMode && parent.layoutMode !== "NONE") t.layoutSizingHorizontal = "FIXED";
  } else {
    t.textAutoResize = "WIDTH_AND_HEIGHT";
  }
  return t;
};

const addSvg = (parent, svg, w, h, name) => {
  const node = track(figma.createNodeFromSvg(svg));
  if (name) node.name = name;
  parent.appendChild(node);
  node.resize(w, h);
  if (parent.layoutMode && parent.layoutMode !== "NONE") {
    node.layoutSizingHorizontal = "FIXED";
    node.layoutSizingVertical = "FIXED";
  }
  return node;
};

const addRule = (parent, w, color = "#D5CFC4", h = 1) => {
  const r = track(figma.createRectangle());
  parent.appendChild(r);
  r.resize(w, h);
  r.fills = solid(color);
  if (parent.layoutMode && parent.layoutMode !== "NONE") {
    r.layoutSizingHorizontal = "FIXED";
    r.layoutSizingVertical = "FIXED";
  }
  return r;
};

const addCrosshair = (parent, x, y, color = "#B8B0A2", size = 14) => {
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M${size / 2} 0V${size}M0 ${size / 2}H${size}" stroke="${color}" stroke-width="1.3"/></svg>`;
  const mark = track(figma.createNodeFromSvg(svg));
  mark.name = "Swiss Crosshair +";
  parent.appendChild(mark);
  mark.resize(size, size);
  if (parent.layoutMode && parent.layoutMode !== "NONE") mark.layoutPositioning = "ABSOLUTE";
  mark.x = x;
  mark.y = y;
  return mark;
};

// Root Board
const board = makeBox("VERTICAL", {
  name: BOARD_NAME,
  w: BOARD_W,
  pad: PAD,
  gap: 56,
  bg: "#EAE6DF",
  border: "#D5CFC4",
  bw: 1,
});
board.x = 0;
board.y = 0;
figma.currentPage.appendChild(board);
addCrosshair(board, 24, 24, "#B8B0A2", 16);
addCrosshair(board, BOARD_W - 40, 24, "#B8B0A2", 16);

// Header
const header = makeBox("VERTICAL", { name: "Board Header", w: INNER_W, gap: 14, noFill: true });
board.appendChild(header);
const metaRow = makeBox("HORIZONTAL", { w: INNER_W, alignMain: "SPACE_BETWEEN", alignCross: "CENTER", noFill: true });
header.appendChild(metaRow);
addText(metaRow, "VEREIN PERCIKAN IMAN · SCHWEIZ", { font: FONTS.monoBold, size: 14, ls: 8, upper: true, color: "#1D5B8C" });
addText(metaRow, "05 / 05 · VOLUNTEER 3-MINUTE FIGMA GUARDRAIL SHEET", { font: FONTS.monoReg, size: 13, ls: 6, upper: true, color: "#4A5E72" });
addRule(header, INNER_W, "#D5CFC4");
addText(header, 'Volunteer "3-Minute Flyer" Guardrail Sheet (Figma-Only)', {
  font: FONTS.sansExtra,
  size: 46,
  lh: 54,
  ls: -2,
  color: "#132435",
  w: INNER_W,
});
addText(
  header,
  "Zero guesswork for volunteers: duplicate an editable Auto-Layout frame from Page 04 inside Figma, swap DE+ID text using strictly Plus Jakarta Sans + JetBrains Mono, keep the 64px safe-zone intact, and stay 100% inside the Greige, Blue & Roasted Teak palette.",
  { font: FONTS.sansReg, size: 18, lh: 27, color: "#4A5E72", w: INNER_W }
);

// ── Section 01: Side-by-Side DON'T vs DO
const sec1 = makeBox("VERTICAL", { name: "01 · Side-by-Side DO vs DONT", w: INNER_W, gap: 20, noFill: true });
board.appendChild(sec1);
addText(sec1, "01 / VISUAL GUARDRAILS — LEGACY ANTI-PATTERN VS. SWISS CIVIC ATELIER (V2)", {
  font: FONTS.monoBold,
  size: 13,
  ls: 8,
  color: "#1D5B8C",
});

const compRow = makeBox("HORIZONTAL", { w: INNER_W, gap: 40, noFill: true });
sec1.appendChild(compRow);

// LEFT: DON'T CARD (540x675 preview inside 716px panel)
const dontCol = makeBox("VERTICAL", {
  name: "DONT Column",
  w: 716,
  pad: 32,
  gap: 24,
  bg: "#F4F2ED",
  border: "#8C5327",
  bw: 2,
  radius: 16,
});
compRow.appendChild(dontCol);

const dontHead = makeBox("HORIZONTAL", { w: 652, alignMain: "SPACE_BETWEEN", alignCross: "CENTER", noFill: true });
dontCol.appendChild(dontHead);
const dontBadge = makeBox("HORIZONTAL", { px: 16, py: 8, bg: "#6F401D", radius: 6 });
dontHead.appendChild(dontBadge);
addText(dontBadge, "DON'T — OFF-BRAND & UNREADABLE", { font: FONTS.monoBold, size: 13, ls: 6, color: "#FAF9F6" });
addText(dontHead, "DO NOT SHIP", { font: FONTS.monoBold, size: 12, ls: 4, color: "#8C5327" });

// Miniature DON'T Flyer (540×675) centered inside 652px box
const dontStage = makeBox("VERTICAL", { w: 652, alignMain: "CENTER", alignCross: "CENTER", noFill: true });
dontCol.appendChild(dontStage);

const dontFlyer = track(figma.createFrame());
dontFlyer.name = "DONT Flyer Example (540×675 Scaled)";
dontStage.appendChild(dontFlyer);
dontFlyer.resize(540, 675);
dontFlyer.layoutSizingHorizontal = "FIXED";
dontFlyer.layoutSizingVertical = "FIXED";
dontFlyer.cornerRadius = 10;
dontFlyer.clipsContent = true;
dontFlyer.fills = [
  {
    type: "GRADIENT_LINEAR",
    gradientStops: [
      { color: rgba("#EC4899", 1), position: 0 },
      { color: rgba("#F97316", 1), position: 0.5 },
      { color: rgba("#A855F7", 1), position: 1 },
    ],
    gradientTransform: [[0, 1, 0], [-1, 0, 1]],
  },
];
dontFlyer.strokes = solid("#6F401D");
dontFlyer.strokeWeight = 2;

const dontTitle = addText(dontFlyer, "KAJIAN AKBAR SPESIAL!!", { font: FONTS.sansExtra, size: 42, color: "#FDE047", w: 530 });
dontTitle.x = 4;
dontTitle.y = 14;
const badBox = track(figma.createRectangle());
dontFlyer.appendChild(badBox);
badBox.resize(516, 176);
badBox.x = 12;
badBox.y = 148;
badBox.cornerRadius = 28;
badBox.fills = solid("#22C55E", 0.38);
badBox.strokes = solid("#FFFFFF");
badBox.strokeWeight = 4;

const dontBody = addText(dontFlyer, "Gratis Snack · Daftar ke Admin WA sekarang\nTempat terbatas jangan sampai ketinggalan!!!", {
  font: FONTS.sansItalic,
  size: 23,
  lh: 30,
  color: "#FFFFFF",
  w: 492,
});
dontBody.x = 24;
dontBody.y = 172;

const dontFoot = addText(dontFlyer, "Info lengkap: DM ig atau tanya panitia\n(No UID / No IBAN / 0px margin clip)", {
  font: FONTS.sansBold,
  size: 20,
  lh: 28,
  color: "#1E1B4B",
  w: 520,
});
dontFoot.x = 6;
dontFoot.y = 582;

// Diagonal forbidden X overlay SVG
const strikeSvg = `<svg width="540" height="675" viewBox="0 0 540 675" fill="none" xmlns="http://www.w3.org/2000/svg">
  <line x1="20" y1="20" x2="520" y2="655" stroke="#6F401D" stroke-width="5" stroke-opacity="0.7" stroke-dasharray="14 10"/>
  <line x1="520" y1="20" x2="20" y2="655" stroke="#6F401D" stroke-width="5" stroke-opacity="0.7" stroke-dasharray="14 10"/>
</svg>`;
const strike = track(figma.createNodeFromSvg(strikeSvg));
strike.name = "Forbidden Strike Overlay";
dontFlyer.appendChild(strike);
strike.resize(540, 675);
strike.x = 0;
strike.y = 0;

const dontNotes = [
  "No pastel purple/orange/pink gradients, pure white canvas backgrounds, or off-brand bright greens.",
  "No serif, brush, or script fonts, and zero Unicode fake italics in bios or captions.",
  "No 0px border collisions, mixed 4-font styling, or unlabeled English/slang-only layouts.",
  "No external unapproved flyer tools, bit.ly links, or missing UID CHE-382.914.820 / IBAN.",
];
const dontList = makeBox("VERTICAL", { w: 652, gap: 8, noFill: true });
dontCol.appendChild(dontList);
for (const n of dontNotes) {
  addText(dontList, `×  ${n}`, { font: FONTS.sansMed, size: 15, lh: 22, color: "#6F401D", w: 652 });
}

// RIGHT: DO CARD (540x675 scaled preview inside 716px panel)
const doCol = makeBox("VERTICAL", {
  name: "DO Column",
  w: 716,
  pad: 32,
  gap: 24,
  bg: "#FAF9F6",
  border: "#1D5B8C",
  bw: 2,
  radius: 16,
});
compRow.appendChild(doCol);

const doHead = makeBox("HORIZONTAL", { w: 652, alignMain: "SPACE_BETWEEN", alignCross: "CENTER", noFill: true });
doCol.appendChild(doHead);
const doBadge = makeBox("HORIZONTAL", { px: 16, py: 8, bg: "#1D5B8C", radius: 6 });
doHead.appendChild(doBadge);
addText(doBadge, "DO — GREIGE, BLUE & ROASTED TEAK", { font: FONTS.monoBold, size: 13, ls: 6, color: "#FFFFFF" });
addText(doHead, "APPROVED STANDARD", { font: FONTS.monoBold, size: 12, ls: 4, color: "#1D5B8C" });

const doStage = makeBox("VERTICAL", { w: 652, alignMain: "CENTER", alignCross: "CENTER", noFill: true });
doCol.appendChild(doStage);

const doFlyer = makeBox("VERTICAL", {
  name: "DO Flyer Example (540×675 Scaled)",
  w: 540,
  h: 675,
  pad: 32,
  gap: 18,
  bg: "#EAE6DF",
  border: "#D5CFC4",
  bw: 2,
  radius: 10,
  clip: true,
});
doStage.appendChild(doFlyer);
addCrosshair(doFlyer, 12, 12, "#B8B0A2", 12);
addCrosshair(doFlyer, 516, 12, "#B8B0A2", 12);

// Scaled 32px (=64px at 1080px) Dashed Safe-Zone indicator
const safeDashed = track(figma.createRectangle());
safeDashed.name = "Safe-Zone Dashed Overlay (64px at 1080w)";
doFlyer.appendChild(safeDashed);
safeDashed.resize(476, 611);
safeDashed.layoutPositioning = "ABSOLUTE";
safeDashed.x = 32;
safeDashed.y = 32;
safeDashed.fills = [];
safeDashed.strokes = solid("#1D5B8C", 0.45);
safeDashed.strokeWeight = 1;
safeDashed.dashPattern = [6, 5];

const dfTop = makeBox("HORIZONTAL", { w: 476, alignMain: "SPACE_BETWEEN", alignCross: "CENTER", noFill: true });
doFlyer.appendChild(dfTop);
addText(dfTop, "VEREIN PERCIKAN IMAN · SCHWEIZ", { font: FONTS.monoBold, size: 10, ls: 6, color: "#1D5B8C" });
addText(dfTop, "SAFE-ZONE 64PX", { font: FONTS.monoBold, size: 10, ls: 4, color: "#8C5327" });
addRule(doFlyer, 476, "#D5CFC4");

const dfTag = makeBox("HORIZONTAL", { px: 12, py: 5, bg: "#F3E8DF", border: "#8C5327", radius: 999 });
doFlyer.appendChild(dfTag);
addText(dfTag, "MONATLICHE BILDUNG · TEAK SIGNPOST", { font: FONTS.monoBold, size: 10, ls: 4, color: "#8C5327" });

addText(doFlyer, "Monatliche Ta'lim\n& Begegnung", {
  font: FONTS.sansExtra,
  size: 38,
  lh: 42,
  ls: -2,
  color: "#132435",
  w: 476,
});
addText(doFlyer, "Kajian Islam Bulanan & Silaturahmi Keluarga Indonesia di Zürich.", {
  font: FONTS.sansMed,
  size: 16,
  lh: 23,
  color: "#4A5E72",
  w: 476,
});

const dfCard = makeBox("VERTICAL", { w: 476, pad: 18, gap: 8, bg: "#FAF9F6", border: "#D5CFC4", radius: 10 });
doFlyer.appendChild(dfCard);
addText(dfCard, "SONNTAG · 13:30 UHR · IMAN ZENTRUM VOLKETSWIL", { font: FONTS.monoBold, size: 11, ls: 4, color: "#1D5B8C" });
addText(dfCard, "Juchstrasse 15, 8604 Volketswil · DE + ID Bilingual", { font: FONTS.sansBold, size: 15, color: "#132435", w: 440 });

const dfCta = makeBox("HORIZONTAL", { w: 476, px: 18, py: 14, bg: "#1D5B8C", radius: 8, alignMain: "SPACE_BETWEEN", alignCross: "CENTER" });
doFlyer.appendChild(dfCta);
addText(dfCta, "percikaniman.ch · @verein.pi", { font: FONTS.sansBold, size: 15, color: "#FFFFFF" });
addText(dfCta, "UID CHE-382.914.820", { font: FONTS.monoBold, size: 11, color: "#9CC4E4" });

addRule(doFlyer, 476, "#D5CFC4");
addText(doFlyer, "POSTFINANCE IBAN: CH89 0900 0000 6049 6610 7", { font: FONTS.monoBold, size: 11, ls: 3, color: "#4A5E72" });

const doNotes = [
  "Warm Greige grounds (#EAE6DF / #F4F2ED / #FAF9F6) + Percikan Cobalt (#1D5B8C) + Roasted Teak Pop (#8C5327).",
  "Strictly 2 non-serif font families: Plus Jakarta Sans (headlines/body) + JetBrains Mono (metadata).",
  "Exact 64px outer safe-zone padding on 1080×1350 frames; pure #FFFFFF strictly for SIX QR quiet zones.",
  "Built directly inside Figma Auto-Layout so volunteers edit text cleanly without breaking alignment.",
];
const doList = makeBox("VERTICAL", { w: 652, gap: 8, noFill: true });
doCol.appendChild(doList);
for (const n of doNotes) {
  addText(doList, `✓  ${n}`, { font: FONTS.sansMed, size: 15, lh: 22, color: "#132435", w: 652 });
}

// ── Section 02: Safe-Zone Geometry & Strictly 2-Font Type Hierarchy
const sec2 = makeBox("VERTICAL", { name: "02 · Safe-Zone & 2-Font Hierarchy", w: INNER_W, gap: 20, noFill: true });
board.appendChild(sec2);
addText(sec2, "02 / SAFE-ZONE MARGINS (1080×1350) & STRICT 2-FONT TYPE HIERARCHY", {
  font: FONTS.monoBold,
  size: 13,
  ls: 8,
  color: "#1D5B8C",
});

const specRow = makeBox("HORIZONTAL", { w: INNER_W, gap: 40, noFill: true });
sec2.appendChild(specRow);

// Safe-Zone Blueprint Card (680px)
const bpCard = makeBox("VERTICAL", {
  name: "Safe-Zone Margin Blueprint",
  w: 680,
  pad: 32,
  gap: 20,
  bg: "#FAF9F6",
  border: "#D5CFC4",
  radius: 16,
});
specRow.appendChild(bpCard);
addText(bpCard, "1080 × 1350 PX PORTRAIT GRID · 64 PX SAFE-ZONE", { font: FONTS.monoBold, size: 14, ls: 6, color: "#1D5B8C" });

const bpSvg = `<svg width="616" height="390" viewBox="0 0 616 390" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="308" height="386" rx="8" fill="#EAE6DF" stroke="#132435" stroke-width="1.5"/>
  <rect x="20" y="20" width="272" height="350" rx="4" fill="#F4F2ED" stroke="#1D5B8C" stroke-width="1.5" stroke-dasharray="6 4"/>
  <rect x="34" y="34" width="244" height="24" rx="3" fill="#DFE8F0" stroke="#1D5B8C"/>
  <rect x="34" y="70" width="244" height="92" rx="4" fill="#FAF9F6" stroke="#D5CFC4"/>
  <rect x="34" y="176" width="244" height="134" rx="4" fill="#FAF9F6" stroke="#D5CFC4"/>
  <rect x="34" y="324" width="118" height="28" rx="4" fill="#8C5327"/>
  <rect x="160" y="324" width="118" height="28" rx="4" fill="#1D5B8C"/>
  <path d="M12 6V16M7 11H17" stroke="#1D5B8C" stroke-width="1.4"/>
  <path d="M300 6V16M295 11H305" stroke="#1D5B8C" stroke-width="1.4"/>
  <line x1="336" y1="20" x2="604" y2="20" stroke="#D5CFC4"/>
  <line x1="336" y1="112" x2="604" y2="112" stroke="#D5CFC4"/>
  <line x1="336" y1="224" x2="604" y2="224" stroke="#D5CFC4"/>
  <line x1="336" y1="324" x2="604" y2="324" stroke="#D5CFC4"/>
</svg>`;
const bpWrap = makeBox("HORIZONTAL", { w: 616, gap: 20, noFill: true });
bpCard.appendChild(bpWrap);
addSvg(bpWrap, bpSvg, 616, 390, "1080×1350 Blueprint Diagram");

// Overlay labels cleanly beside SVG via an Auto-Layout legend below SVG (no text clipping)
const bpSpecs = makeBox("VERTICAL", { w: 616, gap: 8, noFill: true });
bpCard.appendChild(bpSpecs);
addText(bpSpecs, "• Canvas Trim: 1080 × 1350 px (IG 4:5 Portrait) · Export 2× PNG", { font: FONTS.monoBold, size: 13, color: "#132435" });
addText(bpSpecs, "• Safe-Zone Inset: 64 px all 4 sides -> 952 × 1222 px Live Content Box", { font: FONTS.monoBold, size: 13, color: "#1D5B8C" });
addText(bpSpecs, "• Crosshair + Anchors: 24 px inset · 1 px Hairline Divider (#D5CFC4)", { font: FONTS.monoReg, size: 13, color: "#4A5E72" });

// 2-Font Type Hierarchy & Palette Ratio Card (752px)
const typeCard = makeBox("VERTICAL", {
  name: "2-Font Type Hierarchy & Ratio",
  w: 752,
  pad: 32,
  gap: 20,
  bg: "#FAF9F6",
  border: "#D5CFC4",
  radius: 16,
});
specRow.appendChild(typeCard);
addText(typeCard, "STRICTLY 2 FONT FAMILIES · 3-TIER SIZE HIERARCHY", { font: FONTS.monoBold, size: 14, ls: 6, color: "#1D5B8C" });

const tiers = [
  {
    tag: "TIER 1 · DE DISPLAY HEADLINE",
    spec: "Plus Jakarta Sans ExtraBold · 56–72px · Line 1.1× · Tracking -2%",
    sample: "Gemeinsam im Glauben wachsen",
    font: FONTS.sansExtra,
    size: 28,
    color: "#132435",
  },
  {
    tag: "TIER 2 · ID + DE SUBTITLE & BODY",
    spec: "Plus Jakarta Sans Regular / Medium · 22–28px · Line 1.45× · Clean UTF-8",
    sample: "Panduan & Pembinaan Masyarakat Indonesia di Swiss",
    font: FONTS.sansMed,
    size: 20,
    color: "#4A5E72",
  },
  {
    tag: "TIER 3 · CIVIC METADATA & SIGNPOSTS",
    spec: "JetBrains Mono Bold · 14–18px UPPERCASE · Tabular Nums · Tracking +6%",
    sample: "CH89 0900 0000 6049 6610 7 · UID CHE-382.914.820",
    font: FONTS.monoBold,
    size: 16,
    color: "#8C5327",
  },
];
for (const tr of tiers) {
  const tb = makeBox("VERTICAL", { w: 688, pad: 18, gap: 6, bg: "#F4F2ED", border: "#D5CFC4", radius: 10 });
  typeCard.appendChild(tb);
  addText(tb, `${tr.tag}  —  ${tr.spec}`, { font: FONTS.monoBold, size: 12, ls: 3, color: "#1D5B8C", w: 652 });
  addText(tb, tr.sample, { font: tr.font, size: tr.size, color: tr.color, w: 652 });
}

const ratioBar = makeBox("HORIZONTAL", { w: 688, gap: 12, noFill: true });
typeCard.appendChild(ratioBar);
const ratios = [
  { t: "60% GREIGE GROUNDS", bg: "#EAE6DF", fg: "#132435", b: "#B8B0A2", w: 280 },
  { t: "30% PERCIKAN BLUES", bg: "#1D5B8C", fg: "#FFFFFF", b: "#15466E", w: 224 },
  { t: "10% TEAK POP", bg: "#8C5327", fg: "#FAF9F6", b: "#6F401D", w: 160 },
];
for (const r of ratios) {
  const rb = makeBox("HORIZONTAL", { w: r.w, px: 14, py: 12, bg: r.bg, border: r.b, radius: 8, alignMain: "CENTER", alignCross: "CENTER" });
  ratioBar.appendChild(rb);
  addText(rb, r.t, { font: FONTS.monoBold, size: 12, ls: 4, color: r.fg });
}

// ── Section 03: 3-Step Volunteer Checklist & Mandatory Legal Footer
const sec3 = makeBox("VERTICAL", { name: "03 · 3-Step Volunteer Checklist", w: INNER_W, gap: 20, noFill: true });
board.appendChild(sec3);
addText(sec3, "03 / VOLUNTEER WORKFLOW — 3 MINUTES FROM TEMPLATE TO POST", {
  font: FONTS.monoBold,
  size: 13,
  ls: 8,
  color: "#1D5B8C",
});

const stepRow = makeBox("HORIZONTAL", { w: INNER_W, gap: 40, noFill: true });
sec3.appendChild(stepRow);
const steps = [
  {
    num: "STEP 01",
    title: "Duplicate Template Frame on Page 04",
    desc: "Pick the matching 1080×1350 Auto-Layout template (Ta'lim, Recap, Quote, Kids, Wegweiser, Muslimah, Eid, Familienlager, or QR-Spende) and press Cmd+D.",
    bg: "#FAF9F6",
    accent: "#1D5B8C",
  },
  {
    num: "STEP 02",
    title: "Swap DE Headline & ID Subtitle",
    desc: "Keep German on top (Plus Jakarta Sans ExtraBold) and warm Indonesian context underneath. Never detach spacing or add unapproved fonts.",
    bg: "#FAF9F6",
    accent: "#1D5B8C",
  },
  {
    num: "STEP 03",
    title: "Preflight & Export PNG @2x",
    desc: "Verify 64px margins, confirm UID CHE-382.914.820 & IBAN CH89 0900 0000 6049 6610 7 on donation posts, and export 2× PNG (2160×2700px).",
    bg: "#F3E8DF",
    accent: "#8C5327",
  },
];
for (const s of steps) {
  const sc = makeBox("VERTICAL", {
    w: 464,
    pad: 28,
    gap: 12,
    bg: s.bg,
    border: s.accent === "#8C5327" ? "#8C5327" : "#D5CFC4",
    bw: s.accent === "#8C5327" ? 2 : 1,
    radius: 14,
  });
  stepRow.appendChild(sc);
  addText(sc, s.num, { font: FONTS.monoBold, size: 13, ls: 6, color: s.accent });
  addText(sc, s.title, { font: FONTS.sansBold, size: 22, color: "#132435", w: 408 });
  addText(sc, s.desc, { font: FONTS.sansReg, size: 16, lh: 24, color: "#4A5E72", w: 408 });
}

// Mandatory Civic Legal & Banking Footer
const legalBar = makeBox("VERTICAL", {
  name: "Mandatory Legal & Banking Footer",
  w: INNER_W,
  px: 36,
  py: 24,
  gap: 8,
  bg: "#132435",
  radius: 14,
  alignCross: "CENTER",
});
board.appendChild(legalBar);
addText(
  legalBar,
  'Verein "Percikan Iman" / Verein Percikan Iman Schweiz  ·  Schweizer Verein gemäss Art. 60–79 ZGB  ·  8000 Zürich, Schweiz',
  { font: FONTS.sansBold, size: 16, lh: 24, color: "#FFFFFF", w: INNER_W - 72, align: "CENTER" }
);
addText(
  legalBar,
  "UID: CHE-382.914.820  ·  PostFinance IBAN: CH89 0900 0000 6049 6610 7  ·  info@percikaniman.ch  ·  @verein.pi",
  { font: FONTS.monoBold, size: 14, lh: 22, color: "#9CC4E4", w: INNER_W - 72, align: "CENTER" }
);

return {
  pageId: figma.currentPage.id,
  pageName: figma.currentPage.name,
  boardName: board.name,
  boardId: board.id,
  bounds: { x: board.x, y: board.y, width: board.width, height: board.height },
  dontFlyerId: dontFlyer.id,
  doFlyerId: doFlyer.id,
  createdNodeCount: createdNodeIds.length,
  createdNodeIds,
};
