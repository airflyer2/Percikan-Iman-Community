// slides-batch-1.js — Verein Percikan Iman Schweiz · PERCIKAN WEGWEISER (v2.0)
// Target: Figma Slides fileKey `OOd4uCcNzxHftyjXjd1EoE` (`https://www.figma.com/slides/OOd4uCcNzxHftyjXjd1EoE`)
// Builds Slides 1–4 (Cover, Inhaltsverzeichnis, Ch 01 Willkommen & ZGB, Ch 02 Halal & E-Nummern)
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

// Fonts loaded right after first slide is ensured (guarantees non-empty slide grid)

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
    FLAME_WINGS.map((d, idx) => `<path fill="${idx === 1 && mode === "emblem-dark" ? C.teak : wingFill}" d="${d}"/>`).join("");
  if (mode === "emblem" || mode === "emblem-dark") {
    const u = mode === "emblem-dark" ? C.powderSky : C.cobalt;
    const wCol = mode === "emblem-dark" ? C.steel : C.cobalt;
    return `<svg width="${w}" height="${h}" viewBox="0 0 172 192" xmlns="http://www.w3.org/2000/svg"><g transform="translate(-820 -238)">${FLAME_UPPER.map((d) => `<path fill="${u}" d="${d}"/>`).join("")}${FLAME_WINGS.map((d, idx) => `<path fill="${idx === 1 ? C.teak : wCol}" d="${d}"/>`).join("")}</g></svg>`;
  }
  const wordPaths =
    PERCIKAN_IMAN_PATHS.map((d) => `<path fill="${wordFill}" d="${d}"/>`).join("") +
    VEREIN_GLYPHS.map(([tx, d]) => `<g transform="translate(${tx} 346.73)"><path fill="${wordFill}" d="${d}"/></g>`).join("");
  return `<svg width="${w}" height="${h}" viewBox="0 0 745 196" xmlns="http://www.w3.org/2000/svg"><g transform="translate(-245 -236)">${flamePaths}<path fill="${crescentFill}" d="${CRESCENT_PATH}"/>${wordPaths}</g></svg>`;
}

function buildCornerStampSvg(crossColor = C.strongStone, arcColor = C.steel, dotColor = C.teak, size = 36) {
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

function buildTopoRibbonSvg(w = 740, h = 180, dark = true) {
  const s1 = dark ? C.steel : C.strongStone;
  const s2 = dark ? C.powderSky : C.cobalt;
  const step = Math.round(h * 0.11);
  const paths = [0, step, step * 2, step * 3, step * 4].map((dy, idx) => {
    const col = idx === 2 ? s2 : s1;
    const op = idx === 2 ? "0.85" : "0.45";
    return `<path d="M0 ${Math.round(h * 0.38) + dy} C ${w * 0.28} ${Math.round(h * 0.08) + dy}, ${w * 0.54} ${Math.round(h * 0.48) + dy}, ${w} ${Math.round(h * 0.16) + dy}" stroke="${col}" stroke-opacity="${op}" stroke-width="${idx === 2 ? 2 : 1.2}" fill="none"/>`;
  }).join("");
  const grid = `<path d="M${w * 0.72} ${Math.round(h * 0.08)} V ${Math.round(h * 0.28)} M ${w * 0.72 - 18} ${Math.round(h * 0.18)} H ${w * 0.72 + 18}" stroke="${s2}" stroke-width="1.2"/><circle cx="${w * 0.54}" cy="${Math.round(h * 0.48) + step * 2}" r="4.5" fill="${C.teak}"/>`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">${paths}${grid}</svg>`;
}

// ── Wegweiser Signpost Badge (Swiss Trail Sign in Roasted Teak #8C5327) ───────
function addSignpostBadge(parent, x, y, text, opts = {}) {
  const h = opts.h ?? 38;
  const w = Math.max(opts.w ?? 0, 180, Math.round(text.length * 10.6) + 64);
  const bg = opts.bg ?? C.teak;
  const txtCol = opts.color ?? C.ivory;
  const wrap = addFrame(parent, x, y, w, h, null, { name: `Signpost · ${text}` });
  const bodyW = w - 18;
  addRect(wrap, 0, 0, bodyW, h, bg, { radius: 4, name: "Signpost Body" });
  const tipSvg = `<svg width="20" height="${h}" viewBox="0 0 20 ${h}" xmlns="http://www.w3.org/2000/svg"><path d="M0 0L20 ${h / 2}L0 ${h}Z" fill="${bg}"/></svg>`;
  addSvg(wrap, tipSvg, bodyW - 2, 0, 20, h, "Signpost Pointer");
  addText(wrap, F.monoBold, opts.fontSize ?? 14, txtCol, text, 16, Math.round((h - 18) / 2), bodyW - 22, 20, {
    ls: 7,
    upper: true,
    name: "Signpost Label",
  });
  return wrap;
}

// ── Reusable Swiss Header & Footer Bands (disjoint non-overlapping zones) ─────
function addSlideHeader(slide, badgeText, titleDe, titleId, rightTag, opts = {}) {
  const bg = opts.bg ?? C.greige;
  const h = opts.h ?? 164;
  const hdr = addFrame(slide, 0, 0, SLIDE_W, h, bg, { border: opts.border ?? C.pebble, bw: 1, name: "Slide Header" });
  addSvg(hdr, buildCornerStampSvg(C.strongStone, C.steel, C.teak, 32), 28, 22, 32, 32, "Corner Stamp TL");
  addSvg(hdr, buildCornerStampSvg(C.strongStone, C.steel, C.teak, 32), SLIDE_W - 60, 22, 32, 32, "Corner Stamp TR");
  addText(hdr, F.monoBold, 14, C.cobalt, "VEREIN PERCIKAN IMAN · SCHWEIZ", 80, 28, 460, 22, { ls: 8, upper: true });
  addText(hdr, F.monoReg, 14, C.steelMuted, rightTag, 1280, 28, 560, 22, { ls: 6, upper: true, align: "RIGHT" });
  addSignpostBadge(hdr, 80, 62, badgeText, { w: opts.badgeW ?? 320, h: 34, fontSize: 13 });
  addText(hdr, F.sansExtra, 42, C.ink, titleDe, 80, 104, 980, 52, { lh: 50, ls: -2 });
  addText(hdr, F.sansMed, 20, C.steelMuted, titleId, 1080, 114, 760, 36, { lh: 28, align: "RIGHT" });
  return hdr;
}

function addSlideFooter(slide, pageLabel, chapterTag, dark = false) {
  const bg = dark ? C.ink : C.greige;
  const ftr = addFrame(slide, 0, 1004, SLIDE_W, 76, bg, { name: "Slide Footer" });
  addSvg(ftr, buildKawungDividerSvg(1760, 20, dark), 80, 4, 1760, 20, "Footer Kawung Divider");
  addText(
    ftr,
    F.monoReg,
    13,
    dark ? C.powderSky : C.steelMuted,
    "VEREIN «PERCIKAN IMAN» · ART. 60–79 ZGB · 8000 ZÜRICH · UID CHE-382.914.820 · POSTFINANCE CH89 0900 0000 6049 6610 7",
    80,
    34,
    1260,
    22,
    { ls: 4 }
  );
  addText(
    ftr,
    F.monoBold,
    13,
    dark ? C.ivory : C.teak,
    `${chapterTag}  ·  ${pageLabel}`,
    1380,
    34,
    460,
    22,
    { ls: 6, align: "RIGHT", upper: true }
  );
  return ftr;
}

// ── Idempotent Slide Grid Manager ─────────────────────────────────────────────
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
// SLIDE 01 · COVER — PERCIKAN WEGWEISER (Deep Slate-Blue #132435 Asymmetric Split)
// ═══════════════════════════════════════════════════════════════════════════════
const s1 = ensureSlide("01 · Cover — Percikan Wegweiser");
const probe = figma.createText();
s1.appendChild(probe);
const initFont = probe.fontName;
probe.remove();
const fontsToLoad = [...Object.values(F)];
if (initFont && typeof initFont === "object" && initFont.family && initFont.style) {
  fontsToLoad.unshift(initFont);
}
await Promise.all(fontsToLoad.map((font) => figma.loadFontAsync(font)));
s1.fills = solid(C.ink);

// Left Hero Zone (x: 0..1180)
const s1Left = addFrame(s1, 0, 0, 1180, SLIDE_H, C.ink, { name: "Cover Left Hero" });
addSvg(s1Left, buildCornerStampSvg(C.powderSky, C.steel, C.teak, 36), 28, 28, 36, 36, "Cover Stamp TL");
addSvg(s1Left, buildLogoSvg("reverse", 360, 95), 80, 64, 360, 95, "VPI Reverse Logo");
addText(s1Left, F.monoBold, 14, C.powderSky, "EDITION 2026 · v2.0 · SCHWEIZ", 760, 98, 340, 24, { ls: 8, align: "RIGHT", upper: true });

addSignpostBadge(s1Left, 80, 212, "WEGWEISER · DUAL-TRACK DE / ID", { w: 400, h: 42, fontSize: 15 });

addText(s1Left, F.sansExtra, 82, C.ivory, "PERCIKAN\nWEGWEISER", 80, 284, 1020, 190, {
  lh: 88,
  ls: -2.5,
  name: "Cover Title",
});
addText(s1Left, F.sansBold, 34, C.powderSky, "Muslim Life & Family Guide Switzerland", 80, 488, 1000, 48, {
  lh: 42,
  ls: -1,
});
addText(
  s1Left,
  F.sansMed,
  24,
  C.iceMist,
  "Panduan Kehidupan Muslim & Keluarga di Swiss — Hukum Sipil, Halal, Ibadah, Sekolah Publik & Transparansi Verein.",
  80,
  548,
  980,
  78,
  { lh: 34 }
);

addSvg(s1Left, buildKawungDividerSvg(1020, 24, true), 80, 654, 1020, 24, "Cover Kawung Divider");

// 3 Legal & Banking Pill Cards at bottom-left
const coverMetaCards = [
  { x: 80,  w: 326, k: "RECHTSFORM · STATUTEN", v: "Schweizer Verein Art. 60–79 ZGB\n8000 Zürich · Gegründet 23.02.2025" },
  { x: 420, w: 390, k: "UID & BANKVERBINDUNG", v: "UID CHE-382.914.820\nPostFinance CH89 0900 0000 6049 6610 7" },
  { x: 824, w: 276, k: "KONTAKT & KANÄLE", v: "percikaniman.ch · @verein.pi\ninfo@percikaniman.ch" },
];
for (const mc of coverMetaCards) {
  const card = addFrame(s1Left, mc.x, 718, mc.w, 134, C.inkCard, { border: C.steel, bw: 1, radius: 10, name: `Meta · ${mc.k}` });
  addText(card, F.monoBold, 13, C.powderSky, mc.k, 18, 20, mc.w - 36, 20, { ls: 6, upper: true });
  addText(card, F.sansMed, 15, C.ivory, mc.v, 18, 52, mc.w - 36, 64, { lh: 26 });
}
addText(
  s1Left,
  F.monoReg,
  14,
  C.powderSky,
  "SWISS CIVIC ATELIER × ARCHIPELAGO NUSANTARA · AKTIV SEIT 2012 · 77+ FAMILIEN",
  80,
  996,
  1020,
  24,
  { ls: 6, upper: true }
);

// Right Motif & Chapter Index Field (x: 1180..1920)
const s1Right = addFrame(s1, 1180, 0, 740, SLIDE_H, C.inkPanel, { border: C.steel, bw: 1, name: "Cover Right Motif Field" });
addSvg(s1Right, buildTopoRibbonSvg(740, 180, true), 0, 72, 740, 180, "Cover Topographic Ribbon");
addSvg(s1Right, buildCornerStampSvg(C.powderSky, C.steel, C.teak, 36), 676, 24, 36, 36, "Cover Stamp TR");

// Centerpiece Emblem Card
const emblemStage = addFrame(s1Right, 80, 270, 580, 360, C.ink, { border: C.steel, bw: 1, radius: 16, name: "Emblem Showcase" });
addSvg(emblemStage, buildLogoSvg("emblem-dark", 210, 234), 64, 62, 210, 234, "Faceted Flame Emblem");
addText(emblemStage, F.monoBold, 14, C.powderSky, "ANATOMY OF THE SPARK", 304, 80, 240, 22, { ls: 6, upper: true });
addText(emblemStage, F.sansExtra, 30, C.ivory, "Orientierung\nim Alltag", 304, 116, 240, 82, { lh: 36, ls: -1 });
addText(emblemStage, F.sansReg, 17, C.iceMist, "6 Kapitel · 10 Slides\nDeutsch & Bahasa Indonesia", 304, 214, 240, 62, { lh: 26 });

// Chapter Index List (bottom right)
const chList = addFrame(s1Right, 80, 666, 580, 344, C.inkCard, { border: C.steel, bw: 1, radius: 12, name: "Cover Chapter Index" });
addText(chList, F.monoBold, 13, C.powderSky, "KAPITELÜBERSICHT · RINGKASAN BAB", 24, 20, 530, 20, { ls: 6, upper: true });
const tocQuick = [
  ["01", "Willkommen & ZGB Orientierung"],
  ["02", "Halal Einkaufen & E-Nummern"],
  ["03", "Gebet, Moscheen & Ramadan"],
  ["04", "Schweizer Schule, Kinder & Familie"],
  ["05", "Zakat, Steuern & Spendenrecht"],
  ["06", "Notfall, Janazah & VPI Gemeinschaft"],
];
tocQuick.forEach(([num, label], i) => {
  const rowY = 56 + i * 44;
  addRect(chList, 24, rowY, 44, 30, C.teak, { radius: 4, name: `Idx Pill ${num}` });
  addText(chList, F.monoBold, 14, C.ivory, num, 24, rowY + 5, 44, 20, { align: "CENTER" });
  addText(chList, F.sansMed, 18, C.ivory, label, 84, rowY + 3, 470, 26);
});

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 02 · INHALTSVERZEICHNIS · DAFTAR ISI (6-Cell Hairline Grid on #EAE6DF)
// ═══════════════════════════════════════════════════════════════════════════════
const s2 = ensureSlide("02 · Inhaltsverzeichnis · Daftar Isi");
s2.fills = solid(C.greige);

addSlideHeader(
  s2,
  "ÜBERSICHT · DAFTAR ISI 01–06",
  "Inhaltsverzeichnis · Daftar Isi",
  "6 Kapitel für den Schweizer Alltag · Dual-Track DE + ID",
  "SEKTION 01 · INTRO & ORIENTIERUNG"
);

const tocMain = addFrame(s2, 80, 188, 1760, 796, C.greige, { name: "TOC 6-Cell Grid" });
const chapters = [
  {
    num: "01",
    de: "Willkommen & Orientierung",
    id: "Selamat Datang di Swiss",
    desc: "Rechtsform gemäss Art. 60–79 ZGB, 26-Kantone-Föderalismus, Kirchensteuer-Hinweis & Checkliste für die ersten 30 Tage.",
    slideRef: "SLIDE 03 · RECHT & ANKUNFT",
    bg: C.stone,
  },
  {
    num: "02",
    de: "Halal Einkaufen & E-Nummern",
    id: "Belanja Halal & Panduan Kode E",
    desc: "Migros & Coop Sortiment, kritische E-Codes (E120, E441, E471), DE/FR-Etikettenwörter, Metzgereien & 1 kg BAZG-Zolllimit.",
    slideRef: "SLIDE 04 · LEBENSMITTEL",
    bg: C.ivory,
  },
  {
    num: "03",
    de: "Gebet, Moscheen & Ramadan",
    id: "Ibadah, Etika Masjid & Ramadan",
    desc: "VIOZ/FIDS-Verzeichnisse, VPI-Orte, Hinterhofmoschee-Etikette (22:00 Nachtruhe, Parkplätze) & 47° N Sommer-/Winterzeiten.",
    slideRef: "SLIDE 05 · SPIRITUALITÄT",
    bg: C.stone,
  },
  {
    num: "04",
    de: "Schweizer Schule & Familie",
    id: "Sekolah Publik Swiss & Keluarga",
    desc: "Volksschule, Jokertage vs. Eid-Dispensation (§ 29 VSV), Kopiervorlage, Schwimm-/Lagerdialog & VPI Kinder-/Jugendprogramm.",
    slideRef: "SLIDE 06 · BILDUNG & KINDER",
    bg: C.ivory,
  },
  {
    num: "05",
    de: "Zakat, Steuern & Spendenrecht",
    id: "Zakat, Pajak & Transparansi Verein",
    desc: "CHF-Nisab (85 g Gold / 595 g Silber), kantonale Steuerbefreiung, PostFinance IBAN CH89 & verbindliche Zweckcodes.",
    slideRef: "SLIDE 07 · FINANZEN",
    bg: C.stone,
  },
  {
    num: "06",
    de: "Notfall, Janazah & Gemeinschaft",
    id: "Darurat, Jenazah & Program VPI",
    desc: "Notrufnummern 112–147, KBRI Bern, kommunale Janazah-Grabfelder, Sterbekasse & VPI Jahresrhythmus (Ta'lim & Familienlager).",
    slideRef: "SLIDES 08–09 · KRISE & KALENDER",
    bg: C.ivory,
  },
];

const cellW = 568;
const cellH = 382;
const colGap = 28;
const rowGap = 28;

chapters.forEach((ch, idx) => {
  const col = idx % 3;
  const row = Math.floor(idx / 3);
  const x = col * (cellW + colGap);
  const y = row * (cellH + rowGap);
  const card = addFrame(tocMain, x, y, cellW, cellH, ch.bg, {
    border: C.pebble,
    bw: 1,
    radius: 10,
    name: `Chapter Card ${ch.num}`,
  });

  // Top Teak badge + reference tag
  addSignpostBadge(card, 28, 26, `KAPITEL ${ch.num}`, { w: 158, h: 34, fontSize: 13 });
  addText(card, F.monoBold, 13, C.steel, ch.slideRef, 206, 33, 334, 20, { ls: 5, align: "RIGHT" });

  // Hairline rule
  addRect(card, 28, 80, cellW - 56, 1, C.pebble);

  // Titles & description
  addText(card, F.sansExtra, 28, C.ink, ch.de, 28, 102, cellW - 56, 68, { lh: 34, ls: -1 });
  addText(card, F.sansBold, 20, C.cobalt, ch.id, 28, 180, cellW - 56, 32, { lh: 26 });
  addText(card, F.sansReg, 18, C.steelMuted, ch.desc, 28, 224, cellW - 56, 114, { lh: 27 });

  // Bottom stamp row
  addRect(card, 28, 344, 18, 2, C.teak);
  addText(card, F.monoMed, 13, C.teak, "DE + ID DUAL-TRACK", 56, 336, 300, 20, { ls: 5 });
});

addSlideFooter(s2, "02 / 10", "INHALTSVERZEICHNIS");

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 03 · 01 WILLKOMMEN & ZGB ORIENTIERUNG (Asymmetric 45/55 Dual-Ground Split)
// ═══════════════════════════════════════════════════════════════════════════════
const s3 = ensureSlide("03 · 01 Willkommen & ZGB Orientierung");
s3.fills = solid(C.greige);

addSlideHeader(
  s3,
  "KAPITEL 01 · ORIENTIERUNG",
  "Willkommen & ZGB Orientierung",
  "Selamat Datang di Swiss · Badan Hukum & 30 Hari Pertama",
  "ART. 60–79 ZGB · 26 KANTONE"
);

// Left Zone (x: 80, y: 184, w: 784, h: 798): Warm Stone #F4F2ED Legal & Federalism Anchor
const s3Left = addFrame(s3, 80, 184, 784, 798, C.stone, { border: C.strongStone, bw: 1, radius: 12, name: "Ch01 Left ZGB Legal" });
addText(s3Left, F.monoBold, 14, C.cobalt, "1.1 RECHTLICHE VERANKERUNG (DE)", 32, 26, 720, 20, { ls: 6 });
addText(s3Left, F.sansExtra, 30, C.ink, "Verein «Percikan Iman» Schweiz", 32, 54, 720, 40, { ls: -1 });
addText(
  s3Left,
  F.sansReg,
  17,
  C.steelMuted,
  "Seit 2012 als Gemeinschaft aktiv; am 23.02.2025 formell konstituiert als gemeinnütziger Schweizer Verein (Statuten 07.01.2025). Kollektivunterschrift zu zweien & jährliche Revision.",
  32,
  100,
  720,
  78,
  { lh: 25 }
);

const zgbRows = [
  ["Offizieller Name", "Verein «Percikan Iman» / Verein Percikan Iman Schweiz"],
  ["Rechtsform", "Schweizer Verein gemäss Art. 60–79 ZGB (ideell)"],
  ["Sitz & UID", "8000 Zürich, Schweiz · UID CHE-382.914.820"],
  ["Bankverbindung", "PostFinance · IBAN CH89 0900 0000 6049 6610 7"],
  ["Organe (Art. 7)", "Vereinsversammlung (ab 16 J.) · Vorstand · Revision"],
  ["Kontakt", "info@percikaniman.ch · @verein.pi · percikaniman.ch"],
];
zgbRows.forEach(([k, v], idx) => {
  const ry = 192 + idx * 54;
  const rowBg = idx % 2 === 0 ? C.recessed : C.ivory;
  const rFrame = addFrame(s3Left, 32, ry, 720, 46, rowBg, { radius: 6, name: `ZGB Row ${idx + 1}` });
  addText(rFrame, F.monoBold, 14, C.cobalt, k, 16, 13, 196, 22);
  addText(rFrame, F.sansMed, 16, C.ink, v, 224, 12, 480, 24);
});

// Federalism Callout inside Left Zone
const fedBox = addFrame(s3Left, 32, 538, 720, 232, C.teakSand, { border: C.teak, bw: 1.5, radius: 10, name: "Federalism Callout" });
addSignpostBadge(fedBox, 24, 22, "1.2 KANTONALER FÖDERALISMUS", { w: 300, h: 32, fontSize: 13 });
addText(
  fedBox,
  F.sansBold,
  20,
  C.ink,
  "26 Kantone & >2'100 Gemeinden — Regeln sind lokal!",
  24,
  68,
  672,
  30
);
addText(
  fedBox,
  F.sansReg,
  17,
  C.ink,
  "• Schule & Feiertage: Jokertage & Eid-Dispensation regelt Kanton / Schulgemeinde.\n• Religionsrecht: Bei Einwohnerkontrolle «islamisch» bzw. «keine Landeskirche» angeben — verhindert irrtümliche Kirchensteuer!\n• ID: Aturan cuti sekolah & makam berbeda per Kanton/Gemeinde.",
  24,
  106,
  672,
  110,
  { lh: 25 }
);

// Right Zone (x: 892, y: 184, w: 948, h: 798): Ice-Blue Mist #DFE8F0 30-Day Checklist
const s3Right = addFrame(s3, 892, 184, 948, 798, C.iceMist, { border: C.steel, bw: 1, radius: 12, name: "Ch01 Right 30-Day Checklist" });
addText(s3Right, F.monoBold, 14, C.cobalt, "1.3 CHECKLISTE: DIE ERSTEN 30 TAGE · DAFTAR PERIKSA 30 HARI PERTAMA", 36, 26, 876, 22, { ls: 5 });
addText(s3Right, F.sansExtra, 30, C.ink, "Startklar in der Schweiz — Langkah Awal", 36, 54, 876, 40, { ls: -1 });

const checklist30 = [
  {
    n: "01",
    t: "Einwohnerkontrolle (Wohnsitzanmeldung · Frist 14 Tage)",
    d: "Innerhalb von 14 Tagen bei der Gemeinde anmelden; Konfession präzise eintragen (keine Landeskirchensteuer). Daftar ke Gemeinde maksimal 14 hari.",
  },
  {
    n: "02",
    t: "Krankenkasse (KVG Obligatorium · Frist 3 Monate)",
    d: "Grundversicherung rückwirkend ab Einreisedatum abschliessen. Asuransi kesehatan dasar KVG wajib dalam 3 bulan sejak tanggal masuk Swiss.",
  },
  {
    n: "03",
    t: "Lapor Diri KBRI Bern (Portal Peduli WNI)",
    d: "Registrierung als indonesische Staatsangehörige über peduliwni.kemlu.go.id — wichtig für Passverlängerung & Konsularschutz.",
  },
  {
    n: "04",
    t: "Mobilität: SBB Halbtax / GA / ZVV SwissPass",
    d: "ÖV ist das Rückgrat für Alltag und Besuche von Monatliche Ta'lim in Volketswil, Baar, Stadel oder St. Gallen.",
  },
  {
    n: "05",
    t: "VPI-Netzwerk & Vereinsmitgliedschaft beitreten",
    d: "@verein.pi folgen · info@percikaniman.ch · Mitgliedschaft beantragen (Stimmrecht ab 16 Jahren gemäss Art. 8 Statuten).",
  },
];

checklist30.forEach((item, idx) => {
  const cy = 114 + idx * 132;
  const stepCard = addFrame(s3Right, 36, cy, 876, 118, C.ivory, { border: C.pebble, bw: 1, radius: 10, name: `Checklist Step ${item.n}` });
  const badgeCol = idx === 0 || idx === 4 ? C.teak : C.cobalt;
  addRect(stepCard, 20, 22, 50, 50, badgeCol, { radius: 8, name: `Step Badge ${item.n}` });
  addText(stepCard, F.monoExtra, 20, C.ivory, item.n, 20, 34, 50, 26, { align: "CENTER" });
  addText(stepCard, F.sansBold, 20, C.ink, item.t, 88, 18, 764, 28);
  addText(stepCard, F.sansReg, 16, C.steelMuted, item.d, 88, 52, 764, 54, { lh: 24 });
});

addSlideFooter(s3, "03 / 10", "01 · WILLKOMMEN & ZGB");

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 04 · 02 HALAL EINKAUFEN & E-NUMMERN (3-Column Grid + Full-Width BAZG Alert)
// ═══════════════════════════════════════════════════════════════════════════════
const s4 = ensureSlide("04 · 02 Halal Einkaufen & E-Nummern");
s4.fills = solid(C.greige);

addSlideHeader(
  s4,
  "KAPITEL 02 · LEBENSMITTELKOMPETENZ",
  "Halal Einkaufen & E-Nummern",
  "Belanja Halal & Panduan Kode E (DE / FR / ID)",
  "SEKTION 02 · ALLTAG IN DER SCHWEIZ"
);

// Col 1 (x: 80, y: 184, w: 566, h: 668): Migros, Coop & Vegan Label Literacy
const s4c1 = addFrame(s4, 80, 184, 566, 668, C.ivory, { border: C.pebble, bw: 1, radius: 12, name: "Ch02 Col1 Detailhandel" });
addText(s4c1, F.monoBold, 14, C.cobalt, "2.1 SCHWEIZER DETAILHANDEL (DE + ID)", 28, 24, 510, 22, { ls: 5 });
addText(s4c1, F.sansExtra, 28, C.ink, "Migros, Coop & Etiketten", 28, 52, 510, 38, { ls: -1 });

const retailBlocks = [
  {
    name: "MIGROS (Standard-Filialen)",
    bg: C.stone,
    body: "Kein Alkohol & Tabak im regulären Sortiment — dennoch bei Gebäck, Schokolade, Desserts (Vermicelles, Tiramisu) & Fondue auf Alkohol/Gelatine achten!",
  },
  {
    name: "COOP (Karma / Naturaplan)",
    bg: C.stone,
    body: "Grosses pflanzliches Sortiment & ausgewählte Halal-Tiefkühlartikel in Grossfilialen; bei Fertiggerichten auf Wein-/Specksaucen prüfen.",
  },
  {
    name: "V-LABEL / VEGAN ≠ ALKOHOLFREI",
    bg: C.iceMist,
    body: "Vegan schliesst tierische Gelatine, Karmin (E120) & tierisches Lab aus — kann aber Alkohol (Kirsch/Weisswein in Pralinen, Risotto) enthalten!",
  },
  {
    name: "ID · KEJU SWISS & ZUTATEN",
    bg: C.recessed,
    body: "Banyak keju Swiss memakai tierisches Lab (rennet anak sapi). Pilih label «mikrobielles Lab» / présure microbienne; selalu baca komposisi DE/FR/IT.",
  },
];
retailBlocks.forEach((b, i) => {
  const by = 108 + i * 136;
  const box = addFrame(s4c1, 24, by, 518, 122, b.bg, { border: C.pebble, bw: 1, radius: 8, name: `Retail ${i + 1}` });
  addText(box, F.monoBold, 14, C.cobalt, b.name, 18, 14, 482, 20, { ls: 4 });
  addText(box, F.sansReg, 16, C.ink, b.body, 18, 40, 482, 72, { lh: 23 });
});

// Col 2 (x: 677, y: 184, w: 566, h: 668): Critical E-Codes in Roasted Teak Badges
const s4c2 = addFrame(s4, 677, 184, 566, 668, C.stone, { border: C.strongStone, bw: 1, radius: 12, name: "Ch02 Col2 E-Nummern" });
addText(s4c2, F.monoBold, 14, C.teak, "2.3 KRITISCHE E-CODES & WARNWÖRTER", 28, 24, 510, 22, { ls: 5 });
addText(s4c2, F.sansExtra, 28, C.ink, "E120 / E441 / E471 Check", 28, 52, 510, 38, { ls: -1 });

const eCodes = [
  { code: "E120", badge: "HARAM", bg: C.teak, info: "Karmin / Cochenille (Schildläuse in roten Joghurts/Sirup) → E162 Randen wählen." },
  { code: "E441", badge: "KRITISCH", bg: C.teak, info: "Speisegelatine (meist Schweineschwarte/-knochen) → nur Fisch oder Halal-Rind." },
  { code: "E471", badge: "PRÜFEN", bg: C.cobalt, info: "Mono-/Diglyceride (E471/472a–f) in Brot & Eis → vegan / rein pflanzlich prüfen." },
  { code: "E542 / 631", badge: "PRÜFEN", bg: C.cobalt, info: "Knochenphosphat (E542) & Inosinat/Guanylat (E627/631/635) in Bouillon/Chips." },
  { code: "E904 / 920", badge: "MUSHBOOH", bg: C.ink, info: "Schellack (Schokodragees) & L-Cystein (Mehlbehandlung) → Bio-/Vollkorn prüfen." },
];
eCodes.forEach((ec, i) => {
  const ey = 108 + i * 84;
  const row = addFrame(s4c2, 24, ey, 518, 72, C.ivory, { border: C.pebble, bw: 1, radius: 8, name: `E-Code ${ec.code}` });
  addRect(row, 14, 14, 114, 44, ec.bg, { radius: 6, name: `Badge ${ec.code}` });
  addText(row, F.monoBold, 15, C.ivory, ec.code, 14, 21, 114, 20, { align: "CENTER" });
  addText(row, F.monoBold, 10, C.teakSand, ec.badge, 14, 40, 114, 14, { align: "CENTER", ls: 6 });
  addText(row, F.sansReg, 15, C.ink, ec.info, 142, 14, 362, 46, { lh: 21 });
});

const warnBox = addFrame(s4c2, 24, 536, 518, 112, C.teakSand, { border: C.teak, bw: 1, radius: 8, name: "DE/FR Warnwörter" });
addText(warnBox, F.monoBold, 13, C.teak, "WARNWÖRTER DE / FR AUF ETIKETTEN", 16, 12, 486, 20, { ls: 5 });
addText(
  warnBox,
  F.sansMed,
  15,
  C.ink,
  "• Schweinefett / Saindoux · Speck / Lardons (Haram)\n• Gelatine / Gélatine porcine · Kirsch / Vin blanc\n• Sicher / Aman: Ohne Alkohol / Sans alcool · Mikrobielles Lab",
  16,
  36,
  486,
  68,
  { lh: 22 }
);

// Col 3 (x: 1274, y: 184, w: 566, h: 668): Regional Halal Butchers & Asian Markets
const s4c3 = addFrame(s4, 1274, 184, 566, 668, C.iceMist, { border: C.steel, bw: 1, radius: 12, name: "Ch02 Col3 Regionen" });
addText(s4c3, F.monoBold, 14, C.cobalt, "2.2 HALAL-METZGEREIEN & ASIA-SHOPS", 28, 24, 510, 22, { ls: 5 });
addText(s4c3, F.sansExtra, 28, C.ink, "Regionale Korridore CH", 28, 52, 510, 38, { ls: -1 });

const regions = [
  {
    city: "ZÜRICH & AGGLOMERATION",
    spots: "Langstrasse / Kreis 4 · Zürich-Oerlikon · Dietikon · Winterthur · nahe Volketswil. Asia-Märkte HB / Limmatplatz (Tempe, Kecap Manis, Santan, Bumbu).",
  },
  {
    city: "BASEL & DREILÄNDERECK",
    spots: "Kleinbasel (Klybeck / Matthäus) · St. Johann sowie Einkaufszentren in Lörrach / Weil am Rhein (DE) & Saint-Louis (FR).",
  },
  {
    city: "BERN & MITTELLAND",
    spots: "Halal-Metzgereien & Orientläden in Bümpliz, Lorraine & Ostermundigen; Asia-Shops nahe Bahnhof Bern.",
  },
  {
    city: "GENF & ROMANDIE",
    spots: "Pâquis, Charmilles, Meyrin (Genf) & Lausanne (Renens / Malley). Französische Deklaration (porc, saindoux, présure) beachten!",
  },
];
regions.forEach((reg, i) => {
  const ry = 108 + i * 136;
  const rCard = addFrame(s4c3, 24, ry, 518, 122, C.ivory, { border: C.pebble, bw: 1, radius: 8, name: `Region ${i + 1}` });
  addText(rCard, F.monoBold, 14, C.cobalt, reg.city, 18, 14, 482, 20, { ls: 5 });
  addText(rCard, F.sansReg, 16, C.ink, reg.spots, 18, 40, 482, 72, { lh: 23 });
});

// Bottom Full-Width BAZG Zoll Alert Band (y: 874..982)
const bazgAlert = addFrame(s4, 80, 874, 1760, 108, C.teak, { radius: 10, name: "BAZG Zoll Alert Banner" });
addRect(bazgAlert, 24, 24, 260, 60, C.teakDeep, { radius: 6, name: "BAZG Pill" });
addText(bazgAlert, F.monoExtra, 17, C.ivory, "SCHWEIZER ZOLL\nBAZG · FREIMENGE", 24, 33, 260, 44, { align: "CENTER", lh: 21 });
addText(
  bazgAlert,
  F.sansExtra,
  24,
  C.ivory,
  "Max. 1 kg Fleisch / Fleischzubereitungen pro Person & Tag (ab 17 Jahren)!",
  310,
  20,
  1420,
  32
);
addText(
  bazgAlert,
  F.sansMed,
  18,
  C.teakSand,
  "Bei Einkäufen in Deutschland (z. B. Lörrach) oder Frankreich gilt die strikte 1-kg-Freimenge des BAZG — Überschreitungen führen zu hohen Zollabgaben und Bussen.",
  310,
  56,
  1420,
  36
);

addSlideFooter(s4, "04 / 10", "02 · HALAL & E-NUMMERN");

// ── Batch 1 Deterministic Layout Validation ───────────────────────────────────
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

const batchSlides = [s1, s2, s3, s4];
const validation = validateSlides(batchSlides);

return {
  batch: 1,
  slides: batchSlides.map((s) => ({ id: s.id, name: s.name })),
  validation,
  createdNodeIdsCount: createdNodeIds.length,
  createdNodeIds,
};
