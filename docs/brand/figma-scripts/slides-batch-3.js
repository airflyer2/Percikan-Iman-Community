// slides-batch-3.js — Verein Percikan Iman Schweiz · PERCIKAN WEGWEISER (v2.0)
// Target: Figma Slides fileKey `OOd4uCcNzxHftyjXjd1EoE` (`https://www.figma.com/slides/OOd4uCcNzxHftyjXjd1EoE`)
// Builds Slides 8–10 (Ch 06 Notfall/Janazah, VPI Jahresrhythmus, Impressum & SIX QR-Rechnung)
// + Renames all 3 SLIDE_ROW section rows + Validates ALL 10 slides in the deck
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

// ── Authentic Vector Geometry from public/logo.svg (C2PA stripped, v2 colors) ──
const FLAME_UPPER = [
  "M 885.56 342.71 C 882.35 347.23 879.51 351.6 877.02 355.84 C 882.01 361.66 886.73 367.37 890.63 372.44 C 893.23 367.98 896.2 363.4 899.58 358.66 C 900.63 357.17 901.8 355.6 903.05 353.96 C 899.05 348.86 894.33 343.23 889.41 337.53 C 888.01 339.35 886.72 341.09 885.56 342.71",
  "M 946.76 321.12 C 949.7 325.24 952.32 329.25 954.67 333.15 C 960.34 326.95 965.39 321.55 968.91 317.81 C 966.52 313.79 963.82 309.65 960.77 305.38 C 959.51 303.6 958.09 301.69 956.54 299.68 C 953.44 302.96 948.27 308.46 942.23 315.04 C 943.89 317.18 945.41 319.22 946.76 321.12",
  "M 893.42 376.16 C 893.82 376.71 894.2 377.24 894.57 377.76 C 898.96 383.93 902.69 389.84 905.77 395.54 C 908.86 389.84 912.58 383.93 916.97 377.76 C 917.34 377.24 917.73 376.71 918.13 376.16 C 915.41 371.39 912.24 366.46 908.59 361.32 C 907.72 360.1 906.78 358.82 905.77 357.48 C 904.77 358.82 903.82 360.1 902.96 361.32 C 899.3 366.46 896.13 371.39 893.42 376.16",
  "M 922.14 337.53 C 917.21 343.23 912.5 348.86 908.5 353.96 C 909.75 355.6 910.91 357.17 911.97 358.66 C 915.34 363.4 918.32 367.98 920.92 372.44 C 924.82 367.37 929.53 361.66 934.52 355.84 C 932.04 351.6 929.2 347.24 925.98 342.71 C 924.83 341.09 923.54 339.35 922.14 337.53",
  "M 905.77 311.18 C 910.63 305.64 915.55 300.18 920.07 295.25 C 915.21 289.71 910.29 284.26 905.77 279.32 C 901.25 284.26 896.34 289.71 891.48 295.25 C 896 300.18 900.91 305.64 905.77 311.18",
  "M 939.52 311.6 C 945.63 304.95 950.81 299.43 953.84 296.24 C 951.68 293.55 949.35 290.71 946.92 287.82 C 944.7 285.26 942.41 282.66 940.09 280.08 C 937.32 283 932.11 288.52 925.86 295.32 C 930.71 300.9 935.42 306.47 939.52 311.6",
  "M 908.71 276.12 C 913.21 281.05 918.13 286.51 923 292.04 C 929.26 285.24 934.46 279.73 937.19 276.85 C 932.19 271.31 927.2 265.91 922.71 261.13 C 919.97 264.01 914.86 269.44 908.71 276.12",
  "M 874.34 276.83 C 877.06 279.7 882.27 285.22 888.54 292.04 C 893.41 286.51 898.33 281.05 902.84 276.12 C 896.68 269.42 891.55 263.98 888.82 261.11 C 884.33 265.89 879.34 271.29 874.34 276.83",
  "M 891.79 257.95 C 894.51 260.82 899.62 266.23 905.77 272.92 C 911.91 266.25 917.01 260.85 919.73 257.97 C 911.6 249.36 905.75 243.39 905.75 243.39 C 905.75 243.39 899.92 249.35 891.79 257.95",
  "M 857.71 296.24 C 860.73 299.43 865.92 304.95 872.02 311.6 C 876.12 306.47 880.83 300.9 885.68 295.32 C 879.41 288.51 874.2 282.97 871.43 280.06 C 869.56 282.15 867.7 284.25 865.88 286.34 C 862.99 289.75 860.23 293.09 857.71 296.24",
  "M 859.88 336.46 C 864.47 341.52 869.34 346.98 874.07 352.42 C 876.47 348.41 879.16 344.3 882.18 340.05 C 883.48 338.23 884.94 336.27 886.53 334.21 C 881.72 328.72 876.82 323.26 872.27 318.27 C 870.77 320.2 869.39 322.05 868.17 323.78 C 865.07 328.14 862.3 332.36 859.88 336.46",
  "M 905.77 350.45 C 909.82 345.34 914.53 339.72 919.43 334.07 C 915.37 328.96 910.66 323.36 905.77 317.73 C 900.89 323.36 896.18 328.96 892.12 334.07 C 897.02 339.72 901.73 345.34 905.77 350.45",
  "M 908.64 314.45 C 913.5 320.05 918.21 325.64 922.3 330.76 C 927.13 325.25 932.04 319.79 936.58 314.82 C 932.51 309.71 927.8 304.12 922.93 298.52 C 918.41 303.47 913.49 308.93 908.64 314.45",
  "M 874.97 314.82 C 879.51 319.79 884.41 325.25 889.24 330.76 C 893.33 325.64 898.04 320.05 902.91 314.45 C 898.06 308.93 893.14 303.47 888.62 298.52 C 883.75 304.12 879.04 309.71 874.97 314.82",
  "M 850.77 305.38 C 847.73 309.65 845.02 313.79 842.64 317.81 C 846.16 321.55 851.2 326.95 856.87 333.15 C 859.22 329.25 861.85 325.24 864.79 321.12 C 866.13 319.22 867.66 317.18 869.32 315.04 C 863.28 308.46 858.11 302.96 855.01 299.68 C 853.46 301.69 852.04 303.6 850.77 305.38",
  "M 929.36 340.05 C 932.38 344.3 935.07 348.41 937.47 352.42 C 942.2 346.98 947.07 341.52 951.66 336.46 C 949.24 332.36 946.48 328.14 943.38 323.78 C 942.15 322.05 940.78 320.2 939.28 318.27 C 934.73 323.26 929.82 328.72 925.02 334.21 C 926.61 336.27 928.07 338.23 929.36 340.05",
];
const FLAME_WINGS = [
  "M 831.98 377.27 C 833.05 380.55 836.95 390.78 846.93 401.2 C 846.18 399.42 845.68 398.02 845.38 397.11 C 839.29 378.31 842.09 359.32 854.59 337.06 C 849.03 330.97 844.02 325.59 840.39 321.73 C 828.96 342.44 826.39 360.04 831.98 377.27",
  "M 920.41 380.35 C 915.46 387.3 911.39 393.88 908.16 400.17 C 912.28 408.59 914.95 416.56 916.21 424.26 C 920.95 423.76 925.5 422.91 929.87 421.73 C 931.31 408.82 928.25 395.39 920.41 380.35 Z M 920.41 380.35",
  "M 956.96 337.06 C 969.45 359.32 972.26 378.31 966.16 397.11 C 965.87 398.02 965.37 399.42 964.61 401.2 C 974.6 390.78 978.5 380.55 979.56 377.27 C 985.15 360.04 982.58 342.44 971.16 321.73 C 967.53 325.59 962.52 330.97 956.96 337.06",
  "M 939.76 356.37 C 951.48 377.38 954.53 395.48 949.59 413.28 C 951.58 412.07 953.51 410.76 955.39 409.36 C 959.52 403.06 961.46 397.84 962.16 395.68 C 967.73 378.52 965.21 361 953.91 340.41 C 949.31 345.5 944.45 350.96 939.76 356.37",
  "M 923.22 376.53 C 931.81 392.41 935.39 406.66 934.26 420.4 C 937.69 419.25 941 417.88 944.18 416.28 C 944.43 415.61 944.63 415.05 944.77 414.61 C 950.29 397.59 947.86 380.21 936.78 359.84 C 931.74 365.75 927.02 371.5 923.22 376.53",
  "M 849.38 395.68 C 850.09 397.84 852.03 403.06 856.16 409.36 C 858.04 410.76 859.97 412.07 861.96 413.28 C 857.02 395.48 860.07 377.38 871.79 356.37 C 867.1 350.96 862.24 345.5 857.63 340.41 C 846.34 361 843.82 378.52 849.38 395.68",
];
const CRESCENT_PATH = "M 606.82 330.26 C 606.82 338.84 613.77 345.8 622.35 345.8 C 630.93 345.8 637.88 338.84 637.88 330.26 C 637.88 329.64 637.84 329.03 637.77 328.43 C 636.98 334.33 631.93 338.88 625.81 338.88 C 619.14 338.88 613.73 333.48 613.73 326.8 C 613.73 320.69 618.29 315.63 624.19 314.84 C 623.58 314.77 622.97 314.73 622.35 314.73 C 613.77 314.73 606.82 321.68 606.82 330.26";
const PERCIKAN_IMAN_PATHS = [
  "M 265.3 377.65 C 266.47 377.92 267.91 378.01 269.88 378.01 C 277.15 378.01 281.63 374.34 281.63 368.14 C 281.63 362.58 277.77 359.26 270.96 359.26 C 268.18 359.26 266.29 359.53 265.3 359.8 Z M 251.76 350.2 C 255.98 349.48 261.89 348.95 270.24 348.95 C 278.67 348.95 284.68 350.56 288.72 353.79 C 292.58 356.84 295.18 361.86 295.18 367.79 C 295.18 373.71 293.2 378.73 289.62 382.14 C 284.95 386.54 278.04 388.51 269.97 388.51 C 268.18 388.51 266.56 388.42 265.3 388.24 L 265.3 409.86 L 251.76 409.86 Z M 251.76 350.2",
  "M 327.83 382.95 C 327.83 379.63 326.4 374.07 320.12 374.07 C 314.38 374.07 312.04 379.27 311.68 382.95 Z M 311.77 392.28 C 312.22 397.93 317.79 400.62 324.15 400.62 C 328.82 400.62 332.59 399.99 336.27 398.82 L 338.06 408.07 C 333.57 409.86 328.1 410.75 322.18 410.75 C 307.29 410.75 298.77 402.14 298.77 388.42 C 298.77 377.29 305.68 365 320.93 365 C 335.1 365 340.48 376.04 340.48 386.89 C 340.48 389.23 340.21 391.29 340.03 392.28 Z M 311.77 392.28",
  "M 348.64 380.43 C 348.64 373.98 348.46 369.76 348.29 365.99 L 360.04 365.99 L 360.48 374.07 L 360.84 374.07 C 363.09 367.7 368.47 365 372.69 365 C 373.94 365 374.57 365 375.56 365.18 L 375.56 378.01 C 374.57 377.83 373.4 377.65 371.88 377.65 C 366.86 377.65 363.45 380.34 362.55 384.56 C 362.37 385.46 362.28 386.54 362.28 387.61 L 362.28 409.86 L 348.64 409.86 Z M 348.64 380.43",
  "M 414.94 408.78 C 412.52 409.86 407.94 410.76 402.74 410.76 C 388.57 410.76 379.5 402.14 379.5 388.33 C 379.5 375.5 388.3 365 404.62 365 C 408.21 365 412.16 365.63 415.03 366.71 L 412.88 376.85 C 411.26 376.13 408.84 375.5 405.25 375.5 C 398.07 375.5 393.41 380.61 393.5 387.79 C 393.5 395.86 398.88 400.08 405.52 400.08 C 408.75 400.08 411.26 399.54 413.32 398.73 Z M 414.94 408.78",
  "M 422.47 365.99 L 436.11 365.99 L 436.11 409.86 L 422.47 409.86 Z M 436.56 353.79 C 436.56 357.56 433.69 360.61 429.2 360.61 C 424.89 360.61 422.02 357.56 422.11 353.79 C 422.02 349.84 424.89 346.88 429.29 346.88 C 433.69 346.88 436.47 349.84 436.56 353.79",
  "M 460.69 384.47 L 460.87 384.47 C 461.86 382.68 462.93 380.88 464.01 379.18 L 472.89 365.99 L 489.3 365.99 L 473.61 383.75 L 491.55 409.86 L 474.77 409.86 L 464.19 391.83 L 460.69 396.13 L 460.69 409.86 L 447.05 409.86 L 447.05 346.16 L 460.69 346.16 Z M 460.69 384.47",
  "M 519.45 389.14 C 512.27 389.05 506.71 390.75 506.71 396.04 C 506.71 399.54 509.04 401.25 512.09 401.25 C 515.5 401.25 518.28 399 519.18 396.22 C 519.36 395.5 519.45 394.7 519.45 393.89 Z M 521.06 409.86 L 520.25 405.46 L 519.98 405.46 C 517.11 408.96 512.63 410.85 507.42 410.85 C 498.54 410.85 493.25 404.39 493.25 397.39 C 493.25 386 503.48 380.52 519 380.61 L 519 379.98 C 519 377.65 517.74 374.34 511.01 374.34 C 506.53 374.34 501.77 375.86 498.9 377.65 L 496.39 368.86 C 499.44 367.16 505.45 365 513.43 365 C 528.05 365 532.72 373.62 532.72 383.93 L 532.72 399.18 C 532.72 403.4 532.9 407.44 533.35 409.86 Z M 521.06 409.86",
  "M 543.49 379.98 C 543.49 374.51 543.3 369.85 543.13 365.99 L 554.97 365.99 L 555.6 372 L 555.87 372 C 557.66 369.22 562.14 365 569.41 365 C 578.38 365 585.11 370.93 585.11 383.84 L 585.11 409.86 L 571.48 409.86 L 571.48 385.55 C 571.48 379.89 569.5 376.04 564.57 376.04 C 560.8 376.04 558.56 378.64 557.66 381.15 C 557.3 381.96 557.12 383.3 557.12 384.56 L 557.12 409.86 L 543.49 409.86 Z M 543.49 379.98",
  "M 628.35 409.86 L 614.63 409.86 L 614.63 349.39 L 628.35 349.39 Z M 628.35 409.86",
  "M 640.01 379.98 C 640.01 374.51 639.83 369.85 639.65 365.99 L 651.13 365.99 L 651.76 371.91 L 652.03 371.91 C 653.91 369.13 657.77 365 665.31 365 C 670.96 365 675.45 367.88 677.33 372.45 L 677.51 372.45 C 679.12 370.21 681.1 368.41 683.16 367.16 C 685.58 365.72 688.27 365 691.5 365 C 699.93 365 706.3 370.93 706.3 384.02 L 706.3 409.86 L 693.03 409.86 L 693.03 386 C 693.03 379.63 690.96 375.95 686.57 375.95 C 683.43 375.95 681.19 378.1 680.29 380.7 C 679.93 381.69 679.75 383.13 679.75 384.2 L 679.75 409.86 L 666.47 409.86 L 666.47 385.28 C 666.47 379.71 664.5 375.95 660.2 375.95 C 656.7 375.95 654.63 378.64 653.82 380.88 C 653.38 381.96 653.29 383.21 653.29 384.29 L 653.29 409.86 L 640.01 409.86 Z M 640.01 379.98",
  "M 740.48 389.14 C 733.3 389.05 727.74 390.75 727.74 396.04 C 727.74 399.54 730.07 401.25 733.13 401.25 C 736.54 401.25 739.32 399 740.21 396.22 C 740.39 395.5 740.48 394.7 740.48 393.89 Z M 742.1 409.86 L 741.29 405.46 L 741.02 405.46 C 738.15 408.96 733.66 410.85 728.46 410.85 C 719.58 410.85 714.29 404.39 714.29 397.39 C 714.29 386 724.51 380.52 740.04 380.61 L 740.04 379.98 C 740.04 377.65 738.78 374.34 732.05 374.34 C 727.56 374.34 722.81 375.86 719.94 377.65 L 717.43 368.86 C 720.48 367.16 726.49 365 734.47 365 C 749.09 365 753.76 373.62 753.76 383.93 L 753.76 399.18 C 753.76 403.4 753.94 407.44 754.39 409.86 Z M 742.1 409.86",
  "M 764.52 379.98 C 764.52 374.51 764.34 369.85 764.16 365.99 L 776 365.99 L 776.63 372 L 776.9 372 C 778.7 369.22 783.18 365 790.45 365 C 799.42 365 806.15 370.93 806.15 383.84 L 806.15 409.86 L 792.51 409.86 L 792.51 385.55 C 792.51 379.89 790.54 376.04 785.61 376.04 C 781.84 376.04 779.59 378.64 778.7 381.15 C 778.34 381.96 778.16 383.3 778.16 384.56 L 778.16 409.86 L 764.52 409.86 Z M 764.52 379.98",
];
const VEREIN_GLYPHS = [
  [651.79, "M 12.44 0 L 21.81 -26.22 L 18.2 -26.22 L 13.77 -13.27 C 12.59 -9.84 11.52 -6.53 10.77 -3.5 L 10.69 -3.5 C 10 -6.58 9.02 -9.77 7.89 -13.3 L 3.81 -26.22 L 0.16 -26.22 L 8.72 0 Z M 12.44 0"],
  [679.98, "M 17.97 -8.8 C 18 -9.14 18.08 -9.69 18.08 -10.39 C 18.08 -13.84 16.45 -19.25 10.31 -19.25 C 4.83 -19.25 1.48 -14.78 1.48 -9.09 C 1.48 -3.42 4.94 0.39 10.73 0.39 C 13.73 0.39 15.8 -0.23 17 -0.78 L 16.41 -3.23 C 15.13 -2.69 13.66 -2.25 11.2 -2.25 C 7.78 -2.25 4.83 -4.16 4.75 -8.8 Z M 4.78 -11.23 C 5.06 -13.61 6.58 -16.8 10.03 -16.8 C 13.89 -16.8 14.81 -13.42 14.78 -11.23 Z M 4.78 -11.23"],
  [707.25, "M 2.84 0 L 6.22 0 L 6.22 -10.03 C 6.22 -10.61 6.3 -11.16 6.38 -11.63 C 6.84 -14.19 8.56 -16.02 10.97 -16.02 C 11.44 -16.02 11.78 -15.98 12.14 -15.91 L 12.14 -19.14 C 11.83 -19.22 11.55 -19.25 11.16 -19.25 C 8.86 -19.25 6.81 -17.66 5.95 -15.13 L 5.8 -15.13 L 5.67 -18.83 L 2.69 -18.83 C 2.8 -17.08 2.84 -15.17 2.84 -12.95 Z M 2.84 0"],
  [727.36, "M 17.97 -8.8 C 18 -9.14 18.08 -9.69 18.08 -10.39 C 18.08 -13.84 16.45 -19.25 10.31 -19.25 C 4.83 -19.25 1.48 -14.78 1.48 -9.09 C 1.48 -3.42 4.94 0.39 10.73 0.39 C 13.73 0.39 15.8 -0.23 17 -0.78 L 16.41 -3.23 C 15.13 -2.69 13.66 -2.25 11.2 -2.25 C 7.78 -2.25 4.83 -4.16 4.75 -8.8 Z M 4.78 -11.23 C 5.06 -13.61 6.58 -16.8 10.03 -16.8 C 13.89 -16.8 14.81 -13.42 14.78 -11.23 Z M 4.78 -11.23"],
  [754.62, "M 6.27 0 L 6.27 -18.83 L 2.84 -18.83 L 2.84 0 Z M 4.55 -26.25 C 3.31 -26.25 2.41 -25.31 2.41 -24.11 C 2.41 -22.95 3.27 -22.02 4.47 -22.02 C 5.83 -22.02 6.69 -22.95 6.66 -24.11 C 6.66 -25.31 5.83 -26.25 4.55 -26.25 Z M 4.55 -26.25"],
  [771.5, "M 2.84 0 L 6.27 0 L 6.27 -11.31 C 6.27 -11.91 6.34 -12.48 6.5 -12.91 C 7.08 -14.81 8.83 -16.41 11.08 -16.41 C 14.31 -16.41 15.44 -13.89 15.44 -10.84 L 15.44 0 L 18.86 0 L 18.86 -11.23 C 18.86 -17.69 14.81 -19.25 12.22 -19.25 C 9.09 -19.25 6.92 -17.5 5.98 -15.72 L 5.91 -15.72 L 5.72 -18.83 L 2.69 -18.83 C 2.8 -17.27 2.84 -15.67 2.84 -13.73 Z M 2.84 0"],
];

function buildLogoSvg(mode, w, h) {
  const upperFill = mode === "reverse" ? C.white : C.cobalt;
  const wingFill = mode === "reverse" ? C.powderSky : mode === "duotone" ? C.teak : C.steel;
  const crescentFill = mode === "reverse" ? C.powderSky : mode === "duotone" ? C.teak : C.cobalt;
  const wordFill = mode === "reverse" ? C.white : C.ink;
  const flamePaths =
    FLAME_UPPER.map((d) => `<path fill="${upperFill}" d="${d}"/>`).join("") +
    FLAME_WINGS.map((d) => `<path fill="${wingFill}" d="${d}"/>`).join("");
  const wordPaths =
    PERCIKAN_IMAN_PATHS.map((d) => `<path fill="${wordFill}" d="${d}"/>`).join("") +
    VEREIN_GLYPHS.map(([tx, d]) => `<g transform="translate(${tx} 346.73)"><path fill="${wordFill}" d="${d}"/></g>`).join("");
  return `<svg width="${w}" height="${h}" viewBox="0 0 745 196" xmlns="http://www.w3.org/2000/svg"><g transform="translate(-245 -236)">${flamePaths}<path fill="${crescentFill}" d="${CRESCENT_PATH}"/>${wordPaths}</g></svg>`;
}

function buildCornerStampSvg(crossColor = C.strongStone, arcColor = C.steel, dotColor = C.teak, size = 32) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2V22M2 12H22" stroke="${crossColor}" stroke-width="1.5"/><path d="M22 12C22 17.52 17.52 22 12 22" stroke="${arcColor}" stroke-width="1.5"/><circle cx="12" cy="12" r="2.8" fill="${dotColor}"/></svg>`;
}

function buildKawungDividerSvg(w = 1760, h = 28, dark = false) {
  const lineCol = dark ? C.steel : C.pebble;
  const motifCol = dark ? C.powderSky : C.cobalt;
  const step = 110;
  const count = Math.floor(w / step);
  const midX = Math.floor(count / 2);
  let items = `<line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke="${lineCol}" stroke-width="1"/>`;
  for (let i = 0; i <= count; i++) {
    const cx = Math.min(w - 14, Math.max(14, i * step));
    const isCenter = i === midX;
    const col = isCenter ? C.teak : i % 2 === 0 ? motifCol : C.steel;
    items += `<path d="M${cx} ${h / 2 - 8}L${cx + 8} ${h / 2}L${cx} ${h / 2 + 8}L${cx - 8} ${h / 2}Z" fill="${col}"/>`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">${items}</svg>`;
}

function buildTopoRibbonSvg(w = 960, h = 130, dark = true) {
  const s1 = dark ? C.steel : C.strongStone;
  const s2 = dark ? C.powderSky : C.cobalt;
  const step = Math.round(h * 0.14);
  const paths = [0, step, step * 2, step * 3].map((dy, idx) => {
    const col = idx === 1 ? s2 : s1;
    const op = idx === 1 ? "0.8" : "0.45";
    return `<path d="M0 ${Math.round(h * 0.32) + dy} C ${w * 0.32} ${Math.round(h * 0.08) + dy}, ${w * 0.65} ${Math.round(h * 0.52) + dy}, ${w} ${Math.round(h * 0.16) + dy}" stroke="${col}" stroke-opacity="${op}" stroke-width="1.5" fill="none"/>`;
  }).join("");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">${paths}<circle cx="${w * 0.65}" cy="${Math.round(h * 0.52) + step}" r="4" fill="${C.teak}"/></svg>`;
}

// Pure B&W SIX Swiss QR-Rechnung Vector Placeholder (Black #000000 on White #FFFFFF + Swiss Cross)
function buildSwissQrSvg(size = 336) {
  const N = 21;
  const cell = Math.floor(size / N);
  const actual = cell * N;
  const isFinder = (r, c) =>
    (r < 7 && c < 7) || (r < 7 && c >= N - 7) || (r >= N - 7 && c < 7);
  const isCenterCross = (r, c) => r >= 8 && r <= 12 && c >= 8 && c <= 12;
  let rects = `<rect width="${actual}" height="${actual}" fill="${C.white}"/>`;

  const drawFinder = (ox, oy) => {
    rects += `<rect x="${ox * cell}" y="${oy * cell}" width="${7 * cell}" height="${7 * cell}" fill="${C.black}"/>`;
    rects += `<rect x="${(ox + 1) * cell}" y="${(oy + 1) * cell}" width="${5 * cell}" height="${5 * cell}" fill="${C.white}"/>`;
    rects += `<rect x="${(ox + 2) * cell}" y="${(oy + 2) * cell}" width="${3 * cell}" height="${3 * cell}" fill="${C.black}"/>`;
  };
  drawFinder(0, 0);
  drawFinder(N - 7, 0);
  drawFinder(0, N - 7);

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (isFinder(r, c) || isCenterCross(r, c)) continue;
      if (r === 7 || c === 7) continue;
      const hash = (r * 31 + c * 17 + (r ^ c) * 13) % 11;
      if (hash < 5 || (r === 6 && c % 2 === 0) || (c === 6 && r % 2 === 0)) {
        rects += `<rect x="${c * cell}" y="${r * cell}" width="${cell}" height="${cell}" fill="${C.black}"/>`;
      }
    }
  }

  // Official SIX Swiss Cross centered in QR (black square + crisp white Swiss Cross)
  const cx = Math.floor(actual / 2);
  const box = cell * 4.2;
  const bx = Math.round(cx - box / 2);
  const by = Math.round(cx - box / 2);
  const arm = Math.round(box * 0.24);
  const len = Math.round(box * 0.62);
  rects += `<rect x="${bx - 3}" y="${by - 3}" width="${box + 6}" height="${box + 6}" fill="${C.white}"/>`;
  rects += `<rect x="${bx}" y="${by}" width="${box}" height="${box}" fill="${C.black}"/>`;
  rects += `<rect x="${Math.round(cx - arm / 2)}" y="${Math.round(cx - len / 2)}" width="${arm}" height="${len}" fill="${C.white}"/>`;
  rects += `<rect x="${Math.round(cx - len / 2)}" y="${Math.round(cx - arm / 2)}" width="${len}" height="${arm}" fill="${C.white}"/>`;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${actual} ${actual}" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
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
  const hdr = addFrame(slide, 0, 0, SLIDE_W, h, bg, { border: opts.border ?? C.pebble, bw: 1, name: "Slide Header" });
  addSvg(hdr, buildCornerStampSvg(C.strongStone, C.steel, C.teak, 32), 28, 22, 32, 32, "Corner Stamp TL");
  addSvg(hdr, buildCornerStampSvg(C.strongStone, C.steel, C.teak, 32), SLIDE_W - 60, 22, 32, 32, "Corner Stamp TR");
  addText(hdr, F.monoBold, 14, C.cobalt, "VEREIN PERCIKAN IMAN · SCHWEIZ", 80, 28, 460, 22, { ls: 8, upper: true });
  addText(hdr, F.monoReg, 14, C.steelMuted, rightTag, 1280, 28, 560, 22, { ls: 6, upper: true, align: "RIGHT" });
  addSignpostBadge(hdr, 80, 62, badgeText, { w: opts.badgeW ?? 350, h: 34, fontSize: 13 });
  addText(hdr, F.sansExtra, 42, C.ink, titleDe, 80, 104, 980, 52, { lh: 50, ls: -2 });
  addText(hdr, F.sansMed, 20, C.steelMuted, titleId, 1080, 114, 760, 36, { lh: 28, align: "RIGHT" });
  return hdr;
}

function addSlideFooter(slide, pageLabel, chapterTag, bg = C.greige) {
  const ftr = addFrame(slide, 0, 1004, SLIDE_W, 76, bg, { name: "Slide Footer" });
  addSvg(ftr, buildKawungDividerSvg(1760, 20, false), 80, 4, 1760, 20, "Footer Kawung Divider");
  addText(
    ftr,
    F.monoReg,
    13,
    C.steelMuted,
    "VEREIN «PERCIKAN IMAN» · ART. 60–79 ZGB · 8000 ZÜRICH · UID CHE-382.914.820 · POSTFINANCE CH89 0900 0000 6049 6610 7",
    80,
    34,
    1260,
    22,
    { ls: 4 }
  );
  addText(ftr, F.monoBold, 13, C.teak, `${chapterTag}  ·  ${pageLabel}`, 1380, 34, 460, 22, {
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
// SLIDE 08 · 06 NOTFALL, JANAZAH & KONSULARISCHES (Emergency Dial Grid + Janazah)
// ═══════════════════════════════════════════════════════════════════════════════
const s8 = ensureSlide("08 · 06 Notfall, Janazah & Konsularisches");
const probe = figma.createText();
s8.appendChild(probe);
const initFont = probe.fontName;
probe.remove();
const fontsToLoad = [...Object.values(F)];
if (initFont && typeof initFont === "object" && initFont.family && initFont.style) {
  fontsToLoad.unshift(initFont);
}
await Promise.all(fontsToLoad.map((font) => figma.loadFontAsync(font)));
s8.fills = solid(C.greige);

addSlideHeader(
  s8,
  "KAPITEL 06 · KRISENVORSORGE",
  "Notfall, Janazah & Konsularisches",
  "Nomor Darurat Swiss, KBRI Bern & Pengurusan Jenazah",
  "112 · 117 · 118 · 144 · 1414 · 145 · 143"
);

// Left Zone (x: 80, y: 184, w: 880, h: 798): 4x2 Emergency Matrix + KBRI Bern Cobalt Banner
const s8Left = addFrame(s8, 80, 184, 880, 798, C.greige, { name: "Ch06 Left Emergency & KBRI" });

const emergencies = [
  { num: "112", de: "Europäischer Notruf", id: "Darurat umum Eropa (aktif meski sinyal lemah)" },
  { num: "117", de: "Polizei", id: "Kepolisian (keamanan & kecelakaan lalu lintas)" },
  { num: "118", de: "Feuerwehr", id: "Pemadam kebakaran & bahaya asap / kebocoran" },
  { num: "144", de: "Sanität / Ambulanz", id: "Ambulans medis darurat (Todesbescheinigung)" },
  { num: "1414", de: "REGA Rettungsflugwacht", id: "Evakuasi medis udara / kecelakaan Alpen" },
  { num: "145", de: "Tox Info Suisse (24h)", id: "Darurat keracunan (obat, bahan kimia, jamur)" },
  { num: "143", de: "Die Dargebotene Hand", id: "Konsultasi krisis jiwa 24 jam (anonim)" },
  { num: "147", de: "Pro Juventute", id: "Saluran bantuan darurat untuk anak & remaja" },
];
emergencies.forEach((em, idx) => {
  const col = idx % 2;
  const row = Math.floor(idx / 2);
  const ex = col * 448;
  const ey = row * 154;
  const tile = addFrame(s8Left, ex, ey, 432, 138, C.ivory, { border: C.strongStone, bw: 1, radius: 10, name: `Emergency ${em.num}` });
  const is4Digit = em.num.length >= 4;
  const pillW = is4Digit ? 126 : 138;
  const txtX = pillW + 28;
  const txtW = 432 - txtX - 14;
  addRect(tile, 16, 18, pillW, 102, C.teak, { radius: 8, name: `Urgent Pill ${em.num}` });
  addText(tile, F.monoExtra, is4Digit ? 34 : 36, C.ivory, em.num, 16, 46, pillW, 46, { align: "CENTER" });
  const tNode = addText(tile, F.sansExtra, em.de.length > 20 ? 18 : 20, C.ink, em.de, txtX, 22, txtW, 28);
  addText(tile, F.sansReg, 15, C.steelMuted, em.id, txtX, Math.max(56, tNode.y + tNode.height + 6), txtW, 62, { lh: 21 });
});

// KBRI Bern Banner (y: 626..798)
const kbri = addFrame(s8Left, 0, 626, 880, 172, C.cobalt, { border: C.ink, bw: 1, radius: 12, name: "KBRI Bern Banner" });
addSignpostBadge(kbri, 24, 20, "KONSULARISCH · KBRI BERN", { w: 280, h: 32, fontSize: 12 });
addText(kbri, F.sansExtra, 24, C.ivory, "Botschaft der Republik Indonesien · Elfenauweg 51, 3006 Bern", 24, 62, 832, 32);
addText(
  kbri,
  F.sansMed,
  16,
  C.iceMist,
  "Paspor, Lapor Diri (peduliwni.kemlu.go.id) & Perlindungan WNI.\nOffizielle Sprechzeiten & Notfall-Hotline stets auf kemlu.go.id/bern verifizieren.",
  24,
  100,
  832,
  54,
  { lh: 24 }
);

// Right Zone (x: 988, y: 184, w: 852, h: 798): Municipal Janazah Guide
const s8Right = addFrame(s8, 988, 184, 852, 798, C.stone, { border: C.strongStone, bw: 1, radius: 12, name: "Ch06 Right Janazah Guide" });
addText(s8Right, F.monoBold, 14, C.cobalt, "6.2 JANAZAH & ISLAMISCHE BESTATTUNG · PENGURUSAN JENAZAH", 28, 22, 796, 20, { ls: 5 });
addText(s8Right, F.sansExtra, 28, C.ink, "Kommunales Recht & Grabfelder in der Schweiz", 28, 48, 796, 38, { ls: -1 });

const cemBox = addFrame(s8Right, 28, 98, 796, 128, C.iceMist, { border: C.steel, bw: 1, radius: 8, name: "Muslimische Grabfelder" });
addText(cemBox, F.monoBold, 13, C.cobalt, "ETABLIERTE ISLAMISCHE GRABFELDER (KOMMUNALE ZUSTÄNDIGKEIT)", 18, 14, 760, 18, { ls: 4 });
addText(
  cemBox,
  F.sansMed,
  16,
  C.ink,
  "Zürich (Eichbühl / Sihlfeld) · Basel (am Hörnli) · Bern (Bremgarten) · Genf (Petit-Saconnex) · Winterthur · St. Gallen. Für umliegende Gemeinden frühzeitig Auswärtsbestattung oder Repatriierung beantragen.",
  18,
  40,
  760,
  74,
  { lh: 23 }
);

const janazahSteps = [
  {
    n: "01",
    h: "Todesbescheinigung (144 / Notfallarzt)",
    b: "Jenazah jangan dipindahkan secara sepihak di luar rumah sakit — hubungi dokter piket / 144 untuk surat kematian resmi.",
  },
  {
    n: "02",
    h: "Bestattungsamt der Gemeinde einschalten",
    b: "Sofort klarstellen: islamische Bestattung ohne Kremation (Ghusl, Kafan, Qibla-Grab bzw. Auswärts-/Repatriierungsbewilligung).",
  },
  {
    n: "03",
    h: "VPI Trauerfall-Fonds, Bestattungsvereine & KBRI",
    b: "Kontakt via info@percikaniman.ch (Takziah & Trauerfall-Fonds), Islamische Bestattungsvereine (VIOZ/FIDS) & KBRI Bern.",
  },
  {
    n: "04",
    h: "Vorsorge: Grabesruhe (20–25 J.) & Sterbekasse",
    b: "Da Bestattungs- und Repatriierungskosten in der Schweiz hoch sind, frühzeitig Mitgliedschaft in einer Sterbekasse prüfen.",
  },
];
janazahSteps.forEach((js, idx) => {
  const jy = 244 + idx * 134;
  const card = addFrame(s8Right, 28, jy, 796, 120, C.ivory, { border: C.pebble, bw: 1, radius: 8, name: `Janazah Step ${js.n}` });
  const badgeCol = idx === 2 ? C.teak : C.ink;
  addRect(card, 18, 22, 54, 54, badgeCol, { radius: 8, name: `JStep ${js.n}` });
  addText(card, F.monoExtra, 20, C.ivory, js.n, 18, 36, 54, 24, { align: "CENTER" });
  addText(card, F.sansBold, 19, C.cobalt, js.h, 88, 18, 688, 26);
  addText(card, F.sansReg, 16, C.ink, js.b, 88, 50, 688, 58, { lh: 23 });
});

addSlideFooter(s8, "08 / 10", "06 · NOTFALL & JANAZAH");

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 09 · VPI JAHRESRHYTHMUS & REGIONALE GEMEINSCHAFT (Hubs + Kawung + 3x2)
// ═══════════════════════════════════════════════════════════════════════════════
const s9 = ensureSlide("09 · VPI Jahresrhythmus & Gemeinschaft");
s9.fills = solid(C.stone);

addSlideHeader(
  s9,
  "VEREINSKALENDER · GEMEINSCHAFT",
  "VPI Jahresrhythmus & Gemeinschaft",
  "Volketswil · Baar · Stadel · Bäch · St. Gallen · Lörrach",
  "AKTIV SEIT 2012 · STATUTEN 2025",
  { bg: C.stone, border: C.pebble, badgeW: 380 }
);

// Top Regional Hubs Strip (x: 80, y: 180, w: 1760, h: 140, C.ink Slate-Blue Ink)
const hubBar = addFrame(s9, 80, 180, 1760, 140, C.ink, { border: C.steel, bw: 1, radius: 12, name: "Regional Hubs Matrix" });
const hubList = [
  { city: "VOLKETSWIL (ZH)", loc: "Iman Zentrum\nJuchstrasse 15, 8604" },
  { city: "BAAR (ZG)", loc: "Bilal Moschee\nKanton Zug" },
  { city: "STADEL (ZH)", loc: "Sahabat Nusantara\nZürcher Unterland" },
  { city: "BÄCH (SZ)", loc: "Regionale Gastgeber\nZürichsee-Süd" },
  { city: "ST. GALLEN (SG)", loc: "Ostschweiz-Hub\nMonatliche Treffen" },
  { city: "LÖRRACH (DE)", loc: "DJH Familienlager\nHerbst · max. 60 TN" },
];
hubList.forEach((h, i) => {
  const hx = 22 + i * 288;
  const hBox = addFrame(hubBar, hx, 18, 274, 104, C.inkCard, { border: i === 0 || i === 5 ? C.teak : C.steel, bw: 1, radius: 8, name: `Hub ${h.city}` });
  addText(hBox, F.monoBold, 14, i === 0 || i === 5 ? C.powderSky : C.ivory, h.city, 16, 16, 242, 20, { ls: 4 });
  addText(hBox, F.sansMed, 15, C.iceMist, h.loc, 16, 44, 242, 46, { lh: 21 });
});

// Dedicated Full-Width Kawung-Facet Divider Band (y: 334..364)
const kawungBand = addFrame(s9, 80, 334, 1760, 28, C.stone, { name: "Modular Kawung-Facet Divider" });
addSvg(kawungBand, buildKawungDividerSvg(1760, 28, false), 0, 0, 1760, 28, "Kawung Divider SVG");

// 3x2 VPI Program Matrix (x: 80, y: 376, w: 1760, h: 610)
const progGrid = addFrame(s9, 80, 376, 1760, 610, C.stone, { name: "VPI Programs 3x2 Grid" });
const programs = [
  {
    tag: "TA'LIM BULANAN",
    title: "Monatliches Pengajian (Ta'lim)",
    when: "Monatlich sonntags · 11:00–16:00 CET",
    body: "Thematische Kajian «Back to Qur'an – Sura Al-Baqara», Jama'ah-Gebet sowie Silaturahmi & Kulinarik Nusantara in 5 Schweizer Regionen.",
    accent: C.cobalt,
  },
  {
    tag: "MUSLIMAH",
    title: "Muslimah Offline & Tahsin",
    when: "Wöchentlich Zoom (Sr. Lusi) & Vor-Ort",
    body: "Verbesserung der Rezitation (Tajwid & Makharij), My Quran Journey und ein geschützter Austauschraum für Muslimas in der Schweiz.",
    accent: C.teak,
  },
  {
    tag: "ANAK & REMAJA",
    title: "Kinder- & Jugendunterricht",
    when: "Mi & Sa (Zoom) · Outdoor Daytrips (Juni)",
    body: "Iqra & Tilawah (Sr. Sri, Sr. Susan, Sr. Atik), Jugend-Tilawah (Br. Adi / Anm. Sr. Lusi) sowie Wanderungen mit Br. Brandon & Br. David.",
    accent: C.cobalt,
  },
  {
    tag: "LINTAS GENERASI",
    title: "Familienlager VPI",
    when: "Jährlich im Herbst · DJH Lörrach (max. 60)",
    body: "Generationenübergreifendes Wochenende mit Familienvorträgen, Sport, Teamspielen und Vernetzung für Eltern & Kinder.",
    accent: C.teak,
  },
  {
    tag: "RAMADAN & NOTHILFE",
    title: "Zakat, Qurban & Sharing",
    when: "Ganzjährig & intensiv im Ramadan",
    body: "Sharing is Caring (795+ Iftar-Boxen), Zakat Fitrah & Maal (CHF 5'370), Qurban (15 Schafe) sowie Nothilfeaktionen wie Sumatera is Calling.",
    accent: C.cobalt,
  },
  {
    tag: "GOVERNANCE ART. 7",
    title: "Ordentliche Vereinsversammlung",
    when: "Jährlich Q1 (bzw. frühes Q2)",
    body: "Höchstes demokratisches Organ (Stimmrecht ab 16 J., wählbar ab 18 J.): Jahresbericht, Budget, Kollektivunterschrift & Revisionsstelle.",
    accent: C.ink,
  },
];

programs.forEach((pr, idx) => {
  const col = idx % 3;
  const row = Math.floor(idx / 3);
  const px = col * 596;
  const py = row * 308;
  const card = addFrame(progGrid, px, py, 568, 290, C.ivory, { border: C.pebble, bw: 1, radius: 10, name: `Program · ${pr.tag}` });
  const tagW = pr.tag.length > 15 ? 172 : 156;
  const whenX = tagW + 36;
  const whenW = 544 - whenX;
  addRect(card, 24, 22, tagW, 28, pr.accent, { radius: 4, name: `Tag ${pr.tag}` });
  addText(card, F.monoBold, 12, C.ivory, pr.tag, 24, 28, tagW, 18, { align: "CENTER", ls: 5 });
  addText(card, F.monoMed, 13, C.steelMuted, pr.when, whenX, 27, whenW, 20, { align: "RIGHT" });
  addText(card, F.sansExtra, 23, C.ink, pr.title, 24, 68, 520, 34, { ls: -1 });
  addRect(card, 24, 114, 520, 1, C.pebble);
  addText(card, F.sansReg, 17, C.steelMuted, pr.body, 24, 132, 520, 128, { lh: 26 });
});

addSlideFooter(s9, "09 / 10", "VPI JAHRESRHYTHMUS", C.stone);

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 · IMPRESSUM, QR-RECHNUNG & KONTAKT (Dark Closing + Pure #FFFFFF SIX QR)
// ═══════════════════════════════════════════════════════════════════════════════
const s10 = ensureSlide("10 · Impressum, QR-Rechnung & Kontakt");
s10.fills = solid(C.ink);

// Left Zone (x: 0..1120, y: 0..1080): Dark Slate-Blue Legal Impressum & Contact
const s10Left = addFrame(s10, 0, 0, 1120, SLIDE_H, C.ink, { name: "Closing Left Impressum" });
addSvg(s10Left, buildCornerStampSvg(C.powderSky, C.steel, C.teak, 36), 28, 28, 36, 36, "Closing Stamp TL");
addSvg(s10Left, buildLogoSvg("reverse", 350, 92), 80, 62, 350, 92, "Closing Reverse Logo");
addText(s10Left, F.monoBold, 14, C.powderSky, "10 / 10 · IMPRESSUM & KONTAKT", 720, 94, 320, 22, { ls: 6, align: "RIGHT" });

addSignpostBadge(s10Left, 80, 190, "IMPRESSUM & RECHTLICHER HINWEIS · PENAFIAN", { w: 480, h: 38, fontSize: 13 });

addText(
  s10Left,
  F.sansExtra,
  54,
  C.ivory,
  "Gemeinsam orientiert.\nRechtlich klar. Spirituell geerdet.",
  80,
  252,
  960,
  132,
  { lh: 62, ls: -2 }
);
addText(
  s10Left,
  F.sansMed,
  22,
  C.powderSky,
  "Bersama membangun generasi Muslim Indonesia–Asia Tenggara yang kokoh, amanah, dan istikamah di Swiss.",
  80,
  402,
  940,
  62,
  { lh: 30 }
);

const legalCard = addFrame(s10Left, 80, 488, 960, 256, C.inkCard, { border: C.steel, bw: 1, radius: 12, name: "Impressum Legal Block" });
const impRows = [
  ["HERAUSGEBER", "Verein «Percikan Iman» · Verein Percikan Iman Schweiz · 8000 Zürich, Schweiz"],
  ["RECHTSFORM & UID", "Schweizer Verein gemäss Art. 60–79 ZGB · UID CHE-382.914.820"],
  ["KONTAKT & WEB", "info@percikaniman.ch · percikaniman.ch · Instagram @verein.pi"],
  ["BANK / POSTFINANCE", "PostFinance AG · IBAN CH89 0900 0000 6049 6610 7"],
];
impRows.forEach(([k, v], idx) => {
  const ry = 22 + idx * 56;
  addText(legalCard, F.monoBold, 13, C.powderSky, k, 28, ry + 4, 210, 22, { ls: 5 });
  addText(legalCard, F.sansMed, 17, C.ivory, v, 250, ry + 2, 682, 26);
  if (idx < 3) addRect(legalCard, 28, ry + 42, 904, 1, C.steel, { opacity: 0.35 });
});

addText(
  s10Left,
  F.sansReg,
  16,
  C.iceMist,
  "Stand: Edition 2026 (v2.0) · Sämtliche Angaben zu kantonalen Schul-, Steuer- und Zollregeln dienen der Erstorientierung und ersetzen keine behördliche Einzelauskunft. Bei Abweichungen gelten die Statuten (deutsche Fassung, 07.01.2025).",
  80,
  774,
  960,
  84,
  { lh: 25 }
);

addSvg(s10Left, buildTopoRibbonSvg(960, 130, true), 80, 916, 960, 130, "Closing Topo Ribbon");

// Right Zone (x: 1120..1920, y: 0..1080): SIX Swiss QR-Rechnung & TWINT Card
const s10Right = addFrame(s10, 1120, 0, 800, SLIDE_H, C.inkPanel, { border: C.steel, bw: 1, name: "Closing Right QR Showcase" });
addSvg(s10Right, buildCornerStampSvg(C.powderSky, C.steel, C.teak, 36), 736, 28, 36, 36, "Closing Stamp TR");
addText(s10Right, F.monoBold, 14, C.powderSky, "SIX SWISS QR-RECHNUNG & TWINT", 64, 68, 620, 22, { ls: 6 });

const qrContainer = addFrame(s10Right, 64, 112, 672, 888, C.ivory, { border: C.strongStone, bw: 1, radius: 16, name: "SIX QR Container" });
const qrTop = addFrame(qrContainer, 0, 0, 672, 84, C.cobalt, { name: "QR Top Header" });
addText(qrTop, F.monoBold, 15, C.ivory, "ZAHLTEIL / RECEIPT · VEREIN PERCIKAN IMAN", 28, 30, 616, 24, { ls: 6, align: "CENTER" });

// Pure #FFFFFF Quiet Zone strictly reserved for SIX Swiss QR-Rechnung
const qrWhiteZone = addFrame(qrContainer, 136, 112, 400, 400, C.white, { border: C.pebble, bw: 1, radius: 4, name: "SIX QR White Quiet Zone" });
addSvg(qrWhiteZone, buildSwissQrSvg(336), 32, 32, 336, 336, "SIX Swiss QR Vector");

addText(qrContainer, F.monoBold, 13, C.cobalt, "KONTO / ZAHLBAR AN (POSTFINANCE AG)", 40, 536, 592, 20, { ls: 5, align: "CENTER" });
addText(qrContainer, F.monoExtra, 26, C.ink, "CH89 0900 0000 6049 6610 7", 40, 562, 592, 34, { align: "CENTER", ls: 1 });
addText(qrContainer, F.sansMed, 16, C.steelMuted, "Verein Percikan Iman · 8000 Zürich · UID CHE-382.914.820", 40, 602, 592, 24, { align: "CENTER" });

addRect(qrContainer, 40, 644, 592, 1, C.pebble);
addText(qrContainer, F.monoBold, 13, C.teak, "ZWECKCODE ANGEBEN (ÜBERWEISUNG / TWINT):", 40, 660, 592, 20, { align: "CENTER", ls: 5 });

const qrPills = ["INFAQ", "ZAKAT-FITRAH", "ZAKAT-MAAL", "QURBAN", "SHARING-CARING", "TRAUERFALL"];
qrPills.forEach((p, idx) => {
  const col = idx % 3;
  const row = Math.floor(idx / 3);
  const px = 44 + col * 198;
  const py = 692 + row * 44;
  addRect(qrContainer, px, py, 186, 34, C.teak, { radius: 4, name: `QR Pill ${p}` });
  addText(qrContainer, F.monoBold, 12, C.ivory, p, px, py + 9, 186, 18, { align: "CENTER", ls: 4 });
});

const twintNote = addFrame(qrContainer, 40, 792, 592, 68, C.iceMist, { border: C.steel, bw: 1, radius: 8, name: "TWINT Verification Note" });
addText(
  twintNote,
  F.sansMed,
  15,
  C.ink,
  "TWINT-Zahlungen: Empfänger «Verein Percikan Iman» vor Bestätigung prüfen.",
  20,
  22,
  552,
  24,
  { align: "CENTER" }
);

// ── Group all 10 slides into 3 Section Rows + Rename SLIDE_ROW Sections ──────
const flat = figma.getSlideGrid().flat();
if (flat.length === 10) {
  figma.setSlideGrid([flat.slice(0, 3), flat.slice(3, 6), flat.slice(6, 10)]);
}

const slideGrid = figma.currentPage.children.find((c) => c.type === "SLIDE_GRID");
const SECTION_NAMES = [
  "Intro & Orientierung",
  "Alltag in der Schweiz",
  "Finanzen, Notfall & Gemeinschaft",
];
if (slideGrid && slideGrid.children) {
  SECTION_NAMES.forEach((secName, idx) => {
    if (slideGrid.children[idx]) {
      slideGrid.children[idx].name = secName;
    }
  });
}

// ── Full-Deck (All 10 Slides) Deterministic Layout & Compliance Validation ────
function validateAllSlides(slides) {
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
  return { clean: issues.length === 0, slideCount: slides.length, issues };
}

const fullGrid = figma.getSlideGrid();
const allSlides = fullGrid.flat();
const fullDeckValidation = validateAllSlides(allSlides);

return {
  batch: 3,
  slidesBuilt: [s8, s9, s10].map((s) => ({ id: s.id, name: s.name })),
  sectionRows: slideGrid
    ? slideGrid.children.map((r, idx) => ({ row: idx, name: r.name, slideCount: fullGrid[idx]?.length ?? 0 }))
    : [],
  allDeckSlides: fullGrid.map((row, r) => row.map((s, c) => ({ row: r, col: c, id: s.id, name: s.name }))),
  validation: fullDeckValidation,
  createdNodeIdsCount: createdNodeIds.length,
  createdNodeIds,
};
