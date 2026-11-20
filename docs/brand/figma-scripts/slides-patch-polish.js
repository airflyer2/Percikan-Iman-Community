// slides-patch-polish.js — Surgical Polish & 3-Row Section Organization for File B
// Target: Figma Slides fileKey `OOd4uCcNzxHftyjXjd1EoE` (`https://www.figma.com/slides/OOd4uCcNzxHftyjXjd1EoE`)
// Patches the 6 visual polish items on live Slides 01, 04, 06, 07, 08, 09 + organizes all 10 slides into 3 section rows
// Skill: `figma-use-slides`

const SLIDE_W = 1920;
const SLIDE_H = 1080;

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

const ROW_LAYOUT = [
  { name: "Intro & Orientierung", ids: ["8:2", "8:150", "8:268"] },
  { name: "Alltag in der Schweiz", ids: ["8:365", "9:5", "9:120"] },
  { name: "Finanzen, Notfall & Gemeinschaft", ids: ["9:227", "10:5", "10:122", "10:245"] },
];

// Batch-fetch all target nodes & slide nodes in one Promise.all
const TARGET_IDS = [
  "8:82",
  "8:377", "8:378", "8:379", "8:381",
  "9:167", "9:170", "9:172", "9:173", "9:175", "9:176", "9:178",
  "9:239", "9:240", "9:241", "9:243",
  "10:47", "10:48", "10:49", "10:50",
  "10:203", "10:204", "10:205",
  ...ROW_LAYOUT.flatMap((r) => r.ids),
];

const [nodesList] = await Promise.all([
  Promise.all(TARGET_IDS.map((id) => figma.getNodeByIdAsync(id))),
  ...Object.values(F).map((font) => figma.loadFontAsync(font)),
]);

const byId = new Map();
TARGET_IDS.forEach((id, i) => {
  if (nodesList[i]) byId.set(id, nodesList[i]);
});

const get = (id) => {
  const n = byId.get(id);
  if (!n) throw new Error(`Missing expected node ${id}`);
  return n;
};

// Also ensure any existing font on mutated text nodes is loaded
const textNodesToTouch = [
  "8:381", "9:172", "9:175", "9:178", "9:243", "10:48", "10:49", "10:50", "10:204", "10:205",
];
const extraFonts = new Map();
for (const tid of textNodesToTouch) {
  const t = get(tid);
  if (t.type === "TEXT" && t.fontName !== figma.mixed) {
    extraFonts.set(`${t.fontName.family}::${t.fontName.style}`, t.fontName);
  }
}
const card2 = get("8:82");
const metaCards = card2.parent.children
  .filter((c) => c.type === "FRAME" && c.name.startsWith("Meta · "))
  .sort((a, b) => a.x - b.x);
for (const mc of metaCards) {
  for (const ch of mc.children) {
    if (ch.type === "TEXT" && ch.fontName !== figma.mixed) {
      extraFonts.set(`${ch.fontName.family}::${ch.fontName.style}`, ch.fontName);
    }
  }
}
await Promise.all([...extraFonts.values()].map((f) => figma.loadFontAsync(f)));

// 1. Slide 01 (8:2) — Widen Bank Card (8:82) and rebalance 3 Meta cards so IBAN stays on 1 line
const metaSpecs = [
  { x: 80, w: 326 },
  { x: 420, w: 390 },
  { x: 824, w: 276 },
];
metaCards.forEach((mc, idx) => {
  const spec = metaSpecs[idx];
  if (!spec) return;
  mc.x = spec.x;
  mc.resize(spec.w, 134);
  const texts = mc.children.filter((c) => c.type === "TEXT").sort((a, b) => a.y - b.y);
  if (texts[0]) {
    texts[0].x = 18;
    texts[0].resize(spec.w - 36, 20);
  }
  if (texts[1]) {
    texts[1].x = 18;
    texts[1].fontSize = 15;
    texts[1].resize(spec.w - 36, 64);
    texts[1].textAutoResize = "HEIGHT";
  }
});

// 2. Slide 04 (8:365) — Widen Header Signpost ("KAPITEL 02 · LEBENSMITTELKOMPETENZ")
const b4 = get("8:377");
const b4Body = get("8:378");
const b4Ptr = get("8:379");
const b4Lbl = get("8:381");
b4.resize(396, 34);
b4Body.resize(378, 34);
b4Ptr.x = 376;
b4Lbl.resize(356, 20);
b4Lbl.textAutoResize = "HEIGHT";
b4Lbl.y = 8;

// 3. Slide 06 (9:120) — Give Dialog 1..3 cards more vertical room (no 4px bottom clip)
const snippet = get("9:167");
snippet.resize(800, 146);
const dialogMoves = [
  { frameId: "9:170", bodyId: "9:172", y: 256 },
  { frameId: "9:173", bodyId: "9:175", y: 350 },
  { frameId: "9:176", bodyId: "9:178", y: 444 },
];
for (const dm of dialogMoves) {
  const df = get(dm.frameId);
  const bt = get(dm.bodyId);
  df.y = dm.y;
  df.resize(800, 84);
  bt.lineHeight = { value: 20, unit: "PIXELS" };
  bt.resize(764, 42);
  bt.textAutoResize = "HEIGHT";
}

// 4. Slide 07 (9:227) — Widen Header Signpost ("KAPITEL 05 · FINANZIELLE INTEGRITÄT")
const b7 = get("9:239");
const b7Body = get("9:240");
const b7Ptr = get("9:241");
const b7Lbl = get("9:243");
b7.resize(404, 34);
b7Body.resize(386, 34);
b7Ptr.x = 384;
b7Lbl.resize(364, 20);
b7Lbl.textAutoResize = "HEIGHT";
b7Lbl.y = 8;

// 5. Slide 08 (10:5) — Emergency 1414 Card (10:46): single-line title + clear gap above subtitle
const pill1414 = get("10:47");
const num1414 = get("10:48");
const title1414 = get("10:49");
const sub1414 = get("10:50");
pill1414.resize(126, 102);
num1414.resize(126, 46);
title1414.x = 154;
title1414.fontSize = 18;
title1414.resize(264, 26);
title1414.textAutoResize = "HEIGHT";
sub1414.x = 154;
sub1414.resize(264, 62);
sub1414.textAutoResize = "HEIGHT";
sub1414.y = Math.max(56, title1414.y + title1414.height + 6);

// 6. Slide 09 (10:122) — Familienlager VPI Card (10:202): keep timing string on 1 line
const tagFam = get("10:203");
const tagTxt = get("10:204");
const whenFam = get("10:205");
tagFam.resize(156, 28);
tagTxt.resize(156, 18);
whenFam.x = 192;
whenFam.resize(352, 20);
whenFam.textAutoResize = "HEIGHT";

// 7. Organize all 10 existing slides into 3 section rows via setSlideGrid + rename SLIDE_ROWs
const targetGrid = ROW_LAYOUT.map((row) => row.ids.map((id) => get(id)));
figma.setSlideGrid(targetGrid);

const slideGrid = figma.currentPage.children.find((c) => c.type === "SLIDE_GRID");
if (slideGrid && slideGrid.children) {
  ROW_LAYOUT.forEach((row, idx) => {
    if (slideGrid.children[idx]) {
      slideGrid.children[idx].name = row.name;
    }
  });
}

// ── Full-Deck Overlap, Out-of-Bounds & Deep Text-Clipping Validation ──────────
function validateDeck(slides) {
  const issues = [];
  const OVERLAP_PX = 4;
  const OVERFLOW_PX = 1;
  for (const slide of slides) {
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
          issues.push({ slide: slide.id, type: "overlap", nodes: [a.name, b.name] });
        }
      }
      const c = kids[i];
      if (c.x < -OVERFLOW_PX || c.y < -OVERFLOW_PX || c.x + c.w > SLIDE_W + OVERFLOW_PX || c.y + c.h > SLIDE_H + OVERFLOW_PX) {
        issues.push({ slide: slide.id, type: "outOfBounds", node: c.name });
      }
      if (c.type === "FRAME") {
        const frames = [c.node, ...c.node.findAllWithCriteria({ types: ["FRAME"] })];
        for (const fr of frames) {
          const pAbs = fr.absoluteBoundingBox;
          if (!pAbs) continue;
          for (const ch of fr.children) {
            if (ch.type !== "TEXT") continue;
            const abs = ch.absoluteBoundingBox;
            if (!abs) continue;
            if (
              abs.x + abs.width > pAbs.x + pAbs.width + OVERFLOW_PX ||
              abs.y + abs.height > pAbs.y + pAbs.height + OVERFLOW_PX
            ) {
              issues.push({
                slide: slide.id,
                type: "textClip",
                node: ch.id,
                chars: ch.characters.slice(0, 40),
                parent: fr.name,
                dy: Math.round(abs.y + abs.height - (pAbs.y + pAbs.height)),
              });
            }
          }
        }
      }
    }
  }
  return { clean: issues.length === 0, slideCount: slides.length, issues };
}

const currentGrid = figma.getSlideGrid();
const validation = validateDeck(currentGrid.flat());

return {
  patched: true,
  sectionRows: slideGrid
    ? slideGrid.children.map((r, idx) => ({ row: idx, name: r.name, slideIds: currentGrid[idx]?.map((s) => s.id) ?? [] }))
    : [],
  validation,
};
