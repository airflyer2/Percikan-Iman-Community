// v2-01-foundations.js — Verein Percikan Iman Schweiz v2 (Greige + Blue Undertones + Roasted Teak)
// Target: fileKey tJA2fcaYcckLkwHmRGYvf9 · Page 01 · Foundations & Variables

const PAGE_NAMES = [
  "01 · Foundations & Variables",
  "02 · Modular Motif Library",
  "03 · Logo & Avatar System",
  "04 · Editable IG Templates & 3×3 Grid",
  "05 · Volunteer 3-Min Guardrail",
];

// Ensure all 5 named pages exist cleanly (Page 1 renamed in place)
const firstPage = figma.root.children[0];
firstPage.name = PAGE_NAMES[0];
await figma.setCurrentPageAsync(firstPage);

const pageIds = { [PAGE_NAMES[0]]: firstPage.id };
for (let i = 1; i < PAGE_NAMES.length; i++) {
  let p = figma.root.children.find((node) => node.name === PAGE_NAMES[i]);
  if (!p) {
    p = figma.createPage();
    p.name = PAGE_NAMES[i];
  }
  pageIds[PAGE_NAMES[i]] = p.id;
}

const BOARD_NAME = "01 · Brand Foundations & Tokens (v2)";
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

// Discover verified non-serif fonts ONLY (Plus Jakarta Sans + JetBrains Mono)
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

// ── 1. Create / Sync Variable Collection: Percikan Iman v2 — Greige, Blue & Teak
const COLL_NAME = "Percikan Iman v2 — Greige, Blue & Teak";
const existingColls = await figma.variables.getLocalVariableCollectionsAsync();
let coll = existingColls.find((c) => c.name === COLL_NAME);
if (!coll) {
  coll = figma.variables.createVariableCollection(COLL_NAME);
  coll.renameMode(coll.modes[0].modeId, "v2 Atelier");
}
const modeId = coll.modes[0].modeId;
const existingVars = await Promise.all(coll.variableIds.map((id) => figma.variables.getVariableByIdAsync(id)));
const varByName = new Map(existingVars.filter(Boolean).map((v) => [v.name, v]));

const COLOR_TOKENS = [
  { name: "canvas/limestone-greige", hex: "#EAE6DF", css: "--color-canvas", role: "Limestone Greige", note: "Primary page & flyer ground", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
  { name: "surface/warm-stone", hex: "#F4F2ED", css: "--color-surface-elevated", role: "Warm Stone", note: "Elevated cards & spec panels", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
  { name: "surface/crisp-ivory", hex: "#FAF9F6", css: "--color-surface-ivory", role: "Crisp Ivory", note: "High-contrast panels (QR uses #FFF)", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
  { name: "surface/recessed-greige", hex: "#E1DDD4", css: "--color-surface-subtle", role: "Recessed Greige", note: "Metadata wells & table rows", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
  { name: "border/pebble", hex: "#D5CFC4", css: "--color-border-stone", role: "Pebble Border", note: "1px Swiss structural hairlines", scopes: ["STROKE_COLOR"] },
  { name: "border/stone-strong", hex: "#B8B0A2", css: "--color-border-strong", role: "Strong Stone", note: "+ crosshairs & active borders", scopes: ["STROKE_COLOR"] },
  { name: "ink/slate-blue", hex: "#132435", css: "--color-ink", role: "Slate-Blue Ink", note: "Primary display & dark cards (AAA)", scopes: ["TEXT_FILL", "FRAME_FILL", "SHAPE_FILL"] },
  { name: "ink/steel-muted", hex: "#4A5E72", css: "--color-ink-muted", role: "Steel Muted", note: "ID body & civic captions (AA+)", scopes: ["TEXT_FILL"] },
  { name: "brand/percikan-cobalt", hex: "#1D5B8C", css: "--color-cerulean", role: "Percikan Cobalt", note: "Primary civic accent & DE headers", scopes: ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR"] },
  { name: "brand/cobalt-hover", hex: "#15466E", css: "--color-cerulean-hover", role: "Cobalt Hover", note: "Deep gradient base & hover state", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
  { name: "brand/steel-undertone", hex: "#5B7E9E", css: "--color-steel", role: "Steel Undertone", note: "Architectural contours & secondary blue", scopes: ["FRAME_FILL", "SHAPE_FILL", "STROKE_COLOR"] },
  { name: "brand/ice-mist", hex: "#DFE8F0", css: "--color-cerulean-tint", role: "Ice-Blue Mist", note: "Kinder-Koran & informational fills", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
  { name: "brand/powder-sky", hex: "#9CC4E4", css: "--color-primary-fixed-dim", role: "Powder Sky", note: "Dark #132435/#1D5B8C surfaces ONLY", scopes: ["TEXT_FILL", "SHAPE_FILL"] },
  { name: "pop/roasted-teak", hex: "#8C5327", css: "--color-teak", role: "Roasted Teak", note: "Warm contrasting brown pop & signposts", scopes: ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR"] },
  { name: "pop/teak-deep", hex: "#6F401D", css: "--color-teak-hover", role: "Teak Deep", note: "Hover & pressed brown pop state", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
  { name: "pop/teak-sand", hex: "#F3E8DF", css: "--color-teak-tint", role: "Teak Sand", note: "Muslimah, Zakat & signpost tint", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
];

const colorVarMap = {};
for (const tok of COLOR_TOKENS) {
  let v = varByName.get(tok.name);
  if (!v) v = figma.variables.createVariable(tok.name, coll, "COLOR");
  v.setValueForMode(modeId, rgba(tok.hex, 1));
  v.scopes = tok.scopes;
  v.setVariableCodeSyntax("WEB", `var(${tok.css})`);
  colorVarMap[tok.name] = v;
}

const FLOAT_TOKENS = [
  { name: "space/flyer-safe-zone", val: 64, scopes: ["GAP"], css: "--space-flyer-safe" },
  { name: "space/card-padding", val: 24, scopes: ["GAP"], css: "--space-card-pad" },
  { name: "radius/swiss-card", val: 12, scopes: ["CORNER_RADIUS"], css: "--radius-card" },
  { name: "radius/pill", val: 999, scopes: ["CORNER_RADIUS"], css: "--radius-pill" },
];
const floatVarIds = {};
for (const ft of FLOAT_TOKENS) {
  let v = varByName.get(ft.name);
  if (!v) v = figma.variables.createVariable(ft.name, coll, "FLOAT");
  v.setValueForMode(modeId, ft.val);
  v.scopes = ft.scopes;
  v.setVariableCodeSyntax("WEB", `var(${ft.css})`);
  floatVarIds[ft.name] = v.id;
}

// ── 2. Create / Sync 3-Mode Collection: Card Theme ──────────────────────────────
const THEME_COLL = "Card Theme";
let themeColl = existingColls.find((c) => c.name === THEME_COLL);
if (!themeColl) {
  themeColl = figma.variables.createVariableCollection(THEME_COLL);
  themeColl.renameMode(themeColl.modes[0].modeId, "Limestone Greige");
  themeColl.addMode("Ice-Blue Mist");
  themeColl.addMode("Deep Slate-Blue");
}
const tModes = Object.fromEntries(themeColl.modes.map((m) => [m.name, m.modeId]));
const tExisting = await Promise.all(themeColl.variableIds.map((id) => figma.variables.getVariableByIdAsync(id)));
const tMap = new Map(tExisting.filter(Boolean).map((v) => [v.name, v]));
const THEME_DEFS = [
  { name: "theme/bg", scopes: ["FRAME_FILL"], vals: { "Limestone Greige": "canvas/limestone-greige", "Ice-Blue Mist": "brand/ice-mist", "Deep Slate-Blue": "ink/slate-blue" } },
  { name: "theme/card", scopes: ["FRAME_FILL", "SHAPE_FILL"], vals: { "Limestone Greige": "surface/crisp-ivory", "Ice-Blue Mist": "surface/warm-stone", "Deep Slate-Blue": "brand/percikan-cobalt" } },
  { name: "theme/text-primary", scopes: ["TEXT_FILL"], vals: { "Limestone Greige": "ink/slate-blue", "Ice-Blue Mist": "ink/slate-blue", "Deep Slate-Blue": "surface/crisp-ivory" } },
  { name: "theme/text-muted", scopes: ["TEXT_FILL"], vals: { "Limestone Greige": "ink/steel-muted", "Ice-Blue Mist": "brand/cobalt-hover", "Deep Slate-Blue": "brand/powder-sky" } },
  { name: "theme/accent", scopes: ["FRAME_FILL", "TEXT_FILL", "STROKE_COLOR"], vals: { "Limestone Greige": "brand/percikan-cobalt", "Ice-Blue Mist": "brand/percikan-cobalt", "Deep Slate-Blue": "brand/powder-sky" } },
  { name: "theme/pop", scopes: ["FRAME_FILL", "TEXT_FILL", "SHAPE_FILL"], vals: { "Limestone Greige": "pop/roasted-teak", "Ice-Blue Mist": "pop/roasted-teak", "Deep Slate-Blue": "pop/teak-sand" } },
  { name: "theme/border", scopes: ["STROKE_COLOR"], vals: { "Limestone Greige": "border/pebble", "Ice-Blue Mist": "brand/steel-undertone", "Deep Slate-Blue": "brand/steel-undertone" } },
];
for (const td of THEME_DEFS) {
  let v = tMap.get(td.name);
  if (!v) v = figma.variables.createVariable(td.name, themeColl, "COLOR");
  v.scopes = td.scopes;
  for (const [mName, aliasKey] of Object.entries(td.vals)) {
    if (tModes[mName] && colorVarMap[aliasKey]) {
      v.setValueForMode(tModes[mName], { type: "VARIABLE_ALIAS", id: colorVarMap[aliasKey].id });
    }
  }
}

// ── 3. Create / Sync Local Non-Serif Text Styles (Plus Jakarta Sans + JetBrains Mono)
const existingStyles = await figma.getLocalTextStylesAsync();
const styleByName = new Map(existingStyles.map((s) => [s.name, s]));
const textStyleIds = {};
const TYPE_RAMPS = [
  { name: "Display/Hero Jakarta", font: FONTS.sansExtra, size: 48, lh: 54, ls: -2.5 },
  { name: "Display/Section Jakarta", font: FONTS.sansBold, size: 32, lh: 40, ls: -2 },
  { name: "UI/Headline Jakarta", font: FONTS.sansSemi, size: 22, lh: 30, ls: -0.5 },
  { name: "UI/Body Jakarta", font: FONTS.sansReg, size: 16, lh: 26, ls: 0 },
  { name: "Mono/Micro Kicker", font: FONTS.monoBold, size: 12, lh: 18, ls: 8 },
  { name: "Mono/Legal Tabular", font: FONTS.monoReg, size: 13, lh: 20, ls: 2 },
];
for (const tr of TYPE_RAMPS) {
  let ts = styleByName.get(tr.name);
  if (!ts) ts = figma.createTextStyle();
  ts.name = tr.name;
  ts.fontName = tr.font;
  ts.fontSize = tr.size;
  ts.lineHeight = { value: tr.lh, unit: "PIXELS" };
  ts.letterSpacing = { value: tr.ls, unit: "PERCENT" };
  textStyleIds[tr.name] = ts.id;
}

// ── 4. Build Root Board Frame ───────────────────────────────────────────────────
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

const header = makeBox("VERTICAL", { name: "Board Header", w: INNER_W, gap: 14, py: 18, noFill: true });
board.appendChild(header);

const topMeta = makeBox("HORIZONTAL", { w: INNER_W, alignMain: "SPACE_BETWEEN", alignCross: "CENTER", noFill: true });
header.appendChild(topMeta);
addText(topMeta, "VEREIN PERCIKAN IMAN · SCHWEIZ", { font: FONTS.monoBold, size: 13, ls: 8, upper: true, color: "#1D5B8C" });
addText(topMeta, "01 / 05 · V2 BRAND FOUNDATIONS · BEIGE-GREY + BLUE + ROASTED TEAK", { font: FONTS.monoReg, size: 12, ls: 6, upper: true, color: "#4A5E72" });
addRule(header, INNER_W);

addText(header, "Brand Foundations & Design Tokens (v2)", {
  font: FONTS.sansExtra,
  size: 46,
  lh: 52,
  ls: -2.5,
  color: "#132435",
  w: INNER_W,
});
addText(
  header,
  "Swiss Civic Atelier × Archipelago Nusantara — Limestone Greige grounds (#EAE6DF), Cobalt & Steel Blue clarity (#1D5B8C / #5B7E9E), Roasted Teak warm pop (#8C5327), and strictly 2 non-serif fonts.",
  { font: FONTS.sansReg, size: 18, lh: 28, color: "#4A5E72", w: INNER_W }
);

// ── Section 1: 16 Color Token Swatches (bound to variables) ─────────────────────
const secColors = makeBox("VERTICAL", { name: "Section 01.1 · 16 Color Tokens", w: INNER_W, gap: 18, noFill: true });
board.appendChild(secColors);

const s1Head = makeBox("HORIZONTAL", { w: INNER_W, alignMain: "SPACE_BETWEEN", alignCross: "CENTER", noFill: true });
secColors.appendChild(s1Head);
addText(s1Head, "01.1 · LOCKED V2 PALETTE (16 TOKENS + 3-MODE THEME COLLECTION)", { font: FONTS.monoBold, size: 13, ls: 8, upper: true, color: "#1D5B8C" });
addText(s1Head, "BOUND TO: PERCIKAN IMAN V2 — GREIGE, BLUE & TEAK", { font: FONTS.monoReg, size: 12, ls: 4, upper: true, color: "#8C5327" });

const renderSwatchRow = (tokens, cols) => {
  const gap = 16;
  const cw = Math.floor((INNER_W - gap * (cols - 1)) / cols);
  const row = makeBox("HORIZONTAL", { w: INNER_W, gap, noFill: true });
  secColors.appendChild(row);
  for (const tok of tokens) {
    const card = makeBox("VERTICAL", {
      name: `Swatch · ${tok.role}`,
      w: cw,
      bg: "#FAF9F6",
      border: "#D5CFC4",
      bw: 1,
      radius: 10,
      clip: true,
    });
    row.appendChild(card);

    const chip = track(figma.createRectangle());
    chip.name = tok.name;
    chip.resize(cw, 84);
    const bound = figma.variables.setBoundVariableForPaint({ type: "SOLID", color: hex(tok.hex) }, "color", colorVarMap[tok.name]);
    chip.fills = [bound];
    card.appendChild(chip);
    chip.layoutSizingHorizontal = "FILL";

    const info = makeBox("VERTICAL", { w: cw, pad: 12, gap: 4, bg: "#FAF9F6" });
    card.appendChild(info);
    addText(info, tok.role, { font: FONTS.sansBold, size: 13, lh: 18, color: "#132435", w: cw - 24 });
    addText(info, tok.hex, { font: FONTS.monoBold, size: 11, lh: 15, color: "#1D5B8C", w: cw - 24 });
    addText(info, tok.note, { font: FONTS.sansReg, size: 11, lh: 15, color: "#4A5E72", w: cw - 24 });
  }
};

renderSwatchRow(COLOR_TOKENS.slice(0, 8), 8);
renderSwatchRow(COLOR_TOKENS.slice(8, 16), 8);

const guardBanner = makeBox("HORIZONTAL", {
  name: "Strict v2 Guardrail",
  w: INNER_W,
  px: 20,
  py: 14,
  gap: 16,
  bg: "#F3E8DF",
  border: "#8C5327",
  bw: 1,
  radius: 8,
  alignCross: "CENTER",
});
secColors.appendChild(guardBanner);
addText(guardBanner, "V2 STRICT RULE", { font: FONTS.monoBold, size: 11, ls: 8, upper: true, color: "#8C5327" });
addText(
  guardBanner,
  "ZERO Serif/script fonts, ZERO off-brand green/jade tones, ZERO pastel purple/orange/pink. Strictly Plus Jakarta Sans + JetBrains Mono. Pure #FFFFFF is reserved exclusively for the SIX QR-Rechnung quiet zone & reverse logos.",
  { font: FONTS.sansSemi, size: 13, lh: 20, color: "#132435", w: INNER_W - 220 }
);

// ── Section 2: Strictly 2 Non-Serif Typography Specimens ────────────────────────
const secType = makeBox("VERTICAL", { name: "Section 01.2 · 2 Non-Serif Typography", w: INNER_W, gap: 16, noFill: true });
board.appendChild(secType);
addText(secType, "01.2 · STRICTLY 2 NON-SERIF TYPEFACES (PLUS JAKARTA SANS + JETBRAINS MONO)", { font: FONTS.monoBold, size: 13, ls: 8, upper: true, color: "#1D5B8C" });

const typeRow = makeBox("HORIZONTAL", { w: INNER_W, gap: 24, noFill: true });
secType.appendChild(typeRow);
const colW2 = Math.floor((INNER_W - 24) / 2); // 724

const typeCards = [
  {
    tag: "01 · DISPLAY, UI & BILINGUAL GROTESK",
    fam: `Plus Jakarta Sans (${FONTS.sansExtra.style} / ${FONTS.sansBold.style} / ${FONTS.sansSemi.style} / ${FONTS.sansReg.style})`,
    sample: "Orientierung für Muslimische Familien in der Schweiz",
    sFont: FONTS.sansExtra,
    sSize: 36,
    sLh: 42,
    sLs: -2.5,
    sub: "Tight display tracking (-0.025em) replaces serif completely for authoritative Swiss headlines alongside warm Bahasa Indonesia subtitles.",
    pill: "Weights: Regular · Medium · SemiBold · Bold · ExtraBold · Italic",
  },
  {
    tag: "02 · CIVIC METADATA & TABULAR MONO",
    fam: `JetBrains Mono (${FONTS.monoBold.style} / ${FONTS.monoMed.style} / ${FONTS.monoReg.style})`,
    sample: "UID CHE-382.914.820\nIBAN CH89 0900 0000 6049 6610 7",
    sFont: FONTS.monoBold,
    sSize: 24,
    sLh: 34,
    sLs: 2,
    sub: "Tabular numerals & uppercase micro-kickers (+0.08em) for dates (14.05.2026), CHF 5'370.00, Swiss ZGB codes & chapter badges.",
    pill: "Rule: Schweizer Hochdeutsch ('ss', never 'ß') · Clean UTF-8 only",
  },
];

for (const tc of typeCards) {
  const c = makeBox("VERTICAL", { w: colW2, pad: 28, gap: 14, bg: "#FAF9F6", border: "#D5CFC4", bw: 1, radius: 12 });
  typeRow.appendChild(c);
  addText(c, tc.tag, { font: FONTS.monoBold, size: 11, ls: 8, color: "#8C5327" });
  addText(c, tc.fam, { font: FONTS.sansBold, size: 15, lh: 22, color: "#132435", w: colW2 - 56 });
  addRule(c, colW2 - 56, "#E1DDD4");
  addText(c, tc.sample, { font: tc.sFont, size: tc.sSize, lh: tc.sLh, ls: tc.sLs, color: "#132435", w: colW2 - 56 });
  addText(c, tc.sub, { font: FONTS.sansReg, size: 14, lh: 21, color: "#4A5E72", w: colW2 - 56 });
  const p = makeBox("HORIZONTAL", { w: colW2 - 56, px: 14, py: 9, bg: "#E1DDD4", radius: 6 });
  c.appendChild(p);
  addText(p, tc.pill, { font: FONTS.monoMed, size: 11, color: "#132435", w: colW2 - 84 });
}

// ── Section 3: Grid Blueprint + Dual-Track Bilingual & Legal Block ──────────────
const secBottom = makeBox("HORIZONTAL", { name: "Section 01.3 · Grid & Legal", w: INNER_W, gap: 24, noFill: true });
board.appendChild(secBottom);

const gridCard = makeBox("VERTICAL", { w: colW2, pad: 28, gap: 16, bg: "#FAF9F6", border: "#D5CFC4", bw: 1, radius: 12 });
secBottom.appendChild(gridCard);
addText(gridCard, "01.3 · SWISS HAIRLINE GRID & + REGISTRATION SYSTEM", { font: FONTS.monoBold, size: 12, ls: 8, color: "#1D5B8C" });
const gridSvg = `<svg width="668" height="210" viewBox="0 0 668 210" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="668" height="210" rx="8" fill="#EAE6DF" stroke="#D5CFC4"/>
  <path d="M167 0V210M334 0V210M501 0V210M0 52H668M0 105H668M0 158H668" stroke="#D5CFC4" stroke-width="1"/>
  <rect x="24" y="20" width="620" height="170" stroke="#1D5B8C" stroke-opacity="0.4" stroke-dasharray="4 4"/>
  <path d="M0 172 C160 124, 360 192, 668 138" stroke="#1D5B8C" stroke-opacity="0.28" stroke-width="1.5"/>
  <path d="M0 190 C190 150, 410 202, 668 164" stroke="#8C5327" stroke-opacity="0.26" stroke-width="1.3"/>
  <path d="M24 14V26M18 20H30 M644 14V26M638 20H650 M24 184V196M18 190H30 M644 184V196M638 190H650 M334 99V111M328 105H340" stroke="#1D5B8C" stroke-width="1.5"/>
  <circle cx="334" cy="105" r="3" fill="#8C5327"/>
</svg>`;
const gNode = track(figma.createNodeFromSvg(gridSvg));
gridCard.appendChild(gNode);
gNode.resize(668, 210);
addText(
  gridCard,
  "Every template integrates Modular Motifs (Corner Stamp, Kawung-Facet Divider, Topographic Ribbon, Teak Signpost) over 1px #D5CFC4 hairlines and 64px safe margins.",
  { font: FONTS.sansReg, size: 13, lh: 20, color: "#4A5E72", w: colW2 - 56 }
);

const legalPanel = makeBox("VERTICAL", { w: colW2, pad: 28, gap: 14, bg: "#FAF9F6", border: "#D5CFC4", bw: 1, radius: 12 });
secBottom.appendChild(legalPanel);
addText(legalPanel, "01.4 · DUAL-TRACK BILINGUAL (DE + ID) & LOCKED LEGAL BLOCK", { font: FONTS.monoBold, size: 12, ls: 8, color: "#1D5B8C" });

const tDe = makeBox("VERTICAL", { w: colW2 - 56, pad: 14, gap: 4, bg: "#DFE8F0", radius: 8 });
legalPanel.appendChild(tDe);
addText(tDe, "TRACK 1 (DE) — CIVIC / STRUCTURAL LAYER", { font: FONTS.monoBold, size: 11, ls: 6, color: "#1D5B8C" });
addText(tDe, "Headlines, dates, venues, Swiss school/authority notices & Art. 60–79 ZGB.", { font: FONTS.sansMed, size: 13, color: "#132435", w: colW2 - 84 });

const tId = makeBox("VERTICAL", { w: colW2 - 56, pad: 14, gap: 4, bg: "#F3E8DF", radius: 8 });
legalPanel.appendChild(tId);
addText(tId, "TRACK 2 (ID) — WARM COMMUNITY LAYER", { font: FONTS.monoBold, size: 11, ls: 6, color: "#8C5327" });
addText(tId, "Invitations, Islamic guidance, silaturahmi & family notes in Bahasa Indonesia.", { font: FONTS.sansMed, size: 13, color: "#132435", w: colW2 - 84 });

const legalBox = makeBox("VERTICAL", { w: colW2 - 56, pad: 16, gap: 4, bg: "#132435", radius: 8 });
legalPanel.appendChild(legalBox);
addText(legalBox, "VERBATIM CREDENTIALS (ALL TEMPLATES & DONATION CARDS)", { font: FONTS.monoBold, size: 11, ls: 6, color: "#9CC4E4" });
addText(
  legalBox,
  'Verein "Percikan Iman" · Schweizer Verein gemäss Art. 60–79 ZGB\n8000 Zürich, Schweiz · UID: CHE-382.914.820 · info@percikaniman.ch · @verein.pi\nPostFinance IBAN: CH89 0900 0000 6049 6610 7',
  { font: FONTS.monoReg, size: 12, lh: 19, color: "#FAF9F6", w: colW2 - 88 }
);

return {
  pageName: firstPage.name,
  pageId: firstPage.id,
  pageIds,
  boardId: board.id,
  bounds: { x: board.x, y: board.y, width: board.width, height: board.height },
  collectionId: coll.id,
  themeCollectionId: themeColl.id,
  textStyleIds,
  createdNodeIds,
};
