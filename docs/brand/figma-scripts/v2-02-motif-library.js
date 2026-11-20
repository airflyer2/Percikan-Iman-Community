// v2-02-motif-library.js — Verein Percikan Iman Schweiz v2 · Page 02: Modular Motif Library ("Anatomy of the Spark")
// Target: fileKey tJA2fcaYcckLkwHmRGYvf9

const TARGET_PAGE = "02 · Modular Motif Library";
let page = figma.root.children.find((p) => p.name === TARGET_PAGE);
if (!page) {
  page = figma.createPage();
  page.name = TARGET_PAGE;
}
await figma.setCurrentPageAsync(page);

const BOARD_NAME = "02 · Modular Motif Library — Anatomy of the Spark";
const BOARD_W = 1600;
const PAD = 64;
const INNER_W = BOARD_W - PAD * 2; // 1472

for (const child of [...figma.currentPage.children]) {
  if (child.name === BOARD_NAME || child.name.startsWith("Motif / ")) child.remove();
}

const hex = (h) => ({
  r: parseInt(h.slice(1, 3), 16) / 255,
  g: parseInt(h.slice(3, 5), 16) / 255,
  b: parseInt(h.slice(5, 7), 16) / 255,
});
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

const FONTS = {
  sansReg: pickFont(["Plus Jakarta Sans", "Inter"], ["Regular"]),
  sansSemi: pickFont(["Plus Jakarta Sans", "Inter"], ["SemiBold", "Semi Bold", "Bold"]),
  sansBold: pickFont(["Plus Jakarta Sans", "Inter"], ["Bold", "SemiBold"]),
  sansExtra: pickFont(["Plus Jakarta Sans", "Inter"], ["ExtraBold", "Extra Bold", "Bold"]),
  monoReg: pickFont(["JetBrains Mono", "Inter"], ["Regular"]),
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

const addRule = (parent, w, color = "#D5CFC4") => {
  const r = track(figma.createRectangle());
  r.resize(w, 1);
  r.fills = solid(color);
  parent.appendChild(r);
  if (parent.layoutMode && parent.layoutMode !== "NONE") r.layoutSizingHorizontal = "FILL";
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

// ── Build Root Board ────────────────────────────────────────────────────────────
const board = makeBox("VERTICAL", {
  name: BOARD_NAME,
  w: BOARD_W,
  pad: PAD,
  gap: 36,
  bg: "#EAE6DF",
  border: "#D5CFC4",
  bw: 1,
});
board.x = 0;
board.y = 0;
figma.currentPage.appendChild(board);
addCrosshair(board, 24, 24, "#B8B0A2", 14);
addCrosshair(board, BOARD_W - 38, 24, "#B8B0A2", 14);

const header = makeBox("VERTICAL", { name: "Board Header", w: INNER_W, gap: 14, py: 16, noFill: true });
board.appendChild(header);
const topMeta = makeBox("HORIZONTAL", { w: INNER_W, alignMain: "SPACE_BETWEEN", alignCross: "CENTER", noFill: true });
header.appendChild(topMeta);
addText(topMeta, "VEREIN PERCIKAN IMAN · SCHWEIZ", { font: FONTS.monoBold, size: 13, ls: 8, upper: true, color: "#1D5B8C" });
addText(topMeta, '02 / 05 · MODULAR MOTIF LIBRARY ("ANATOMY OF THE SPARK")', { font: FONTS.monoReg, size: 12, ls: 6, upper: true, color: "#4A5E72" });
addRule(header, INNER_W);
addText(header, 'Modular Motif Library — "Anatomy of the Spark"', {
  font: FONTS.sansExtra,
  size: 44,
  lh: 50,
  ls: -2.5,
  color: "#132435",
  w: INNER_W,
});
addText(
  header,
  "Mathematical breakdown of the faceted diamond spark + 5 reusable Figma Components + 3 seamless pattern editions across Limestone Greige, Ice-Blue Mist & Deep Slate-Blue.",
  { font: FONTS.sansReg, size: 17, lh: 26, color: "#4A5E72", w: INNER_W }
);

// ── Section 02.1: Anatomy of the Spark (4 Geometric Construction Cards) ─────────
const secAnat = makeBox("VERTICAL", { name: "Section 02.1 · Geometry Anatomy", w: INNER_W, gap: 16, noFill: true });
board.appendChild(secAnat);
addText(secAnat, "02.1 · MATHEMATICAL GEOMETRY CONSTRUCTION", { font: FONTS.monoBold, size: 13, ls: 8, color: "#1D5B8C" });

const anatRow = makeBox("HORIZONTAL", { w: INNER_W, gap: 24, noFill: true });
secAnat.appendChild(anatRow);
const anatW = Math.floor((INNER_W - 72) / 4); // 350

const ANATOMY_SPECS = [
  {
    tag: "01 · 45° TEARDROP FACET",
    title: "Diamond Lattice Basis",
    desc: "Derived from the 16 upper diamonds of public/logo.svg on a 45° structural axis.",
    svg: `<svg width="302" height="160" viewBox="0 0 302 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="302" height="160" rx="8" fill="#EAE6DF" stroke="#D5CFC4"/>
      <path d="M30 80H272M151 12V148M75 20L227 140M227 20L75 140" stroke="#B8B0A2" stroke-dasharray="3 3"/>
      <polygon points="151,26 196,80 151,134 106,80" fill="#1D5B8C" fill-opacity="0.14" stroke="#1D5B8C" stroke-width="1.5"/>
      <polygon points="151,46 179,80 151,114 123,80" fill="#5B7E9E" fill-opacity="0.24" stroke="#5B7E9E" stroke-width="1.2"/>
      <polygon points="151,64 165,80 151,96 137,80" fill="#8C5327"/>
    </svg>`,
  },
  {
    tag: "02 · NUSANTARA KAWUNG",
    title: "Quad-Petal Symmetry",
    desc: "240×240 seamless cell echoing Javanese batik kawung in crisp Swiss linework.",
    svg: `<svg width="302" height="160" viewBox="0 0 302 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="302" height="160" rx="8" fill="#EAE6DF" stroke="#D5CFC4"/>
      <circle cx="151" cy="80" r="56" stroke="#D5CFC4" stroke-dasharray="4 4"/>
      <polygon points="151,22 166,65 209,80 166,95 151,138 136,95 93,80 136,65" fill="#1D5B8C" fill-opacity="0.12" stroke="#1D5B8C" stroke-width="1.5"/>
      <polygon points="151,46 160,71 185,80 160,89 151,114 142,89 117,80 142,71" fill="#8C5327" fill-opacity="0.2" stroke="#8C5327" stroke-width="1.2"/>
      <circle cx="151" cy="40" r="3" fill="#8C5327"/><circle cx="191" cy="80" r="3" fill="#8C5327"/>
      <circle cx="151" cy="120" r="3" fill="#8C5327"/><circle cx="111" cy="80" r="3" fill="#8C5327"/>
    </svg>`,
  },
  {
    tag: "03 · SWISS + CROSSHAIR",
    title: "Registration Anchor",
    desc: "60px hairline intersections marked by Steel + crosshairs & Roasted Teak core.",
    svg: `<svg width="302" height="160" viewBox="0 0 302 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="302" height="160" rx="8" fill="#EAE6DF" stroke="#D5CFC4"/>
      <path d="M76 0V160M151 0V160M226 0V160M0 40H302M0 80H302M0 120H302" stroke="#D5CFC4"/>
      <path d="M151 56V104M127 80H175" stroke="#1D5B8C" stroke-width="2"/>
      <path d="M76 32V48M68 40H84 M226 32V48M218 40H234 M76 112V128M68 120H84 M226 112V128M218 120H234" stroke="#5B7E9E" stroke-width="1.5"/>
      <circle cx="151" cy="80" r="5" fill="#8C5327"/>
    </svg>`,
  },
  {
    tag: "04 · TOPOGRAPHIC CONTOUR",
    title: "Alpine × Archipelago Wave",
    desc: "Continuous Bézier elevation curves uniting Swiss ridges & ocean swells.",
    svg: `<svg width="302" height="160" viewBox="0 0 302 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="302" height="160" rx="8" fill="#DFE8F0" stroke="#5B7E9E" stroke-opacity="0.4"/>
      <path d="M0 54 C75 24, 215 84, 302 44" stroke="#1D5B8C" stroke-width="1.6"/>
      <path d="M0 84 C85 52, 210 116, 302 74" stroke="#5B7E9E" stroke-width="1.4"/>
      <path d="M0 116 C95 86, 205 144, 302 104" stroke="#8C5327" stroke-width="1.5"/>
      <circle cx="212" cy="86" r="4" fill="#8C5327"/>
    </svg>`,
  },
];

for (const an of ANATOMY_SPECS) {
  const card = makeBox("VERTICAL", { w: anatW, pad: 24, gap: 12, bg: "#FAF9F6", border: "#D5CFC4", bw: 1, radius: 12 });
  anatRow.appendChild(card);
  const svgN = track(figma.createNodeFromSvg(an.svg));
  card.appendChild(svgN);
  svgN.resize(anatW - 48, 160);
  addText(card, an.tag, { font: FONTS.monoBold, size: 11, ls: 6, color: "#8C5327" });
  addText(card, an.title, { font: FONTS.sansBold, size: 16, color: "#132435", w: anatW - 48 });
  addText(card, an.desc, { font: FONTS.sansReg, size: 12.5, lh: 18, color: "#4A5E72", w: anatW - 48 });
}

// ── Section 02.2: 5 Reusable Figma Motif Components ────────────────────────────
const secComps = makeBox("VERTICAL", { name: "Section 02.2 · 5 Reusable Figma Components", w: INNER_W, gap: 18, noFill: true });
board.appendChild(secComps);
addText(secComps, "02.2 · 5 REUSABLE FIGMA COMPONENTS (READY IN ASSETS PANEL)", { font: FONTS.monoBold, size: 13, ls: 8, color: "#1D5B8C" });

const compRow = makeBox("HORIZONTAL", { w: INNER_W, gap: 24, noFill: true });
secComps.appendChild(compRow);

// Helper: wrap a real COMPONENT inside a documented showcase card
const makeCompCard = (parent, w, kicker, desc, buildCompFn) => {
  const card = makeBox("VERTICAL", { name: `Showcase · ${kicker}`, w, pad: 24, gap: 14, bg: "#FAF9F6", border: "#D5CFC4", bw: 1, radius: 12 });
  parent.appendChild(card);
  addText(card, kicker, { font: FONTS.monoBold, size: 11, ls: 6, color: "#1D5B8C" });
  const stage = makeBox("VERTICAL", { w: w - 48, h: 140, bg: "#F4F2ED", border: "#D5CFC4", radius: 8, alignMain: "CENTER", alignCross: "CENTER" });
  card.appendChild(stage);
  const comp = buildCompFn(stage);
  addText(card, desc, { font: FONTS.sansReg, size: 12, lh: 17, color: "#4A5E72", w: w - 48 });
  return comp;
};

const cwSmall = 264;
const cwWide = Math.floor((INNER_W - cwSmall * 3 - 24 * 4) / 2); // ~292 -> adjust cleanly: 5 equal cards!
const cw5 = Math.floor((INNER_W - 20 * 4) / 5); // 278

const compIds = {};

// 1. Motif / Corner Stamp
compIds.cornerStamp = makeCompCard(
  compRow,
  cw5,
  "COMPONENT 01 · CORNER STAMP",
  "Anchor in top/bottom flyer corners (64px margin marker).",
  (stage) => {
    const c = track(figma.createComponent());
    c.name = "Motif / Corner Stamp";
    c.description = "Swiss + registration crosshair paired with quarter-kawung arc & Roasted Teak focal dot.";
    c.resize(64, 64);
    c.fills = [];
    const svg = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 44 L44 0 L14 14 Z" fill="#1D5B8C" fill-opacity="0.16" stroke="#1D5B8C" stroke-width="1.2"/>
      <path d="M16 4V28M4 16H28" stroke="#5B7E9E" stroke-width="1.8"/>
      <circle cx="16" cy="16" r="3.5" fill="#8C5327"/>
    </svg>`;
    const n = track(figma.createNodeFromSvg(svg));
    c.appendChild(n);
    n.resize(64, 64);
    stage.appendChild(c);
    return c.id;
  }
);

// 2. Motif / Kawung-Facet Divider
compIds.kawungDivider = makeCompCard(
  compRow,
  cw5,
  "COMPONENT 02 · KAWUNG DIVIDER",
  "Horizontal section divider separating DE headline & ID body.",
  (stage) => {
    const c = track(figma.createComponent());
    c.name = "Motif / Kawung-Facet Divider";
    c.description = "1px Pebble Border rule centered with Cobalt, Steel & Roasted Teak diamond cluster.";
    c.resize(210, 32);
    c.fills = [];
    const svg = `<svg width="210" height="32" viewBox="0 0 210 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="16" x2="78" y2="16" stroke="#D5CFC4" stroke-width="1.5"/>
      <polygon points="105,3 118,16 105,29 92,16" fill="#DFE8F0" stroke="#1D5B8C" stroke-width="1.5"/>
      <polygon points="105,9 112,16 105,23 98,16" fill="#8C5327"/>
      <circle cx="84" cy="16" r="2.5" fill="#5B7E9E"/><circle cx="126" cy="16" r="2.5" fill="#5B7E9E"/>
      <line x1="132" y1="16" x2="210" y2="16" stroke="#D5CFC4" stroke-width="1.5"/>
    </svg>`;
    const n = track(figma.createNodeFromSvg(svg));
    c.appendChild(n);
    n.resize(210, 32);
    stage.appendChild(c);
    return c.id;
  }
);

// 3. Motif / Topographic Ribbon
compIds.topoRibbon = makeCompCard(
  compRow,
  cw5,
  "COMPONENT 03 · TOPO RIBBON",
  "Alpine contour ribbon for Wegweiser headers & photo frames.",
  (stage) => {
    const c = track(figma.createComponent());
    c.name = "Motif / Topographic Ribbon";
    c.description = "Layered Alpine/Archipelago topographic waves in Cobalt, Steel & Roasted Teak.";
    c.resize(210, 88);
    c.fills = [];
    const svg = `<svg width="210" height="88" viewBox="0 0 210 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="210" height="88" rx="6" fill="#DFE8F0"/>
      <path d="M0 28 C55 8, 145 48, 210 22" stroke="#1D5B8C" stroke-width="1.6"/>
      <path d="M0 48 C65 28, 145 68, 210 42" stroke="#5B7E9E" stroke-width="1.4"/>
      <path d="M0 68 C75 48, 145 86, 210 62" stroke="#8C5327" stroke-width="1.6"/>
    </svg>`;
    const n = track(figma.createNodeFromSvg(svg));
    c.appendChild(n);
    n.resize(210, 88);
    stage.appendChild(c);
    return c.id;
  }
);

// 4. Motif / Teak Signpost Badge
compIds.teakSignpost = makeCompCard(
  compRow,
  cw5,
  "COMPONENT 04 · TEAK SIGNPOST",
  "Swiss trail signpost CTA / chapter badge in Roasted Teak #8C5327.",
  (stage) => {
    const c = track(figma.createComponent());
    c.name = "Motif / Teak Signpost Badge";
    c.description = "Auto-Layout Swiss trail signpost badge in Roasted Teak (#8C5327) with Crisp Ivory typography.";
    c.layoutMode = "HORIZONTAL";
    c.primaryAxisSizingMode = "AUTO";
    c.counterAxisSizingMode = "AUTO";
    c.paddingLeft = 16;
    c.paddingRight = 16;
    c.paddingTop = 10;
    c.paddingBottom = 10;
    c.itemSpacing = 10;
    c.counterAxisAlignItems = "CENTER";
    c.fills = solid("#8C5327");
    c.cornerRadius = 6;
    addText(c, "WEGWEISER · CH →", { font: FONTS.monoBold, size: 12, ls: 6, color: "#FAF9F6" });
    stage.appendChild(c);
    return c.id;
  }
);

// 5. Motif / Spark Program Seal
compIds.programSeal = makeCompCard(
  compRow,
  cw5,
  "COMPONENT 05 · PROGRAM SEAL",
  "Official Greige/Cobalt/Teak stamp for certificates & flyers.",
  (stage) => {
    const c = track(figma.createComponent());
    c.name = "Motif / Spark Program Seal";
    c.description = "Circular civic seal combining Swiss cardinal ticks and Cobalt/Roasted Teak faceted star.";
    c.resize(104, 104);
    c.fills = [];
    const svg = `<svg width="104" height="104" viewBox="0 0 104 104" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="52" cy="52" r="48" fill="#FAF9F6" stroke="#1D5B8C" stroke-width="1.8"/>
      <circle cx="52" cy="52" r="40" fill="none" stroke="#D5CFC4" stroke-dasharray="3 3"/>
      <path d="M52 8V14M52 90V96M8 52H14M90 52H96" stroke="#8C5327" stroke-width="2"/>
      <polygon points="52,24 60,44 80,52 60,60 52,80 44,60 24,52 44,44" fill="#1D5B8C" fill-opacity="0.16" stroke="#1D5B8C" stroke-width="1.5"/>
      <polygon points="52,38 58,52 52,66 46,52" fill="#8C5327"/>
    </svg>`;
    const n = track(figma.createNodeFromSvg(svg));
    c.appendChild(n);
    n.resize(104, 104);
    stage.appendChild(c);
    return c.id;
  }
);

// ── Section 02.3: 3 Seamless Pattern Editions ───────────────────────────────────
const secPat = makeBox("VERTICAL", { name: "Section 02.3 · 3 Seamless Pattern Editions", w: INNER_W, gap: 18, noFill: true });
board.appendChild(secPat);
addText(secPat, "02.3 · 3 SEAMLESS VECTOR PATTERN EDITIONS (1:1 UNDISTORTED GEOMETRY)", { font: FONTS.monoBold, size: 13, ls: 8, color: "#1D5B8C" });

const tileUnit = (p) => `
  <g stroke="${p.grid}" stroke-opacity="${p.gridOp}" stroke-width="0.9">
    <line x1="60" y1="0" x2="60" y2="240"/><line x1="120" y1="0" x2="120" y2="240"/><line x1="180" y1="0" x2="180" y2="240"/>
    <line x1="0" y1="60" x2="240" y2="60"/><line x1="0" y1="120" x2="240" y2="120"/><line x1="0" y1="180" x2="240" y2="180"/>
  </g>
  <g fill="none" stroke="${p.cont}" stroke-opacity="${p.contOp}" stroke-width="1.1">
    <path d="M 0 36 C 60 12, 180 60, 240 36"/><path d="M 0 156 C 60 132, 180 180, 240 156"/>
    <path d="M 36 0 C 12 60, 60 180, 36 240"/><path d="M 156 0 C 132 60, 180 180, 156 240"/>
  </g>
  <g transform="translate(120 120)">
    <polygon points="0,-46 14,-14 46,0 14,14 0,46 -14,14 -46,0 -14,-14" fill="${p.out}" fill-opacity="${p.outF}" stroke="${p.out}" stroke-opacity="${p.outS}"/>
    <polygon points="0,-24 9,-9 24,0 9,9 0,24 -9,9 -24,0 -9,-9" fill="${p.inn}" fill-opacity="${p.innF}" stroke="${p.inn}" stroke-opacity="${p.innS}"/>
    <polygon points="0,-10 10,0 0,10 -10,0" fill="${p.core}" fill-opacity="${p.coreF}" stroke="${p.out}" stroke-opacity="${p.outS}"/>
  </g>
  <g fill="${p.out}" fill-opacity="${p.outF}" stroke="${p.out}" stroke-opacity="${p.outS}">
    <path d="M 0 0 L 46 0 L 14 14 L 0 46 Z"/><path d="M 240 0 L 240 46 L 226 14 L 194 0 Z"/>
    <path d="M 0 240 L 0 194 L 14 226 L 46 240 Z"/><path d="M 240 240 L 194 240 L 226 226 L 240 194 Z"/>
  </g>
  <g stroke="${p.cross}" stroke-opacity="${p.crossOp}" stroke-width="1.3">
    <line x1="55" y1="60" x2="65" y2="60"/><line x1="60" y1="55" x2="60" y2="65"/>
    <line x1="175" y1="60" x2="185" y2="60"/><line x1="180" y1="55" x2="180" y2="65"/>
    <line x1="55" y1="180" x2="65" y2="180"/><line x1="60" y1="175" x2="60" y2="185"/>
    <line x1="175" y1="180" x2="185" y2="180"/><line x1="180" y1="175" x2="180" y2="185"/>
  </g>
`;

const PALS = [
  {
    key: "greige",
    kicker: "EDITION 01 · LIMESTONE GREIGE (#EAE6DF)",
    title: "Limestone Greige — Everyday Atelier",
    desc: "Primary surface for Ta'lim flyers, Statuten covers & Wegweiser interior pages.",
    bg: "#EAE6DF", grid: "#D5CFC4", gridOp: 1, cont: "#5B7E9E", contOp: 0.24,
    out: "#1D5B8C", outF: 0.08, outS: 0.28, inn: "#8C5327", innF: 0.1, innS: 0.3,
    core: "#8C5327", coreF: 0.24, cross: "#1D5B8C", crossOp: 0.4,
  },
  {
    key: "ice-mist",
    kicker: "EDITION 02 · ICE-BLUE MIST (#DFE8F0)",
    title: "Ice-Blue Mist — Kinder & Civic Info",
    desc: "Used for Pengajian Anak, Swiss school dispensations & educational handbooks.",
    bg: "#DFE8F0", grid: "#FAF9F6", gridOp: 0.75, cont: "#1D5B8C", contOp: 0.22,
    out: "#1D5B8C", outF: 0.09, outS: 0.32, inn: "#8C5327", innF: 0.12, innS: 0.34,
    core: "#5B7E9E", coreF: 0.28, cross: "#1D5B8C", crossOp: 0.45,
  },
  {
    key: "slate-teak",
    kicker: "EDITION 03 · DEEP SLATE-BLUE × TEAK (#132435 + #8C5327)",
    title: "Deep Slate-Blue × Roasted Teak — Festtage & Cover",
    desc: "Replaces Jade completely: Ramadan/Eid greetings, Zakat campaigns & Wegweiser cover.",
    bg: "#132435", grid: "#5B7E9E", gridOp: 0.24, cont: "#9CC4E4", contOp: 0.3,
    out: "#9CC4E4", outF: 0.1, outS: 0.36, inn: "#8C5327", innF: 0.26, innS: 0.75,
    core: "#F3E8DF", coreF: 0.42, cross: "#8C5327", crossOp: 0.75,
  },
];

const patRow = makeBox("HORIZONTAL", { w: INNER_W, gap: 28, noFill: true });
secPat.appendChild(patRow);
const pw3 = Math.floor((INNER_W - 56) / 3); // 472

for (const pal of PALS) {
  const card = makeBox("VERTICAL", { w: pw3, bg: "#FAF9F6", border: "#D5CFC4", bw: 1, radius: 12, clip: true });
  patRow.appendChild(card);
  const unit = tileUnit(pal);
  let tiles = "";
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) tiles += `<g transform="translate(${c * 240} ${r * 240})">${unit}</g>`;
  const svgStr = `<svg width="${pw3}" height="315" viewBox="0 0 720 480" xmlns="http://www.w3.org/2000/svg"><rect width="720" height="480" fill="${pal.bg}"/>${tiles}</svg>`;
  const pn = track(figma.createNodeFromSvg(svgStr));
  pn.name = `Pattern Tile · ${pal.key}`;
  card.appendChild(pn);
  pn.resize(pw3, 315);

  const meta = makeBox("VERTICAL", { w: pw3, pad: 22, gap: 6, bg: "#FAF9F6" });
  card.appendChild(meta);
  addText(meta, pal.kicker, { font: FONTS.monoBold, size: 11, ls: 6, color: "#1D5B8C", w: pw3 - 44 });
  addText(meta, pal.title, { font: FONTS.sansBold, size: 16, lh: 22, color: "#132435", w: pw3 - 44 });
  addText(meta, pal.desc, { font: FONTS.sansReg, size: 12.5, lh: 18, color: "#4A5E72", w: pw3 - 44 });
}

return {
  pageName: page.name,
  pageId: page.id,
  boardId: board.id,
  bounds: { x: board.x, y: board.y, width: board.width, height: board.height },
  componentIds: compIds,
  createdNodeIds,
};
