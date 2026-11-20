// v2-04-ig-templates.js — Verein Percikan Iman Schweiz v2 · Page 04: IG Makeover, Link-in-Bio & 3×3 Grid
// Target: fileKey tJA2fcaYcckLkwHmRGYvf9

const TARGET_PAGE = "04 · Editable IG Templates & 3×3 Grid";
let page = figma.root.children.find((p) => p.name === TARGET_PAGE);
if (!page) {
  page = figma.createPage();
  page.name = TARGET_PAGE;
}
await figma.setCurrentPageAsync(page);

const BOARD_NAME = "04 · IG Profile Makeover & 3×3 Launch Grid (v2)";
const BOARD_W = 3760;
const PAD = 120;
const INNER_W = BOARD_W - PAD * 2; // 3520

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
  t.fontSize = opts.size || 20;
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

const addCrosshair = (parent, x, y, color = "#B8B0A2", size = 16) => {
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M${size / 2} 0V${size}M0 ${size / 2}H${size}" stroke="${color}" stroke-width="1.4"/></svg>`;
  const mark = track(figma.createNodeFromSvg(svg));
  mark.name = "Swiss Crosshair +";
  parent.appendChild(mark);
  mark.resize(size, size);
  if (parent.layoutMode && parent.layoutMode !== "NONE") mark.layoutPositioning = "ABSOLUTE";
  mark.x = x;
  mark.y = y;
  return mark;
};

const addCornerMarks = (frame, w, h, color = "#B8B0A2", inset = 24) => {
  addCrosshair(frame, inset, inset, color, 16);
  addCrosshair(frame, w - inset - 16, inset, color, 16);
  addCrosshair(frame, inset, h - inset - 16, color, 16);
  addCrosshair(frame, w - inset - 16, h - inset - 16, color, 16);
};

// Compact authentic VPI Emblem Mark SVG (172x192 viewBox normalized from public/logo.svg)
const T_PATHS = [
  "M885.6 342.7C882.3 347.2 879.5 351.6 877 355.8C882 361.7 886.7 367.4 890.6 372.4C893.2 368 896.2 363.4 899.6 358.7C900.6 357.2 901.8 355.6 903.1 354C899 348.9 894.3 343.2 889.4 337.5C888 339.4 886.7 341.1 885.6 342.7",
  "M946.8 321.1C949.7 325.2 952.3 329.2 954.7 333.2C960.3 326.9 965.4 321.5 968.9 317.8C966.5 313.8 963.8 309.7 960.8 305.4C959.5 303.6 958.1 301.7 956.5 299.7C953.4 303 948.3 308.5 942.2 315C943.9 317.2 945.4 319.2 946.8 321.1",
  "M893.4 376.2C893.8 376.7 894.2 377.2 894.6 377.8C899 383.9 902.7 389.8 905.8 395.5C908.9 389.8 912.6 383.9 917 377.8C917.3 377.2 917.7 376.7 918.1 376.2C915.4 371.4 912.2 366.5 908.6 361.3C907.7 360.1 906.8 358.8 905.8 357.5C904.8 358.8 903.8 360.1 903 361.3C899.3 366.5 896.1 371.4 893.4 376.2",
  "M922.1 337.5C917.2 343.2 912.5 348.9 908.5 354C909.7 355.6 910.9 357.2 912 358.7C915.3 363.4 918.3 368 920.9 372.4C924.8 367.4 929.5 361.7 934.5 355.8C932 351.6 929.2 347.2 926 342.7C924.8 341.1 923.5 339.3 922.1 337.5",
  "M905.8 311.2C910.6 305.6 915.6 300.2 920.1 295.2C915.2 289.7 910.3 284.3 905.8 279.3C901.3 284.3 896.3 289.7 891.5 295.2C896 300.2 900.9 305.6 905.8 311.2",
  "M939.5 311.6C945.6 304.9 950.8 299.4 953.8 296.2C951.7 293.5 949.4 290.7 946.9 287.8C944.7 285.3 942.4 282.7 940.1 280.1C937.3 283 932.1 288.5 925.9 295.3C930.7 300.9 935.4 306.5 939.5 311.6",
  "M908.7 276.1C913.2 281.1 918.1 286.5 923 292C929.3 285.2 934.5 279.7 937.2 276.9C932.2 271.3 927.2 265.9 922.7 261.1C920 264 914.9 269.4 908.7 276.1",
  "M874.3 276.8C877.1 279.7 882.3 285.2 888.5 292C893.4 286.5 898.3 281.1 902.8 276.1C896.7 269.4 891.6 264 888.8 261.1C884.3 265.9 879.3 271.3 874.3 276.8",
  "M891.8 258C894.5 260.8 899.6 266.2 905.8 272.9C911.9 266.3 917 260.8 919.7 258C911.6 249.4 905.8 243.4 905.8 243.4C905.8 243.4 899.9 249.4 891.8 258",
  "M857.7 296.2C860.7 299.4 865.9 304.9 872 311.6C876.1 306.5 880.8 300.9 885.7 295.3C879.4 288.5 874.2 283 871.4 280.1C869.6 282.2 867.7 284.3 865.9 286.3C863 289.7 860.2 293.1 857.7 296.2",
  "M859.9 336.5C864.5 341.5 869.3 347 874.1 352.4C876.5 348.4 879.2 344.3 882.2 340.1C883.5 338.2 884.9 336.3 886.5 334.2C881.7 328.7 876.8 323.3 872.3 318.3C870.8 320.2 869.4 322.1 868.2 323.8C865.1 328.1 862.3 332.4 859.9 336.5",
  "M905.8 350.5C909.8 345.3 914.5 339.7 919.4 334.1C915.4 329 910.7 323.4 905.8 317.7C900.9 323.4 896.2 329 892.1 334.1C897 339.7 901.7 345.3 905.8 350.5",
  "M908.6 314.5C913.5 320.1 918.2 325.6 922.3 330.8C927.1 325.3 932 319.8 936.6 314.8C932.5 309.7 927.8 304.1 922.9 298.5C918.4 303.5 913.5 308.9 908.6 314.5",
  "M875 314.8C879.5 319.8 884.4 325.3 889.2 330.8C893.3 325.6 898 320.1 902.9 314.5C898.1 308.9 893.1 303.5 888.6 298.5C883.7 304.1 879 309.7 875 314.8",
  "M850.8 305.4C847.7 309.7 845 313.8 842.6 317.8C846.2 321.5 851.2 326.9 856.9 333.2C859.2 329.2 861.9 325.2 864.8 321.1C866.1 319.2 867.7 317.2 869.3 315C863.3 308.5 858.1 303 855 299.7C853.5 301.7 852 303.6 850.8 305.4",
  "M929.4 340.1C932.4 344.3 935.1 348.4 937.5 352.4C942.2 347 947.1 341.5 951.7 336.5C949.2 332.4 946.5 328.1 943.4 323.8C942.2 322.1 940.8 320.2 939.3 318.3C934.7 323.3 929.8 328.7 925 334.2C926.6 336.3 928.1 338.2 929.4 340.1",
];
const W_PATHS = [
  "M832 377.3C833 380.6 836.9 390.8 846.9 401.2C846.2 399.4 845.7 398 845.4 397.1C839.3 378.3 842.1 359.3 854.6 337.1C849 331 844 325.6 840.4 321.7C829 342.4 826.4 360 832 377.3",
  "M920.4 380.4C915.5 387.3 911.4 393.9 908.2 400.2C912.3 408.6 915 416.6 916.2 424.3C920.9 423.8 925.5 422.9 929.9 421.7C931.3 408.8 928.3 395.4 920.4 380.4Z",
  "M957 337.1C969.4 359.3 972.3 378.3 966.2 397.1C965.9 398 965.4 399.4 964.6 401.2C974.6 390.8 978.5 380.6 979.6 377.3C985.2 360 982.6 342.4 971.2 321.7C967.5 325.6 962.5 331 957 337.1",
  "M939.8 356.4C951.5 377.4 954.5 395.5 949.6 413.3C951.6 412.1 953.5 410.8 955.4 409.4C959.5 403.1 961.5 397.8 962.2 395.7C967.7 378.5 965.2 361 953.9 340.4C949.3 345.5 944.4 351 939.8 356.4",
  "M923.2 376.5C931.8 392.4 935.4 406.7 934.3 420.4C937.7 419.2 941 417.9 944.2 416.3C944.4 415.6 944.6 415.1 944.8 414.6C950.3 397.6 947.9 380.2 936.8 359.8C931.7 365.7 927 371.5 923.2 376.5",
  "M849.4 395.7C850.1 397.8 852 403.1 856.2 409.4C858 410.8 860 412.1 862 413.3C857 395.5 860.1 377.4 871.8 356.4C867.1 351 862.2 345.5 857.6 340.4C846.3 361 843.8 378.5 849.4 395.7",
];
const EMBLEM_SVG = (w, h, colorTop = "#1D5B8C", colorWing = "#5B7E9E") =>
  `<svg width="${w}" height="${h}" viewBox="0 0 172 192" xmlns="http://www.w3.org/2000/svg"><g transform="translate(-820 -238)" fill-rule="nonzero">` +
  T_PATHS.map((d) => `<path fill="${colorTop}" d="${d}"/>`).join("") +
  W_PATHS.map((d) => `<path fill="${colorWing}" d="${d}"/>`).join("") +
  `</g></svg>`;

// Root Board
const board = makeBox("VERTICAL", {
  name: BOARD_NAME,
  w: BOARD_W,
  pad: PAD,
  gap: 72,
  bg: "#EAE6DF",
  border: "#D5CFC4",
  bw: 1,
});
board.x = 0;
board.y = 0;
figma.currentPage.appendChild(board);
addCrosshair(board, 48, 48, "#B8B0A2", 24);
addCrosshair(board, BOARD_W - 72, 48, "#B8B0A2", 24);

// Header
const header = makeBox("VERTICAL", { name: "Board Header", w: INNER_W, gap: 18, noFill: true });
board.appendChild(header);
const topMeta = makeBox("HORIZONTAL", { w: INNER_W, alignMain: "SPACE_BETWEEN", alignCross: "CENTER", noFill: true });
header.appendChild(topMeta);
addText(topMeta, "VEREIN PERCIKAN IMAN · SCHWEIZ", { font: FONTS.monoBold, size: 22, ls: 8, upper: true, color: "#1D5B8C" });
addText(topMeta, "04 / 05 · IG MAKEOVER (@VEREIN.PI), LINK-IN-BIO & 3×3 GRID (1080×1350)", { font: FONTS.monoReg, size: 20, ls: 6, upper: true, color: "#4A5E72" });
addRule(header, INNER_W, "#D5CFC4");
addText(header, "@verein.pi — Instagram Makeover, Link-in-Bio Hub & Editable 3×3 Grid", {
  font: FONTS.sansExtra,
  size: 64,
  lh: 74,
  ls: -2,
  color: "#132435",
  w: INNER_W,
});
addText(
  header,
  "Greige-Blue-Teak atelier makeover: clean UTF-8 bilingual bio, 5 cohesive Highlight Covers, editable 1080×1920 Link-in-Bio hub, and 9 production-ready 1080×1350 Figma Auto-Layout post templates (Plus Jakarta Sans + JetBrains Mono).",
  { font: FONTS.sansReg, size: 26, lh: 38, color: "#4A5E72", w: INNER_W }
);

// ── Top Row: Profile Makeover (Left 2360) + Link-in-Bio (Right 1080×1920)
const topRow = makeBox("HORIZONTAL", { name: "Profile Makeover & Link-in-Bio Row", w: INNER_W, gap: 80, noFill: true });
board.appendChild(topRow);

const leftColW = 2360;
const leftCol = makeBox("VERTICAL", { name: "IG Profile Makeover Column", w: leftColW, gap: 48, noFill: true });
topRow.appendChild(leftCol);

const profileCard = makeBox("VERTICAL", {
  name: "@verein.pi Profile Header Makeover",
  w: leftColW,
  pad: 56,
  gap: 40,
  bg: "#F4F2ED",
  border: "#D5CFC4",
  bw: 1,
  radius: 20,
});
leftCol.appendChild(profileCard);

const profMeta = makeBox("HORIZONTAL", { w: leftColW - 112, alignMain: "SPACE_BETWEEN", alignCross: "CENTER", noFill: true });
profileCard.appendChild(profMeta);
addText(profMeta, "INSTAGRAM PROFILE HEADER · CLEAN UTF-8 DE + ID", { font: FONTS.monoBold, size: 18, ls: 8, color: "#1D5B8C" });
const badgeFix = makeBox("HORIZONTAL", { px: 16, py: 8, bg: "#F3E8DF", border: "#8C5327", radius: 6 });
profMeta.appendChild(badgeFix);
addText(badgeFix, "REPLACES BROKEN UNICODE ITALIC BIO", { font: FONTS.monoBold, size: 14, ls: 4, color: "#8C5327" });

const profTop = makeBox("HORIZONTAL", { w: leftColW - 112, gap: 56, alignCross: "CENTER", noFill: true });
profileCard.appendChild(profTop);

const avCircle = makeBox("VERTICAL", {
  name: "IG Avatar Preview",
  w: 220,
  h: 220,
  bg: "#EAE6DF",
  border: "#B8B0A2",
  bw: 3,
  radius: 999,
  alignMain: "CENTER",
  alignCross: "CENTER",
});
profTop.appendChild(avCircle);
addSvg(avCircle, EMBLEM_SVG(126, 140, "#1D5B8C", "#5B7E9E"), 126, 140, "IG Profile Mark");

const profInfo = makeBox("VERTICAL", { w: leftColW - 112 - 276, gap: 18, noFill: true });
profTop.appendChild(profInfo);

const handleRow = makeBox("HORIZONTAL", { gap: 24, alignCross: "CENTER", noFill: true });
profInfo.appendChild(handleRow);
addText(handleRow, "@verein.pi", { font: FONTS.sansBold, size: 40, color: "#132435" });
const followBtn = makeBox("HORIZONTAL", { px: 28, py: 12, bg: "#1D5B8C", radius: 8 });
handleRow.appendChild(followBtn);
addText(followBtn, "Folgen", { font: FONTS.sansBold, size: 20, color: "#FFFFFF" });
const msgBtn = makeBox("HORIZONTAL", { px: 28, py: 12, bg: "#FAF9F6", border: "#D5CFC4", radius: 8 });
handleRow.appendChild(msgBtn);
addText(msgBtn, "Nachricht", { font: FONTS.sansBold, size: 20, color: "#132435" });
const spBtn = makeBox("HORIZONTAL", { px: 28, py: 12, bg: "#F3E8DF", border: "#8C5327", radius: 8 });
handleRow.appendChild(spBtn);
addText(spBtn, "Spenden", { font: FONTS.sansBold, size: 20, color: "#8C5327" });

addText(profInfo, "Verein Percikan Iman Schweiz", { font: FONTS.sansBold, size: 28, color: "#132435" });
addText(
  profInfo,
  "Islamische Bildung & Gemeinschaft · Pendidikan & Kebersamaan di Swiss\n" +
    "Monatl. Ta'lim · Pengajian Anak · Muslimah Offline · Familienlager\n" +
    "CH · 8000 Zürich · gemäss Art. 60–79 ZGB · UID: CHE-382.914.820",
  { font: FONTS.sansReg, size: 23, lh: 34, color: "#4A5E72", w: 1900 }
);
addText(profInfo, "percikaniman.ch/links  ·  info@percikaniman.ch", { font: FONTS.monoBold, size: 22, color: "#1D5B8C" });

addRule(profileCard, leftColW - 112, "#D5CFC4");

addText(profileCard, "5 MINIMALIST STORY HIGHLIGHT COVERS (GREIGE, BLUE & ROASTED TEAK)", {
  font: FONTS.monoBold,
  size: 16,
  ls: 8,
  color: "#4A5E72",
});
const hlRow = makeBox("HORIZONTAL", { name: "5 Story Highlight Covers", w: leftColW - 112, gap: 48, noFill: true });
profileCard.appendChild(hlRow);

const highlights = [
  { label: "Ta'lim", sub: "BILDUNG", bg: "#FAF9F6", border: "#D5CFC4", glyph: "01", fg: "#1D5B8C" },
  { label: "Kids", sub: "ANAK", bg: "#DFE8F0", border: "#1D5B8C", glyph: "02", fg: "#1D5B8C" },
  { label: "Muslimah", sub: "RUNDE", bg: "#F3E8DF", border: "#8C5327", glyph: "03", fg: "#8C5327" },
  { label: "Events", sub: "AGENDA", bg: "#1D5B8C", border: "#15466E", glyph: "04", fg: "#FFFFFF" },
  { label: "Spenden", sub: "TWINT", bg: "#132435", border: "#132435", glyph: "CH", fg: "#9CC4E4" },
];
for (const h of highlights) {
  const item = makeBox("VERTICAL", { gap: 14, alignCross: "CENTER", noFill: true });
  hlRow.appendChild(item);
  const ring = makeBox("VERTICAL", {
    w: 152,
    h: 152,
    bg: "#EAE6DF",
    border: h.bg === "#132435" || h.bg === "#1D5B8C" ? h.bg : h.border,
    bw: 3,
    radius: 999,
    alignMain: "CENTER",
    alignCross: "CENTER",
  });
  item.appendChild(ring);
  const core = makeBox("VERTICAL", {
    w: 132,
    h: 132,
    bg: h.bg,
    radius: 999,
    gap: 2,
    alignMain: "CENTER",
    alignCross: "CENTER",
  });
  ring.appendChild(core);
  addText(core, h.glyph, { font: FONTS.monoBold, size: 32, color: h.fg });
  addText(core, h.sub, { font: FONTS.monoBold, size: 13, ls: 6, color: h.fg });
  addText(item, h.label, { font: FONTS.sansBold, size: 22, color: "#132435" });
}

// Visual Cadence & Volunteer Rule Card
const rhythmCard = makeBox("VERTICAL", {
  name: "3×3 Cadence & Figma Template Workflow",
  w: leftColW,
  pad: 56,
  gap: 28,
  bg: "#FAF9F6",
  border: "#D5CFC4",
  bw: 1,
  radius: 20,
});
leftCol.appendChild(rhythmCard);
addText(rhythmCard, "3×3 CHROMATIC RHYTHM & FIGMA-NATIVE TEMPLATE WORKFLOW", {
  font: FONTS.monoBold,
  size: 18,
  ls: 8,
  color: "#1D5B8C",
});
addText(
  rhythmCard,
  "Every post below is a real Figma Auto-Layout frame (1080×1350 · 64px Safe-Zone). Warm Stone & Limestone Greige anchors alternate diagonally with Deep Slate-Blue recaps and Ice-Blue Mist / Roasted Teak Pop highlights.",
  { font: FONTS.sansReg, size: 24, lh: 36, color: "#4A5E72", w: leftColW - 112 }
);

const cadGrid = makeBox("VERTICAL", { w: leftColW - 112, gap: 16, noFill: true });
rhythmCard.appendChild(cadGrid);
const cadRows = [
  [
    { t: "01 · MONATL. TA'LIM", sub: "Warm Stone #F4F2ED", bg: "#F4F2ED", fg: "#132435", b: "#D5CFC4" },
    { t: "02 · PHOTO RECAP", sub: "Cobalt -> Slate Gradient", bg: "#132435", fg: "#FFFFFF", b: "#132435" },
    { t: "03 · QUR'AN REFLEXION", sub: "Ice-Blue Mist #DFE8F0", bg: "#DFE8F0", fg: "#132435", b: "#1D5B8C" },
  ],
  [
    { t: "04 · KINDER / ANAK", sub: "Crisp Ivory #FAF9F6", bg: "#FAF9F6", fg: "#132435", b: "#D5CFC4" },
    { t: "05 · WEGWEISER HUB", sub: "Limestone Greige #EAE6DF", bg: "#EAE6DF", fg: "#132435", b: "#B8B0A2" },
    { t: "06 · MUSLIMAH OFFLINE", sub: "Warm Stone + Roasted Teak", bg: "#F3E8DF", fg: "#8C5327", b: "#8C5327" },
  ],
  [
    { t: "07 · RAMADAN / EID", sub: "Slate-Blue + Teak Kawung", bg: "#132435", fg: "#9CC4E4", b: "#8C5327" },
    { t: "08 · FAMILIENLAGER", sub: "Cobalt -> Slate Alp Cover", bg: "#1D5B8C", fg: "#FFFFFF", b: "#15466E" },
    { t: "09 · SIX QR + TWINT", sub: "Slate-Blue + #FFFFFF QR", bg: "#132435", fg: "#FFFFFF", b: "#1D5B8C" },
  ],
];
for (const cr of cadRows) {
  const rowEl = makeBox("HORIZONTAL", { w: leftColW - 112, gap: 16, noFill: true });
  cadGrid.appendChild(rowEl);
  for (const c of cr) {
    const cell = makeBox("VERTICAL", { w: 738, pad: 22, gap: 6, bg: c.bg, border: c.b, bw: 2, radius: 10 });
    rowEl.appendChild(cell);
    addText(cell, c.t, { font: FONTS.monoBold, size: 17, ls: 4, color: c.fg });
    addText(cell, c.sub, { font: FONTS.sansMed, size: 20, color: c.fg, opacity: 0.88 });
  }
}

// ── Right Top: Editable 1080×1920 Link-in-Bio Mobile Hub
const hub = makeBox("VERTICAL", {
  name: "Link-in-Bio Mobile Hub (1080×1920)",
  w: 1080,
  h: 1920,
  pad: 64,
  gap: 28,
  bg: "#EAE6DF",
  border: "#D5CFC4",
  bw: 2,
  clip: true,
});
topRow.appendChild(hub);
addCornerMarks(hub, 1080, 1920, "#B8B0A2", 24);

const hubTop = makeBox("HORIZONTAL", { w: 952, alignMain: "SPACE_BETWEEN", alignCross: "CENTER", noFill: true });
hub.appendChild(hubTop);
addText(hubTop, "VEREIN PERCIKAN IMAN · SCHWEIZ", { font: FONTS.monoBold, size: 16, ls: 8, color: "#1D5B8C" });
addText(hubTop, "LINK-IN-BIO HUB · 1080×1920", { font: FONTS.monoReg, size: 14, ls: 6, color: "#4A5E72" });
addRule(hub, 952, "#D5CFC4");

const hubBrand = makeBox("VERTICAL", { w: 952, gap: 14, alignCross: "CENTER", py: 8, noFill: true });
hub.appendChild(hubBrand);
addSvg(hubBrand, EMBLEM_SVG(78, 86, "#1D5B8C", "#5B7E9E"), 78, 86, "Hub Emblem");
addText(hubBrand, 'Verein "Percikan Iman" Schweiz', { font: FONTS.sansExtra, size: 42, ls: -2, color: "#132435", align: "CENTER" });
addText(hubBrand, "Bildung, Gemeinschaft & Orientierung in der Schweiz (DE + ID)", {
  font: FONTS.sansReg,
  size: 21,
  color: "#4A5E72",
  align: "CENTER",
  w: 840,
});
const nextPill = makeBox("HORIZONTAL", { px: 22, py: 9, bg: "#F3E8DF", border: "#8C5327", radius: 999 });
hubBrand.appendChild(nextPill);
addText(nextPill, "NÄCHSTER TERMIN · MONATL. TA'LIM · ZÜRICH", { font: FONTS.monoBold, size: 15, ls: 4, color: "#8C5327" });

const hubLinks = [
  { t: "Percikan Wegweiser — Handbuch & Guide (DE / ID)", sub: "PDF & Orientierung für neues Leben in der Schweiz", bg: "#1D5B8C", b: "#15466E", fg: "#FFFFFF", sf: "#DFE8F0", tag: "GUIDE" },
  { t: "Monatliche Ta'lim & Vorträge", sub: "Kajian Bulanan di Iman Zentrum Volketswil · Anmeldung", bg: "#FAF9F6", b: "#D5CFC4", fg: "#132435", sf: "#4A5E72", tag: "BILDUNG" },
  { t: "Pengajian Anak / Kinder-Koranunterricht", sub: "Sonntags 10:30–12:30 · Gruppen 5–13 Jahre", bg: "#FAF9F6", b: "#D5CFC4", fg: "#132435", sf: "#4A5E72", tag: "KINDER" },
  { t: "Muslimah Offline Gathering", sub: "Kajian & Dialog für Schwestern · Sr. Sri / Susan / Atik", bg: "#FAF9F6", b: "#8C5327", fg: "#132435", sf: "#4A5E72", tag: "TEAK" },
  { t: "Familienlager VPI — Rückblick & Termine", sub: "Kemah Keluarga · Dreiländereck / Lörrach", bg: "#FAF9F6", b: "#D5CFC4", fg: "#132435", sf: "#4A5E72", tag: "FAMILIE" },
  { t: "Spenden & Zakat (PostFinance / TWINT)", sub: "IBAN CH89 0900 0000 6049 6610 7 · UID CHE-382.914.820", bg: "#DFE8F0", b: "#1D5B8C", fg: "#132435", sf: "#1D5B8C", tag: "IBAN" },
];
for (const l of hubLinks) {
  const card = makeBox("HORIZONTAL", {
    w: 952,
    px: 30,
    py: 24,
    bg: l.bg,
    border: l.b,
    bw: l.b === "#8C5327" || l.b === "#1D5B8C" ? 2 : 1,
    radius: 12,
    alignMain: "SPACE_BETWEEN",
    alignCross: "CENTER",
  });
  hub.appendChild(card);
  const lc = makeBox("VERTICAL", { w: 740, gap: 6, noFill: true });
  card.appendChild(lc);
  addText(lc, l.t, { font: FONTS.sansBold, size: 24, color: l.fg, w: 740 });
  addText(lc, l.sub, { font: FONTS.sansReg, size: 18, color: l.sf, w: 740 });
  const tagBox = makeBox("HORIZONTAL", {
    px: 14,
    py: 8,
    bg: l.bg === "#1D5B8C" ? "#15466E" : l.tag === "TEAK" ? "#F3E8DF" : "#EAE6DF",
    radius: 6,
  });
  card.appendChild(tagBox);
  addText(tagBox, l.tag, {
    font: FONTS.monoBold,
    size: 14,
    ls: 4,
    color: l.bg === "#1D5B8C" ? "#9CC4E4" : l.tag === "TEAK" ? "#8C5327" : "#1D5B8C",
  });
}

const hubFoot = makeBox("VERTICAL", { w: 952, pad: 24, gap: 6, bg: "#F4F2ED", border: "#D5CFC4", radius: 10 });
hub.appendChild(hubFoot);
addText(hubFoot, 'VEREIN "PERCIKAN IMAN" · SCHWEIZER VEREIN GEMÄSS ART. 60–79 ZGB', {
  font: FONTS.monoBold,
  size: 13,
  ls: 4,
  color: "#1D5B8C",
});
addText(hubFoot, "8000 Zürich, Schweiz · UID: CHE-382.914.820 · PostFinance IBAN: CH89 0900 0000 6049 6610 7 · @verein.pi", {
  font: FONTS.monoReg,
  size: 14,
  lh: 22,
  color: "#4A5E72",
  w: 904,
});

// ── Section 2: 3×3 Editable IG Launch Grid (9 × 1080×1350)
const gridHead = makeBox("VERTICAL", { name: "3×3 Grid Header", w: INNER_W, gap: 14, noFill: true });
board.appendChild(gridHead);
addRule(gridHead, INNER_W, "#D5CFC4");
addText(gridHead, "02 / 3×3 EDITABLE LAUNCH GRID — 9× 1080×1350 FIGMA AUTO-LAYOUT TEMPLATES", {
  font: FONTS.monoBold,
  size: 20,
  ls: 8,
  color: "#1D5B8C",
});
addText(
  gridHead,
  "All 9 templates use 64px safe-zone margins, Swiss crosshairs, and Plus Jakarta Sans + JetBrains Mono exclusively. Post 09 keeps pure #FFFFFF exclusively inside the SIX QR-Rechnung quiet zone.",
  { font: FONTS.sansReg, size: 24, color: "#4A5E72", w: INNER_W }
);

const feedGrid = makeBox("VERTICAL", { name: "3×3 IG Launch Grid (9 × 1080×1350)", w: INNER_W, gap: 140, noFill: true });
board.appendChild(feedGrid);

const gridRows = [
  makeBox("HORIZONTAL", { name: "Grid Row 1 (Posts 01–03)", w: INNER_W, gap: 140, noFill: true }),
  makeBox("HORIZONTAL", { name: "Grid Row 2 (Posts 04–06)", w: INNER_W, gap: 140, noFill: true }),
  makeBox("HORIZONTAL", { name: "Grid Row 3 (Posts 07–09)", w: INNER_W, gap: 140, noFill: true }),
];
for (const r of gridRows) feedGrid.appendChild(r);

const postIds = [];

const createPostBase = (rowIdx, name, bg, dark = false) => {
  const f = makeBox("VERTICAL", {
    name,
    w: 1080,
    h: 1350,
    pad: 64,
    gap: 32,
    bg,
    border: dark ? "#1D5B8C" : "#D5CFC4",
    bw: 2,
    clip: true,
  });
  gridRows[rowIdx].appendChild(f);
  postIds.push(f.id);
  addCornerMarks(f, 1080, 1350, dark ? "#9CC4E4" : "#B8B0A2", 24);
  return f;
};

const addPostTopBar = (post, tagText, dark = false) => {
  const bar = makeBox("HORIZONTAL", { w: 952, alignMain: "SPACE_BETWEEN", alignCross: "CENTER", noFill: true });
  post.appendChild(bar);
  const left = makeBox("HORIZONTAL", { gap: 16, alignCross: "CENTER", noFill: true });
  bar.appendChild(left);
  addSvg(left, EMBLEM_SVG(38, 42, dark ? "#FFFFFF" : "#1D5B8C", dark ? "#9CC4E4" : "#5B7E9E"), 38, 42, "Post Logo");
  addText(left, "VEREIN PERCIKAN IMAN · SCHWEIZ", {
    font: FONTS.monoBold,
    size: 16,
    ls: 7,
    color: dark ? "#9CC4E4" : "#1D5B8C",
  });
  addText(bar, tagText, { font: FONTS.monoReg, size: 15, ls: 5, color: dark ? "#DFE8F0" : "#4A5E72" });
  addRule(post, 952, dark ? "#5B7E9E" : "#D5CFC4");
};

const addPostFooter = (post, leftLabel, rightLabel, dark = false) => {
  addRule(post, 952, dark ? "#5B7E9E" : "#D5CFC4");
  const foot = makeBox("HORIZONTAL", { w: 952, alignMain: "SPACE_BETWEEN", alignCross: "CENTER", noFill: true });
  post.appendChild(foot);
  addText(foot, leftLabel, { font: FONTS.monoBold, size: 15, ls: 5, color: dark ? "#9CC4E4" : "#4A5E72" });
  addText(foot, rightLabel, { font: FONTS.monoReg, size: 15, ls: 4, color: dark ? "#DFE8F0" : "#1D5B8C" });
};

// POST 01: Monatliche Ta'lim Flyer (Warm Stone #F4F2ED)
{
  const p1 = createPostBase(0, "Post 01 · Monatliche Ta'lim Flyer (1080×1350)", "#F4F2ED", false);
  addPostTopBar(p1, "01 · BILDUNG & KAJIAN", false);

  const pill = makeBox("HORIZONTAL", { px: 20, py: 10, bg: "#DFE8F0", border: "#1D5B8C", radius: 999 });
  p1.appendChild(pill);
  addText(pill, "MONATLICHE BILDUNG · KAJIAN BULANAN", { font: FONTS.monoBold, size: 17, ls: 6, color: "#1D5B8C" });

  addText(p1, "Monatliche Ta'lim\n& Begegnung", {
    font: FONTS.sansExtra,
    size: 72,
    lh: 80,
    ls: -2,
    color: "#132435",
    w: 952,
  });
  addText(
    p1,
    "Kajian Islam Bulanan, Silaturahmi Keluarga & Pembinaan Iman bagi Masyarakat Indonesia di Swiss.",
    { font: FONTS.sansMed, size: 28, lh: 40, color: "#4A5E72", w: 952 }
  );

  const table = makeBox("VERTICAL", { w: 952, pad: 34, gap: 20, bg: "#FAF9F6", border: "#D5CFC4", radius: 14 });
  p1.appendChild(table);
  const rows1 = [
    ["DATUM / ZEIT", "Jeden 1. Sonntag im Monat · 13:30–16:30 Uhr"],
    ["ORT / ADRESSE", "Iman Zentrum, Juchstrasse 15, 8604 Volketswil"],
    ["SPRACHE", "Bahasa Indonesia & Deutsch (DE + ID Track)"],
    ["TEILNAHME", "Eintritt frei · Verpflegung & Kinderbetreuung"],
  ];
  for (let i = 0; i < rows1.length; i++) {
    const rw = makeBox("HORIZONTAL", { w: 884, alignMain: "SPACE_BETWEEN", alignCross: "CENTER", noFill: true });
    table.appendChild(rw);
    addText(rw, rows1[i][0], { font: FONTS.monoBold, size: 17, ls: 6, color: "#1D5B8C" });
    addText(rw, rows1[i][1], { font: FONTS.sansBold, size: 22, color: "#132435", align: "RIGHT", w: 620 });
    if (i < rows1.length - 1) addRule(table, 884, "#E1DDD4");
  }

  const cta = makeBox("HORIZONTAL", { w: 952, px: 32, py: 24, bg: "#1D5B8C", radius: 10, alignMain: "SPACE_BETWEEN", alignCross: "CENTER" });
  p1.appendChild(cta);
  addText(cta, "Anmeldung & Thema via percikaniman.ch", { font: FONTS.sansBold, size: 24, color: "#FFFFFF" });
  addText(cta, "@VEREIN.PI →", { font: FONTS.monoBold, size: 18, ls: 4, color: "#9CC4E4" });

  addPostFooter(p1, "8000 ZÜRICH · ART. 60–79 ZGB", "POST 01 / 09", false);
}

// POST 02: Event Photo Recap (Cobalt -> Deep Slate-Blue Bottom Gradient)
{
  const p2 = createPostBase(0, "Post 02 · Event Photo Recap (1080×1350)", "#132435", true);
  const gradBg = track(figma.createRectangle());
  gradBg.resize(1080, 1350);
  gradBg.fills = [
    {
      type: "GRADIENT_LINEAR",
      gradientStops: [
        { color: rgba("#1D5B8C", 1), position: 0 },
        { color: rgba("#132435", 1), position: 0.78 },
      ],
      gradientTransform: [[0, 1, 0], [-1, 0, 1]],
    },
  ];
  p2.insertChild(0, gradBg);
  gradBg.layoutPositioning = "ABSOLUTE";
  gradBg.x = 0;
  gradBg.y = 0;

  addPostTopBar(p2, "02 · VERANSTALTUNG RECAP", true);

  // Drop-zone photo slot with Swiss contours & bottom scrim feel
  const photoSlotSvg = `<svg width="952" height="440" viewBox="0 0 952 440" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="952" height="440" rx="14" fill="#15466E" stroke="#9CC4E4" stroke-opacity="0.4"/>
    <path d="M0 320 C210 240, 420 350, 952 260" stroke="#9CC4E4" stroke-opacity="0.35" stroke-width="2"/>
    <path d="M0 380 C260 320, 560 400, 952 330" stroke="#5B7E9E" stroke-opacity="0.5" stroke-width="2"/>
    <path d="M476 176V208M460 192H492" stroke="#9CC4E4" stroke-width="2"/>
    <rect y="290" width="952" height="150" rx="14" fill="#132435" fill-opacity="0.72"/>
  </svg>`;
  addSvg(p2, photoSlotSvg, 952, 440, "Photo Slot + Bottom Scrim");

  const stamp2 = makeBox("HORIZONTAL", { px: 22, py: 10, bg: "#8C5327", radius: 6 });
  p2.appendChild(stamp2);
  addText(stamp2, "RÜCKBLICK · IMAN ZENTRUM VOLKETSWIL", { font: FONTS.monoBold, size: 17, ls: 6, color: "#FAF9F6" });

  addText(p2, "Gemeinschaft erleben:\nBegegnungstag Zürich", {
    font: FONTS.sansExtra,
    size: 62,
    lh: 70,
    ls: -2,
    color: "#FFFFFF",
    w: 952,
  });
  addText(
    p2,
    "Terima kasih kepada seluruh jamaah, keluarga, dan relawan yang telah meramaikan Silaturahmi & Pengajian.",
    { font: FONTS.sansReg, size: 25, lh: 36, color: "#DFE8F0", w: 952 }
  );

  addPostFooter(p2, "REPLACE IMAGE SLOT IN FIGMA", "SWIPE RECAP →", true);
}

// POST 03: Editorial Quote Card (Ice-Blue Mist #DFE8F0 — ZERO serif)
{
  const p3 = createPostBase(0, "Post 03 · Editorial Quote Card (1080×1350)", "#DFE8F0", false);
  addPostTopBar(p3, "03 · WORT ZUM TAG", false);

  const qMotifSvg = `<svg width="952" height="84" viewBox="0 0 952 84" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 42H952" stroke="#1D5B8C" stroke-opacity="0.28"/>
    <polygon points="476,8 510,42 476,76 442,42" fill="#1D5B8C" fill-opacity="0.16" stroke="#1D5B8C" stroke-width="2"/>
    <polygon points="240,22 260,42 240,62 220,42" fill="#8C5327" fill-opacity="0.2" stroke="#8C5327"/>
    <polygon points="712,22 732,42 712,62 692,42" fill="#8C5327" fill-opacity="0.2" stroke="#8C5327"/>
  </svg>`;
  addSvg(p3, qMotifSvg, 952, 84, "Quote Kawung Divider");

  const refPill = makeBox("HORIZONTAL", { px: 20, py: 10, bg: "#FAF9F6", border: "#1D5B8C", radius: 999 });
  p3.appendChild(refPill);
  addText(refPill, "SURE AL-BAQARAH 2:286 · REFLEXION", { font: FONTS.monoBold, size: 17, ls: 6, color: "#1D5B8C" });

  addText(p3, "«Gott erlegt keiner Seele mehr auf, als sie zu tragen vermag.»", {
    font: FONTS.sansBold,
    size: 56,
    lh: 68,
    ls: -2,
    color: "#132435",
    w: 952,
  });

  const qBox = makeBox("VERTICAL", { w: 952, pad: 34, gap: 14, bg: "#FAF9F6", border: "#D5CFC4", radius: 14 });
  p3.appendChild(qBox);
  addText(qBox, "INDONESIA · RENUNGAN HARIAN", { font: FONTS.monoBold, size: 15, ls: 6, color: "#8C5327" });
  addText(
    qBox,
    "Allah tidak membebani seseorang melainkan sesuai dengan kesanggupannya. Setiap langkah di tanah rantau membawa hikmah dan ketenangan.",
    { font: FONTS.sansItalic, size: 26, lh: 38, color: "#4A5E72", w: 884 }
  );

  addPostFooter(p3, "VEREIN PERCIKAN IMAN · ZÜRICH", "SAVE & SHARE", false);
}

// POST 04: Pengajian Anak / Kinder-Koranunterricht (Crisp Ivory #FAF9F6)
{
  const p4 = createPostBase(1, "Post 04 · Kinder-Koranunterricht (1080×1350)", "#FAF9F6", false);
  addPostTopBar(p4, "04 · KINDER & FAMILIE", false);

  const kPill = makeBox("HORIZONTAL", { px: 20, py: 10, bg: "#DFE8F0", radius: 999 });
  p4.appendChild(kPill);
  addText(kPill, "BILDUNG FÜR KINDER · PENGAJIAN ANAK", { font: FONTS.monoBold, size: 17, ls: 6, color: "#1D5B8C" });

  addText(p4, "Kinder-Koranunterricht\n& Pengajian Anak", {
    font: FONTS.sansExtra,
    size: 64,
    lh: 72,
    ls: -2,
    color: "#132435",
    w: 952,
  });
  addText(
    p4,
    "Iqra, Hafalan Surat Pendek, Akhlaq & Identitas Muslim-Schweizer Kinder im sicheren Umfeld (5–13 Jahre).",
    { font: FONTS.sansReg, size: 26, lh: 36, color: "#4A5E72", w: 952 }
  );

  const tracks = makeBox("HORIZONTAL", { w: 952, gap: 28, noFill: true });
  p4.appendChild(tracks);

  const trA = makeBox("VERTICAL", { w: 462, pad: 30, gap: 12, bg: "#F4F2ED", border: "#1D5B8C", bw: 2, radius: 14 });
  tracks.appendChild(trA);
  addText(trA, "GRUPPE A · 5–8 JAHRE", { font: FONTS.monoBold, size: 17, ls: 5, color: "#1D5B8C" });
  addText(trA, "Iqra & Basiswissen", { font: FONTS.sansBold, size: 28, color: "#132435", w: 402 });
  addText(trA, "Huruf Hijaiyah, Doa Harian & Kisah Teladan Nabi.", { font: FONTS.sansReg, size: 21, lh: 30, color: "#4A5E72", w: 402 });

  const trB = makeBox("VERTICAL", { w: 462, pad: 30, gap: 12, bg: "#F3E8DF", border: "#8C5327", bw: 2, radius: 14 });
  tracks.appendChild(trB);
  addText(trB, "GRUPPE B · 9–13 JAHRE", { font: FONTS.monoBold, size: 17, ls: 5, color: "#8C5327" });
  addText(trB, "Tajwid & Juz Amma", { font: FONTS.sansBold, size: 28, color: "#132435", w: 402 });
  addText(trB, "Praktik Shalat, Hafalan & Identitas Anak di Swiss.", { font: FONTS.sansReg, size: 21, lh: 30, color: "#4A5E72", w: 402 });

  const kBar = makeBox("HORIZONTAL", { w: 952, px: 30, py: 24, bg: "#132435", radius: 10, alignMain: "SPACE_BETWEEN", alignCross: "CENTER" });
  p4.appendChild(kBar);
  addText(kBar, "JEDEN SONNTAG · 10:30–12:30 UHR", { font: FONTS.monoBold, size: 19, ls: 5, color: "#9CC4E4" });
  addText(kBar, "Volketswil / Zürich", { font: FONTS.sansBold, size: 22, color: "#FFFFFF" });

  addPostFooter(p4, "ELTERN-ANMELDUNG VIA LINK IN BIO", "POST 04 / 09", false);
}

// POST 05: Percikan Wegweiser Launch Mockup (Limestone Greige #EAE6DF)
{
  const p5 = createPostBase(1, "Post 05 · Percikan Wegweiser Launch (1080×1350)", "#EAE6DF", false);
  addPostTopBar(p5, "05 · PUBLIKATION", false);

  const wRow = makeBox("HORIZONTAL", { w: 952, gap: 40, alignCross: "CENTER", noFill: true });
  p5.appendChild(wRow);

  // Miniature Wegweiser Book Cover Card
  const book = makeBox("VERTICAL", { w: 360, h: 490, pad: 28, gap: 16, bg: "#1D5B8C", border: "#132435", bw: 2, radius: 12 });
  wRow.appendChild(book);
  addText(book, "PERCIKAN IMAN · CH", { font: FONTS.monoBold, size: 13, ls: 6, color: "#9CC4E4" });
  addSvg(book, EMBLEM_SVG(56, 62, "#FFFFFF", "#9CC4E4"), 56, 62, "Wegweiser Emblem");
  addText(book, "Percikan\nWegweiser", { font: FONTS.sansExtra, size: 42, lh: 46, ls: -2, color: "#FFFFFF", w: 304 });
  addText(book, "Kompass für ein Leben in der Schweiz · DE + ID", { font: FONTS.sansMed, size: 18, lh: 26, color: "#DFE8F0", w: 304 });
  const bkFoot = makeBox("HORIZONTAL", { px: 12, py: 8, bg: "#8C5327", radius: 6 });
  book.appendChild(bkFoot);
  addText(bkFoot, "6 KAPITEL · PDF", { font: FONTS.monoBold, size: 13, ls: 4, color: "#FAF9F6" });

  const wInfo = makeBox("VERTICAL", { w: 552, gap: 20, noFill: true });
  wRow.appendChild(wInfo);
  const np = makeBox("HORIZONTAL", { px: 16, py: 8, bg: "#132435", radius: 999 });
  wInfo.appendChild(np);
  addText(np, "NEUERSCHEINUNG · GUIDEBOOK", { font: FONTS.monoBold, size: 15, ls: 5, color: "#9CC4E4" });
  addText(wInfo, "Percikan Wegweiser —\nKompass Schweiz", { font: FONTS.sansExtra, size: 54, lh: 62, ls: -2, color: "#132435", w: 552 });
  addText(
    wInfo,
    "Panduan resmi keluarga & pelajar Indonesia di Swiss: Halal-Alltag, Anmeldung, Schule, Gesundheitswesen & Iman Zentrum.",
    { font: FONTS.sansReg, size: 24, lh: 34, color: "#4A5E72", w: 552 }
  );

  const wBtn = makeBox("HORIZONTAL", { w: 952, px: 32, py: 24, bg: "#8C5327", radius: 10, alignMain: "SPACE_BETWEEN", alignCross: "CENTER" });
  p5.appendChild(wBtn);
  addText(wBtn, "Kostenloser Download auf percikaniman.ch", { font: FONTS.sansBold, size: 24, color: "#FAF9F6" });
  addText(wBtn, "KAPITEL 01–06 →", { font: FONTS.monoBold, size: 17, ls: 4, color: "#F3E8DF" });

  addPostFooter(p5, "VEREIN PERCIKAN IMAN SCHWEIZ", "DE + ID EDITION", false);
}

// POST 06: Muslimah Offline Gathering (Warm Stone #F4F2ED + Roasted Teak Pop #8C5327)
{
  const p6 = createPostBase(1, "Post 06 · Muslimah Offline + Teak Pop (1080×1350)", "#F4F2ED", false);
  addPostTopBar(p6, "06 · MUSLIMAH OFFLINE", false);

  const mPill = makeBox("HORIZONTAL", { px: 20, py: 10, bg: "#F3E8DF", border: "#8C5327", radius: 999 });
  p6.appendChild(mPill);
  addText(mPill, "SCHWESTERN-RUNDE · KAJIAN MUSLIMAH OFFLINE", { font: FONTS.monoBold, size: 16, ls: 5, color: "#8C5327" });

  const teakBandSvg = `<svg width="952" height="110" viewBox="0 0 952 110" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="952" height="110" rx="12" fill="#F3E8DF" stroke="#8C5327" stroke-opacity="0.45"/>
    <path d="M0 55H952" stroke="#8C5327" stroke-opacity="0.3"/>
    <polygon points="160,20 195,55 160,90 125,55" fill="#8C5327" fill-opacity="0.16" stroke="#8C5327"/>
    <polygon points="476,15 516,55 476,95 436,55" fill="#8C5327" fill-opacity="0.24" stroke="#6F401D" stroke-width="2"/>
    <polygon points="792,20 827,55 792,90 757,55" fill="#8C5327" fill-opacity="0.16" stroke="#8C5327"/>
  </svg>`;
  addSvg(p6, teakBandSvg, 952, 110, "Roasted Teak Kawung Accent");

  addText(p6, "Muslimah Offline —\nRaum für Herz & Dialog", {
    font: FONTS.sansExtra,
    size: 64,
    lh: 72,
    ls: -2,
    color: "#132435",
    w: 952,
  });
  addText(
    p6,
    "Temu sapa Muslimah, Kajian Akhlaq & ruang berbagi hangat sesama Muslimah Indonesia di Swiss. Nur für Schwestern.",
    { font: FONTS.sansMed, size: 26, lh: 38, color: "#4A5E72", w: 952 }
  );

  const mBox = makeBox("VERTICAL", { w: 952, pad: 34, gap: 12, bg: "#FAF9F6", border: "#8C5327", bw: 2, radius: 14 });
  p6.appendChild(mBox);
  addText(mBox, "KONTAKTPERSONEN & ANMELDUNG / KONTAK MUSLIMAH", { font: FONTS.monoBold, size: 16, ls: 6, color: "#8C5327" });
  addText(mBox, "Sr. Sri  /  Sr. Susan  /  Sr. Atik", { font: FONTS.sansBold, size: 32, color: "#132435", w: 884 });
  addText(mBox, "Ort: Iman Zentrum Volketswil · Anmeldung via @verein.pi oder info@percikaniman.ch", {
    font: FONTS.sansReg,
    size: 21,
    lh: 30,
    color: "#4A5E72",
    w: 884,
  });

  addPostFooter(p6, "ROASTED TEAK POP · KEIN PASTELLLILA", "POST 06 / 09", false);
}

// POST 07: Ramadan / Eid Greeting (Deep Slate-Blue #132435 + Roasted Teak Kawung — ZERO Jade!)
{
  const p7 = createPostBase(2, "Post 07 · Ramadan & Eid Teak/Slate Greeting (1080×1350)", "#132435", true);
  addPostTopBar(p7, "07 · FESTTAGE & RAMADAN", true);

  const eidSvg = `<svg width="952" height="156" viewBox="0 0 952 156" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="952" height="156" rx="12" fill="#15466E" stroke="#8C5327" stroke-opacity="0.7"/>
    <path d="M0 78H952" stroke="#9CC4E4" stroke-opacity="0.25"/>
    <polygon points="158,22 194,78 158,134 122,78" fill="#8C5327" fill-opacity="0.32" stroke="#F3E8DF" stroke-opacity="0.55"/>
    <polygon points="317,22 353,78 317,134 281,78" fill="#1D5B8C" fill-opacity="0.5" stroke="#9CC4E4" stroke-opacity="0.6"/>
    <polygon points="476,12 522,78 476,144 430,78" fill="#8C5327" fill-opacity="0.55" stroke="#FAF9F6" stroke-width="2"/>
    <polygon points="635,22 671,78 635,134 599,78" fill="#1D5B8C" fill-opacity="0.5" stroke="#9CC4E4" stroke-opacity="0.6"/>
    <polygon points="794,22 830,78 794,134 758,78" fill="#8C5327" fill-opacity="0.32" stroke="#F3E8DF" stroke-opacity="0.55"/>
  </svg>`;
  addSvg(p7, eidSvg, 952, 156, "Slate-Blue + Teak Kawung Band");

  const ep = makeBox("HORIZONTAL", { px: 20, py: 9, bg: "#8C5327", radius: 999 });
  p7.appendChild(ep);
  addText(ep, "EID AL-FITR · 1447 H · SCHWEIZ", { font: FONTS.monoBold, size: 17, ls: 6, color: "#FAF9F6" });

  addText(p7, "Eid Mubarak —\nTaqabbalallahu Minna\nWa Minkum", {
    font: FONTS.sansExtra,
    size: 68,
    lh: 76,
    ls: -2,
    color: "#FFFFFF",
    w: 952,
  });
  addText(
    p7,
    "Selamat Hari Raya Idul Fitri · Mohon maaf lahir dan batin.\nMöge Allah unsere Gebete, unser Fasten und unsere Spenden in der Schweiz annehmen.",
    { font: FONTS.sansMed, size: 25, lh: 36, color: "#DFE8F0", w: 952 }
  );

  const eidCard = makeBox("VERTICAL", { w: 952, pad: 30, gap: 8, bg: "#F3E8DF", border: "#8C5327", bw: 2, radius: 12 });
  p7.appendChild(eidCard);
  addText(eidCard, "SHALAT ID & HALAL BIHALAL VEREIN PERCIKAN IMAN", { font: FONTS.monoBold, size: 16, ls: 5, color: "#6F401D" });
  addText(eidCard, "Zürich / Volketswil · Infos & Anmeldung via @verein.pi", { font: FONTS.sansBold, size: 24, color: "#132435", w: 892 });

  addPostFooter(p7, "DEEP SLATE-BLUE & ROASTED TEAK", "POST 07 / 09", true);
}

// POST 08: Familienlager Recap Cover (Cobalt -> Slate-Blue Gradient + Alpine Peaks)
{
  const p8 = createPostBase(2, "Post 08 · Familienlager Recap Cover (1080×1350)", "#132435", true);
  const bg8 = track(figma.createRectangle());
  bg8.resize(1080, 1350);
  bg8.fills = [
    {
      type: "GRADIENT_LINEAR",
      gradientStops: [
        { color: rgba("#1D5B8C", 1), position: 0 },
        { color: rgba("#132435", 1), position: 0.74 },
      ],
      gradientTransform: [[0, 1, 0], [-1, 0, 1]],
    },
  ];
  p8.insertChild(0, bg8);
  bg8.layoutPositioning = "ABSOLUTE";
  bg8.x = 0;
  bg8.y = 0;

  addPostTopBar(p8, "08 · FAMILIENLAGER RECAP", true);

  const stamp8 = makeBox("HORIZONTAL", { px: 24, py: 10, bg: "#FAF9F6", radius: 6 });
  p8.appendChild(stamp8);
  addText(stamp8, "10.–11. OKTOBER · LÖRRACH / DREILÄNDERECK", { font: FONTS.monoBold, size: 18, ls: 5, color: "#132435" });

  const alpSvg = `<svg width="952" height="270" viewBox="0 0 952 270" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="952" height="270" rx="14" fill="#132435" fill-opacity="0.55" stroke="#9CC4E4" stroke-opacity="0.35"/>
    <path d="M0 232 L210 105 L390 202 L610 66 L840 185 L952 132 L952 270 L0 270 Z" fill="#1D5B8C" fill-opacity="0.52"/>
    <path d="M0 244 C240 195, 620 250, 952 204" stroke="#9CC4E4" stroke-opacity="0.55" stroke-width="2"/>
    <circle cx="610" cy="66" r="7" fill="#8C5327" stroke="#F3E8DF" stroke-width="2"/>
    <path d="M476 26V50M464 38H488" stroke="#9CC4E4" stroke-width="2"/>
  </svg>`;
  addSvg(p8, alpSvg, 952, 270, "Alpine Contours Graphic");

  addText(p8, "Familienlager VPI —\nGemeinsam im Glauben wachsen", {
    font: FONTS.sansExtra,
    size: 62,
    lh: 70,
    ls: -2,
    color: "#FFFFFF",
    w: 952,
  });
  addText(
    p8,
    "Rekap Kemah Keluarga & Pembinaan Generasi Qur'ani: Malam Keakraban, Tadabbur Alam & Workshop Orang Tua.",
    { font: FONTS.sansReg, size: 25, lh: 36, color: "#DFE8F0", w: 952 }
  );

  addPostFooter(p8, "CAROUSEL 01 / 08 · FAMILIENPROGRAMM", "SWIPE FÜR BILDER →", true);
}

// POST 09: Swiss QR-Rechnung & TWINT Donation Card (ONLY #FFFFFF exception inside SIX QR card)
{
  const p9 = createPostBase(2, "Post 09 · Swiss QR-Rechnung & TWINT Card (1080×1350)", "#132435", true);
  addPostTopBar(p9, "09 · SPENDEN & TRANSPARENZ", true);

  const tag9 = makeBox("HORIZONTAL", { px: 20, py: 9, bg: "#8C5327", radius: 999 });
  p9.appendChild(tag9);
  addText(tag9, "ART. 60–79 ZGB · OFFIZIELLE VEREINS-SPENDE", { font: FONTS.monoBold, size: 16, ls: 6, color: "#FAF9F6" });

  addText(p9, "Gemeinsam Gutes\nbewirken in der Schweiz", {
    font: FONTS.sansExtra,
    size: 56,
    lh: 64,
    ls: -2,
    color: "#FFFFFF",
    w: 952,
  });
  addText(p9, "Salurkan Infaq, Zakat & Program Sosial Anda melalui Rekening Resmi Verein Percikan Iman.", {
    font: FONTS.sansReg,
    size: 22,
    lh: 32,
    color: "#DFE8F0",
    w: 952,
  });

  // Pure #FFFFFF SIX-Compliant QR-Rechnung Quiet Zone Card (explicit v2 exception)
  const qrCard = makeBox("VERTICAL", {
    name: "SIX QR-Rechnung & TWINT White Quiet Zone",
    w: 952,
    pad: 36,
    gap: 24,
    bg: "#FFFFFF",
    radius: 16,
  });
  p9.appendChild(qrCard);

  const qrRow = makeBox("HORIZONTAL", { w: 880, gap: 36, alignCross: "CENTER", noFill: true });
  qrCard.appendChild(qrRow);

  const buildSwissQrSvg = () => {
    const cells = 21;
    const s = 12;
    let rects = "";
    const finder = (ox, oy) => {
      rects += `<rect x="${ox * s}" y="${oy * s}" width="${7 * s}" height="${7 * s}" fill="#000000"/>`;
      rects += `<rect x="${(ox + 1) * s}" y="${(oy + 1) * s}" width="${5 * s}" height="${5 * s}" fill="#FFFFFF"/>`;
      rects += `<rect x="${(ox + 2) * s}" y="${(oy + 2) * s}" width="${3 * s}" height="${3 * s}" fill="#000000"/>`;
    };
    finder(0, 0);
    finder(14, 0);
    finder(0, 14);
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        if ((r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8)) continue;
        if (r >= 8 && r <= 12 && c >= 8 && c <= 12) continue;
        if ((r * 7 + c * 11 + r * c) % 3 === 0) {
          rects += `<rect x="${c * s}" y="${r * s}" width="${s}" height="${s}" fill="#000000"/>`;
        }
      }
    }
    const cx = 8 * s, cy = 8 * s, cw = 5 * s;
    const cross = `<rect x="${cx}" y="${cy}" width="${cw}" height="${cw}" fill="#000000"/><rect x="${cx + cw * 0.4}" y="${cy + cw * 0.18}" width="${cw * 0.2}" height="${cw * 0.64}" fill="#FFFFFF"/><rect x="${cx + cw * 0.18}" y="${cy + cw * 0.4}" width="${cw * 0.64}" height="${cw * 0.2}" fill="#FFFFFF"/>`;
    return `<svg width="268" height="268" viewBox="-8 -8 268 268" xmlns="http://www.w3.org/2000/svg"><rect x="-8" y="-8" width="268" height="268" fill="#FFFFFF"/>${rects}${cross}</svg>`;
  };
  const qrWrap = makeBox("VERTICAL", { w: 280, h: 280, pad: 6, bg: "#FFFFFF", border: "#132435", bw: 2, alignMain: "CENTER", alignCross: "CENTER" });
  qrRow.appendChild(qrWrap);
  addSvg(qrWrap, buildSwissQrSvg(), 260, 260, "SIX Swiss QR Code (Pure B&W)");

  const bankCol = makeBox("VERTICAL", { w: 564, gap: 10, noFill: true });
  qrRow.appendChild(bankCol);
  addText(bankCol, "ZAHLBAR AN / REKENING RESMI", { font: FONTS.monoBold, size: 15, ls: 6, color: "#1D5B8C" });
  addText(bankCol, 'Verein "Percikan Iman"\n8000 Zürich, Schweiz', { font: FONTS.sansBold, size: 26, lh: 34, color: "#132435", w: 564 });
  addText(bankCol, "IBAN (PostFinance):", { font: FONTS.monoReg, size: 15, color: "#4A5E72" });
  addText(bankCol, "CH89 0900 0000 6049 6610 7", { font: FONTS.monoBold, size: 25, lh: 32, color: "#132435", w: 564 });
  addText(bankCol, "UID: CHE-382.914.820 · Zweck: INFAQ / ZAKAT / QURBAN", {
    font: FONTS.monoBold,
    size: 16,
    lh: 24,
    color: "#8C5327",
    w: 564,
  });

  const twintStrip = makeBox("HORIZONTAL", { w: 880, px: 20, py: 14, bg: "#DFE8F0", radius: 10, alignMain: "SPACE_BETWEEN", alignCross: "CENTER" });
  qrCard.appendChild(twintStrip);
  addText(twintStrip, "TWINT SPENDEN: Empfänger 'Verein Percikan Iman' prüfen", { font: FONTS.sansBold, size: 18, color: "#132435" });
  addText(twintStrip, "SIX QR + TWINT", { font: FONTS.monoBold, size: 16, color: "#1D5B8C" });

  addPostFooter(p9, "VEREIN PERCIKAN IMAN · 8000 ZÜRICH", "UID CHE-382.914.820", true);
}

return {
  pageId: figma.currentPage.id,
  pageName: figma.currentPage.name,
  boardName: board.name,
  boardId: board.id,
  bounds: { x: board.x, y: board.y, width: board.width, height: board.height },
  profileCardId: profileCard.id,
  hubId: hub.id,
  feedGridId: feedGrid.id,
  postIds,
  createdNodeCount: createdNodeIds.length,
  createdNodeIds,
};
