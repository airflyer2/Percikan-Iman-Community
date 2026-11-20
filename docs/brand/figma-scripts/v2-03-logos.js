// v2-03-logos.js — Verein Percikan Iman Schweiz v2 · Page 03: Logo & Avatar System
// Target: fileKey tJA2fcaYcckLkwHmRGYvf9

const TARGET_PAGE = "03 · Logo & Avatar System";
let page = figma.root.children.find((p) => p.name === TARGET_PAGE);
if (!page) {
  page = figma.createPage();
  page.name = TARGET_PAGE;
}
await figma.setCurrentPageAsync(page);

const BOARD_NAME = "03 · Logo & Emblem System (v2)";
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
  sansMed: pickFont(["Plus Jakarta Sans", "Inter"], ["Medium", "Regular"]),
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

// ── Authentic Vector Geometry from public/logo.svg ──────────────────────────────
const FLAME_UPPER = [
  "M 885.5625 342.714844 C 882.347656 347.234375 879.507812 351.601562 877.019531 355.835938 C 882.011719 361.660156 886.726562 367.367188 890.625 372.441406 C 893.226562 367.984375 896.203125 363.398438 899.578125 358.65625 C 900.628906 357.171875 901.796875 355.597656 903.050781 353.957031 C 899.046875 348.863281 894.332031 343.226562 889.410156 337.53125 C 888.011719 339.351562 886.71875 341.089844 885.5625 342.714844",
  "M 946.761719 321.117188 C 949.695312 325.242188 952.324219 329.246094 954.671875 333.152344 C 960.34375 326.949219 965.386719 321.546875 968.910156 317.808594 C 966.519531 313.789062 963.816406 309.652344 960.773438 305.375 C 959.511719 303.597656 958.085938 301.6875 956.539062 299.683594 C 953.4375 302.960938 948.269531 308.460938 942.230469 315.039062 C 943.890625 317.183594 945.414062 319.222656 946.761719 321.117188",
  "M 893.417969 376.164062 C 893.816406 376.707031 894.203125 377.242188 894.574219 377.761719 C 898.960938 383.933594 902.6875 389.84375 905.773438 395.539062 C 908.859375 389.839844 912.582031 383.933594 916.972656 377.761719 C 917.34375 377.242188 917.730469 376.707031 918.125 376.164062 C 915.414062 371.390625 912.238281 366.457031 908.585938 361.316406 C 907.71875 360.097656 906.777344 358.816406 905.773438 357.484375 C 904.765625 358.816406 903.824219 360.097656 902.957031 361.316406 C 899.304688 366.457031 896.132812 371.390625 893.417969 376.164062",
  "M 922.136719 337.53125 C 917.210938 343.226562 912.496094 348.863281 908.496094 353.957031 C 909.746094 355.597656 910.914062 357.171875 911.96875 358.65625 C 915.339844 363.398438 918.320312 367.984375 920.921875 372.441406 C 924.820312 367.367188 929.53125 361.660156 934.523438 355.835938 C 932.039062 351.601562 929.195312 347.238281 925.984375 342.714844 C 924.828125 341.089844 923.535156 339.347656 922.136719 337.53125",
  "M 905.773438 311.175781 C 910.632812 305.640625 915.550781 300.183594 920.066406 295.246094 C 915.207031 289.714844 910.289062 284.257812 905.773438 279.320312 C 901.253906 284.257812 896.335938 289.714844 891.480469 295.246094 C 895.996094 300.183594 900.910156 305.640625 905.773438 311.175781",
  "M 939.519531 311.597656 C 945.628906 304.949219 950.8125 299.433594 953.835938 296.242188 C 951.683594 293.546875 949.351562 290.714844 946.917969 287.824219 C 944.695312 285.261719 942.40625 282.664062 940.09375 280.078125 C 937.324219 283 932.113281 288.523438 925.863281 295.320312 C 930.714844 300.898438 935.421875 306.472656 939.519531 311.597656",
  "M 908.707031 276.121094 C 913.214844 281.054688 918.132812 286.507812 923.003906 292.042969 C 929.261719 285.238281 934.457031 279.730469 937.191406 276.851562 C 932.1875 271.308594 927.195312 265.914062 922.707031 261.132812 C 919.972656 264.011719 914.855469 269.4375 908.707031 276.121094",
  "M 874.335938 276.828125 C 877.0625 279.703125 882.269531 285.222656 888.542969 292.042969 C 893.410156 286.507812 898.328125 281.054688 902.839844 276.121094 C 896.675781 269.421875 891.550781 263.984375 888.820312 261.109375 C 884.332031 265.894531 879.335938 271.289062 874.335938 276.828125",
  "M 891.792969 257.953125 C 894.511719 260.820312 899.617188 266.234375 905.773438 272.921875 C 911.914062 266.25 917.007812 260.847656 919.734375 257.972656 C 911.601562 249.359375 905.753906 243.394531 905.753906 243.394531 C 905.753906 243.394531 899.917969 249.351562 891.792969 257.953125",
  "M 857.710938 296.242188 C 860.730469 299.433594 865.917969 304.949219 872.023438 311.601562 C 876.121094 306.472656 880.828125 300.898438 885.683594 295.320312 C 879.414062 288.507812 874.199219 282.972656 871.433594 280.058594 C 869.5625 282.152344 867.703125 284.253906 865.882812 286.335938 C 862.992188 289.746094 860.230469 293.085938 857.710938 296.242188",
  "M 859.878906 336.457031 C 864.472656 341.519531 869.34375 346.976562 874.070312 352.417969 C 876.46875 348.410156 879.164062 344.296875 882.179688 340.054688 C 883.476562 338.230469 884.9375 336.273438 886.527344 334.214844 C 881.722656 328.71875 876.816406 323.257812 872.265625 318.265625 C 870.769531 320.203125 869.390625 322.050781 868.167969 323.777344 C 865.066406 328.140625 862.304688 332.359375 859.878906 336.457031",
  "M 905.773438 350.453125 C 909.816406 345.339844 914.53125 339.722656 919.425781 334.066406 C 915.367188 328.957031 910.65625 323.359375 905.773438 317.734375 C 900.890625 323.359375 896.175781 328.957031 892.117188 334.066406 C 897.015625 339.722656 901.726562 345.339844 905.773438 350.453125",
  "M 908.636719 314.453125 C 913.5 320.050781 918.210938 325.636719 922.304688 330.761719 C 927.128906 325.25 932.035156 319.792969 936.578125 314.816406 C 932.507812 309.707031 927.796875 304.121094 922.929688 298.519531 C 918.40625 303.472656 913.488281 308.929688 908.636719 314.453125",
  "M 874.96875 314.816406 C 879.507812 319.792969 884.414062 325.25 889.242188 330.761719 C 893.332031 325.636719 898.042969 320.050781 902.90625 314.453125 C 898.058594 308.929688 893.140625 303.46875 888.617188 298.519531 C 883.746094 304.121094 879.039062 309.707031 874.96875 314.816406",
  "M 850.769531 305.375 C 847.730469 309.652344 845.023438 313.789062 842.636719 317.808594 C 846.160156 321.546875 851.203125 326.949219 856.871094 333.152344 C 859.222656 329.246094 861.851562 325.242188 864.785156 321.117188 C 866.128906 319.222656 867.65625 317.183594 869.316406 315.042969 C 863.277344 308.460938 858.109375 302.960938 855.007812 299.683594 C 853.460938 301.6875 852.035156 303.597656 850.769531 305.375",
  "M 929.363281 340.054688 C 932.378906 344.296875 935.074219 348.410156 937.472656 352.417969 C 942.199219 346.976562 947.074219 341.519531 951.664062 336.457031 C 949.238281 332.359375 946.480469 328.140625 943.378906 323.777344 C 942.152344 322.050781 940.777344 320.203125 939.28125 318.265625 C 934.730469 323.257812 929.824219 328.71875 925.015625 334.214844 C 926.605469 336.273438 928.070312 338.230469 929.363281 340.054688",
];

const FLAME_WINGS = [
  { id: "wlo", coords: [841.86, 321.73, 841.86, 401.2], d: "M 831.984375 377.269531 C 833.046875 380.554688 836.945312 390.777344 846.933594 401.203125 C 846.175781 399.421875 845.679688 398.015625 845.382812 397.105469 C 839.285156 378.3125 842.09375 359.316406 854.589844 337.0625 C 849.027344 330.96875 844.015625 325.589844 840.390625 321.734375 C 828.964844 342.4375 826.394531 360.042969 831.984375 377.269531" },
  { id: "wb", coords: [919.19, 380.35, 919.19, 424.26], d: "M 920.40625 380.351562 C 915.464844 387.296875 911.394531 393.875 908.160156 400.171875 C 912.28125 408.589844 914.953125 416.558594 916.214844 424.261719 C 920.945312 423.757812 925.5 422.914062 929.867188 421.726562 C 931.308594 408.824219 928.25 395.394531 920.40625 380.351562 Z M 920.40625 380.351562" },
  { id: "wro", coords: [969.68, 321.73, 969.68, 401.2], d: "M 956.957031 337.0625 C 969.449219 359.316406 972.261719 378.3125 966.160156 397.105469 C 965.867188 398.015625 965.367188 399.421875 964.609375 401.203125 C 974.597656 390.777344 978.496094 380.554688 979.558594 377.273438 C 985.152344 360.042969 982.582031 342.4375 971.15625 321.734375 C 967.53125 325.589844 962.519531 330.96875 956.957031 337.0625" },
  { id: "wrm", coords: [952.39, 340.41, 952.39, 413.28], d: "M 939.761719 356.367188 C 951.476562 377.375 954.527344 395.484375 949.589844 413.277344 C 951.578125 412.066406 953.507812 410.757812 955.386719 409.355469 C 959.515625 403.058594 961.460938 397.84375 962.164062 395.675781 C 967.730469 378.519531 965.207031 360.996094 953.914062 340.410156 C 949.308594 345.5 944.445312 350.957031 939.761719 356.367188" },
  { id: "wri", coords: [935.42, 359.83, 935.42, 420.4], d: "M 923.21875 376.527344 C 931.808594 392.410156 935.390625 406.65625 934.257812 420.398438 C 937.691406 419.246094 941 417.875 944.183594 416.28125 C 944.433594 415.613281 944.625 415.050781 944.765625 414.613281 C 950.292969 397.59375 947.855469 380.207031 936.78125 359.835938 C 931.738281 365.746094 927.023438 371.496094 923.21875 376.527344" },
  { id: "wli", coords: [859.16, 340.41, 859.16, 413.28], d: "M 849.382812 395.675781 C 850.085938 397.84375 852.03125 403.058594 856.160156 409.355469 C 858.035156 410.757812 859.96875 412.066406 861.957031 413.277344 C 857.015625 395.484375 860.070312 377.375 871.785156 356.367188 C 867.101562 350.957031 862.238281 345.5 857.632812 340.410156 C 846.335938 360.996094 843.816406 378.519531 849.382812 395.675781" },
];

const CRESCENT_PATH = "M 606.820312 330.261719 C 606.820312 338.839844 613.773438 345.796875 622.351562 345.796875 C 630.929688 345.796875 637.882812 338.839844 637.882812 330.261719 C 637.882812 329.640625 637.84375 329.03125 637.773438 328.429688 C 636.980469 334.332031 631.925781 338.882812 625.808594 338.882812 C 619.136719 338.882812 613.730469 333.476562 613.730469 326.804688 C 613.730469 320.6875 618.285156 315.632812 624.1875 314.839844 C 623.582031 314.769531 622.972656 314.730469 622.351562 314.730469 C 613.773438 314.730469 606.820312 321.683594 606.820312 330.261719";

const PERCIKAN_IMAN_PATHS = [
  "M 265.304688 377.652344 C 266.472656 377.921875 267.90625 378.011719 269.878906 378.011719 C 277.148438 378.011719 281.632812 374.335938 281.632812 368.144531 C 281.632812 362.582031 277.773438 359.261719 270.957031 359.261719 C 268.175781 359.261719 266.292969 359.53125 265.304688 359.800781 Z M 251.757812 350.203125 C 255.976562 349.484375 261.894531 348.945312 270.238281 348.945312 C 278.671875 348.945312 284.683594 350.5625 288.71875 353.792969 C 292.578125 356.84375 295.179688 361.863281 295.179688 367.785156 C 295.179688 373.707031 293.203125 378.730469 289.617188 382.140625 C 284.953125 386.535156 278.042969 388.507812 269.972656 388.507812 C 268.175781 388.507812 266.5625 388.417969 265.304688 388.238281 L 265.304688 409.859375 L 251.757812 409.859375 Z M 251.757812 350.203125",
  "M 327.832031 382.945312 C 327.832031 379.628906 326.398438 374.066406 320.117188 374.066406 C 314.375 374.066406 312.042969 379.269531 311.683594 382.945312 Z M 311.773438 392.277344 C 312.222656 397.925781 317.785156 400.621094 324.152344 400.621094 C 328.820312 400.621094 332.585938 399.992188 336.265625 398.824219 L 338.058594 408.066406 C 333.574219 409.859375 328.101562 410.753906 322.179688 410.753906 C 307.289062 410.753906 298.765625 402.144531 298.765625 388.417969 C 298.765625 377.292969 305.675781 365.003906 320.925781 365.003906 C 335.097656 365.003906 340.480469 376.039062 340.480469 386.894531 C 340.480469 389.226562 340.210938 391.289062 340.03125 392.277344 Z M 311.773438 392.277344",
  "M 348.644531 380.433594 C 348.644531 373.976562 348.464844 369.757812 348.285156 365.992188 L 360.039062 365.992188 L 360.484375 374.066406 L 360.84375 374.066406 C 363.085938 367.695312 368.472656 365.003906 372.6875 365.003906 C 373.941406 365.003906 374.570312 365.003906 375.558594 365.183594 L 375.558594 378.011719 C 374.570312 377.832031 373.402344 377.652344 371.878906 377.652344 C 366.855469 377.652344 363.445312 380.34375 362.550781 384.5625 C 362.371094 385.457031 362.28125 386.535156 362.28125 387.613281 L 362.28125 409.859375 L 348.644531 409.859375 Z M 348.644531 380.433594",
  "M 414.9375 408.78125 C 412.515625 409.859375 407.941406 410.757812 402.738281 410.757812 C 388.566406 410.757812 379.503906 402.144531 379.503906 388.328125 C 379.503906 375.5 388.296875 365.003906 404.621094 365.003906 C 408.210938 365.003906 412.15625 365.632812 415.027344 366.710938 L 412.875 376.847656 C 411.261719 376.128906 408.839844 375.5 405.25 375.5 C 398.074219 375.5 393.410156 380.613281 393.5 387.789062 C 393.5 395.863281 398.882812 400.082031 405.519531 400.082031 C 408.75 400.082031 411.261719 399.542969 413.324219 398.734375 Z M 414.9375 408.78125",
  "M 422.472656 365.992188 L 436.109375 365.992188 L 436.109375 409.859375 L 422.472656 409.859375 Z M 436.558594 353.792969 C 436.558594 357.558594 433.6875 360.609375 429.199219 360.609375 C 424.894531 360.609375 422.023438 357.558594 422.113281 353.792969 C 422.023438 349.84375 424.894531 346.882812 429.289062 346.882812 C 433.6875 346.882812 436.46875 349.84375 436.558594 353.792969",
  "M 460.6875 384.472656 L 460.867188 384.472656 C 461.855469 382.675781 462.929688 380.882812 464.007812 379.179688 L 472.886719 365.992188 L 489.304688 365.992188 L 473.605469 383.753906 L 491.546875 409.859375 L 474.769531 409.859375 L 464.1875 391.828125 L 460.6875 396.132812 L 460.6875 409.859375 L 447.050781 409.859375 L 447.050781 346.164062 L 460.6875 346.164062 Z M 460.6875 384.472656",
  "M 519.445312 389.136719 C 512.269531 389.046875 506.707031 390.75 506.707031 396.042969 C 506.707031 399.542969 509.039062 401.246094 512.089844 401.246094 C 515.496094 401.246094 518.277344 399.003906 519.175781 396.222656 C 519.355469 395.503906 519.445312 394.699219 519.445312 393.890625 Z M 521.058594 409.859375 L 520.253906 405.460938 L 519.984375 405.460938 C 517.113281 408.960938 512.625 410.847656 507.421875 410.847656 C 498.542969 410.847656 493.25 404.386719 493.25 397.390625 C 493.25 385.996094 503.476562 380.523438 518.996094 380.613281 L 518.996094 379.984375 C 518.996094 377.652344 517.738281 374.335938 511.011719 374.335938 C 506.527344 374.335938 501.773438 375.859375 498.902344 377.652344 L 496.390625 368.863281 C 499.441406 367.15625 505.449219 365.003906 513.433594 365.003906 C 528.054688 365.003906 532.722656 373.617188 532.722656 383.933594 L 532.722656 399.183594 C 532.722656 403.398438 532.902344 407.4375 533.351562 409.859375 Z M 521.058594 409.859375",
  "M 543.488281 379.984375 C 543.488281 374.511719 543.304688 369.847656 543.128906 365.992188 L 554.96875 365.992188 L 555.597656 372.003906 L 555.867188 372.003906 C 557.660156 369.222656 562.144531 365.003906 569.410156 365.003906 C 578.382812 365.003906 585.109375 370.925781 585.109375 383.84375 L 585.109375 409.859375 L 571.476562 409.859375 L 571.476562 385.546875 C 571.476562 379.894531 569.5 376.039062 564.566406 376.039062 C 560.800781 376.039062 558.558594 378.640625 557.660156 381.152344 C 557.300781 381.960938 557.121094 383.304688 557.121094 384.5625 L 557.121094 409.859375 L 543.488281 409.859375 Z M 543.488281 379.984375",
  "M 628.351562 409.859375 L 614.625 409.859375 L 614.625 349.394531 L 628.351562 349.394531 Z M 628.351562 409.859375",
  "M 640.007812 379.984375 C 640.007812 374.511719 639.832031 369.847656 639.652344 365.992188 L 651.132812 365.992188 L 651.761719 371.914062 L 652.03125 371.914062 C 653.914062 369.132812 657.773438 365.003906 665.308594 365.003906 C 670.957031 365.003906 675.445312 367.875 677.328125 372.449219 L 677.507812 372.449219 C 679.121094 370.207031 681.097656 368.414062 683.160156 367.15625 C 685.582031 365.722656 688.273438 365.003906 691.503906 365.003906 C 699.933594 365.003906 706.304688 370.925781 706.304688 384.023438 L 706.304688 409.859375 L 693.027344 409.859375 L 693.027344 385.996094 C 693.027344 379.628906 690.964844 375.949219 686.570312 375.949219 C 683.429688 375.949219 681.1875 378.101562 680.289062 380.703125 C 679.929688 381.691406 679.75 383.125 679.75 384.203125 L 679.75 409.859375 L 666.472656 409.859375 L 666.472656 385.277344 C 666.472656 379.714844 664.5 375.949219 660.195312 375.949219 C 656.695312 375.949219 654.632812 378.640625 653.824219 380.882812 C 653.375 381.960938 653.285156 383.214844 653.285156 384.292969 L 653.285156 409.859375 L 640.007812 409.859375 Z M 640.007812 379.984375",
  "M 740.480469 389.136719 C 733.304688 389.046875 727.742188 390.75 727.742188 396.042969 C 727.742188 399.542969 730.074219 401.246094 733.125 401.246094 C 736.535156 401.246094 739.316406 399.003906 740.210938 396.222656 C 740.390625 395.503906 740.480469 394.699219 740.480469 393.890625 Z M 742.097656 409.859375 L 741.289062 405.460938 L 741.019531 405.460938 C 738.148438 408.960938 733.664062 410.847656 728.460938 410.847656 C 719.578125 410.847656 714.285156 404.386719 714.285156 397.390625 C 714.285156 385.996094 724.511719 380.523438 740.035156 380.613281 L 740.035156 379.984375 C 740.035156 377.652344 738.777344 374.335938 732.050781 374.335938 C 727.5625 374.335938 722.808594 375.859375 719.9375 377.652344 L 717.425781 368.863281 C 720.476562 367.15625 726.488281 365.003906 734.46875 365.003906 C 749.09375 365.003906 753.757812 373.617188 753.757812 383.933594 L 753.757812 399.183594 C 753.757812 403.398438 753.9375 407.4375 754.386719 409.859375 Z M 742.097656 409.859375",
  "M 764.523438 379.984375 C 764.523438 374.511719 764.34375 369.847656 764.164062 365.992188 L 776.003906 365.992188 L 776.632812 372.003906 L 776.902344 372.003906 C 778.699219 369.222656 783.183594 365.003906 790.449219 365.003906 C 799.417969 365.003906 806.148438 370.925781 806.148438 383.84375 L 806.148438 409.859375 L 792.511719 409.859375 L 792.511719 385.546875 C 792.511719 379.894531 790.539062 376.039062 785.605469 376.039062 C 781.835938 376.039062 779.59375 378.640625 778.699219 381.152344 C 778.339844 381.960938 778.160156 383.304688 778.160156 384.5625 L 778.160156 409.859375 L 764.523438 409.859375 Z M 764.523438 379.984375",
];

const VEREIN_GLYPHS = [
  [651.787069, "M 12.4375 0 L 21.8125 -26.21875 L 18.203125 -26.21875 L 13.765625 -13.265625 C 12.59375 -9.84375 11.515625 -6.53125 10.765625 -3.5 L 10.6875 -3.5 C 10 -6.578125 9.015625 -9.765625 7.890625 -13.296875 L 3.8125 -26.21875 L 0.15625 -26.21875 L 8.71875 0 Z M 12.4375 0"],
  [679.984797, "M 17.96875 -8.796875 C 18 -9.140625 18.078125 -9.6875 18.078125 -10.390625 C 18.078125 -13.84375 16.453125 -19.25 10.3125 -19.25 C 4.828125 -19.25 1.484375 -14.78125 1.484375 -9.09375 C 1.484375 -3.421875 4.9375 0.390625 10.734375 0.390625 C 13.734375 0.390625 15.796875 -0.234375 17 -0.78125 L 16.40625 -3.234375 C 15.125 -2.6875 13.65625 -2.25 11.203125 -2.25 C 7.78125 -2.25 4.828125 -4.15625 4.75 -8.796875 Z M 4.78125 -11.234375 C 5.0625 -13.609375 6.578125 -16.796875 10.03125 -16.796875 C 13.890625 -16.796875 14.8125 -13.421875 14.78125 -11.234375 Z M 4.78125 -11.234375"],
  [707.249084, "M 2.84375 0 L 6.21875 0 L 6.21875 -10.03125 C 6.21875 -10.609375 6.296875 -11.15625 6.375 -11.625 C 6.84375 -14.1875 8.5625 -16.015625 10.96875 -16.015625 C 11.4375 -16.015625 11.78125 -15.984375 12.140625 -15.90625 L 12.140625 -19.140625 C 11.828125 -19.21875 11.546875 -19.25 11.15625 -19.25 C 8.859375 -19.25 6.8125 -17.65625 5.953125 -15.125 L 5.796875 -15.125 L 5.671875 -18.828125 L 2.6875 -18.828125 C 2.796875 -17.078125 2.84375 -15.171875 2.84375 -12.953125 Z M 2.84375 0"],
  [727.356981, "M 17.96875 -8.796875 C 18 -9.140625 18.078125 -9.6875 18.078125 -10.390625 C 18.078125 -13.84375 16.453125 -19.25 10.3125 -19.25 C 4.828125 -19.25 1.484375 -14.78125 1.484375 -9.09375 C 1.484375 -3.421875 4.9375 0.390625 10.734375 0.390625 C 13.734375 0.390625 15.796875 -0.234375 17 -0.78125 L 16.40625 -3.234375 C 15.125 -2.6875 13.65625 -2.25 11.203125 -2.25 C 7.78125 -2.25 4.828125 -4.15625 4.75 -8.796875 Z M 4.78125 -11.234375 C 5.0625 -13.609375 6.578125 -16.796875 10.03125 -16.796875 C 13.890625 -16.796875 14.8125 -13.421875 14.78125 -11.234375 Z M 4.78125 -11.234375"],
  [754.621268, "M 6.265625 0 L 6.265625 -18.828125 L 2.84375 -18.828125 L 2.84375 0 Z M 4.546875 -26.25 C 3.3125 -26.25 2.40625 -25.3125 2.40625 -24.109375 C 2.40625 -22.953125 3.265625 -22.015625 4.46875 -22.015625 C 5.828125 -22.015625 6.6875 -22.953125 6.65625 -24.109375 C 6.65625 -25.3125 5.828125 -26.25 4.546875 -26.25 Z M 4.546875 -26.25"],
  [771.501012, "M 2.84375 0 L 6.265625 0 L 6.265625 -11.3125 C 6.265625 -11.90625 6.34375 -12.484375 6.5 -12.90625 C 7.078125 -14.8125 8.828125 -16.40625 11.078125 -16.40625 C 14.3125 -16.40625 15.4375 -13.890625 15.4375 -10.84375 L 15.4375 0 L 18.859375 0 L 18.859375 -11.234375 C 18.859375 -17.6875 14.8125 -19.25 12.21875 -19.25 C 9.09375 -19.25 6.921875 -17.5 5.984375 -15.71875 L 5.90625 -15.71875 L 5.71875 -18.828125 L 2.6875 -18.828125 C 2.796875 -17.265625 2.84375 -15.671875 2.84375 -13.734375 Z M 2.84375 0"],
];

const buildLogoSvg = (mode, w, h) => {
  const isGrad = mode === "primary" || mode === "emblem";
  const upperFill =
    mode === "primary" || mode === "emblem" ? "#1D5B8C" : mode === "mono" ? "#132435" : mode === "reverse" ? "#FFFFFF" : "#1D5B8C";
  const wingFill = (id) =>
    isGrad ? `url(#v2g-${id})` : mode === "mono" ? "#132435" : mode === "reverse" ? "#9CC4E4" : "#8C5327";
  const crescentFill =
    mode === "primary"
      ? "url(#v2g-crescent)"
      : mode === "mono"
        ? "#132435"
        : mode === "reverse"
          ? "#9CC4E4"
          : "#8C5327";
  const wordFill = mode === "reverse" ? "#FFFFFF" : "#132435";

  const defs = isGrad
    ? `<defs>${FLAME_WINGS.map(
        (fw) =>
          `<linearGradient id="v2g-${fw.id}" gradientUnits="userSpaceOnUse" x1="${fw.coords[0]}" y1="${fw.coords[1]}" x2="${fw.coords[2]}" y2="${fw.coords[3]}"><stop offset="0" stop-color="#5B7E9E"/><stop offset="1" stop-color="#1D5B8C"/></linearGradient>`
      ).join("")}${
        mode === "primary"
          ? `<linearGradient id="v2g-crescent" gradientUnits="userSpaceOnUse" x1="622.35" y1="314.73" x2="622.35" y2="345.80"><stop offset="0" stop-color="#9CC4E4"/><stop offset="0.45" stop-color="#5B7E9E"/><stop offset="1" stop-color="#1D5B8C"/></linearGradient>`
          : ""
      }</defs>`
    : "";

  const flamePaths =
    FLAME_UPPER.map((d) => `<path fill="${upperFill}" d="${d}"/>`).join("") +
    FLAME_WINGS.map((fw) => `<path fill="${wingFill(fw.id)}" d="${fw.d}"/>`).join("");

  if (mode === "emblem") {
    return `<svg width="${w}" height="${h}" viewBox="0 0 172 192" xmlns="http://www.w3.org/2000/svg">${defs}<g transform="translate(-820 -238)">${flamePaths}</g></svg>`;
  }

  const wordPaths =
    PERCIKAN_IMAN_PATHS.map((d) => `<path fill="${wordFill}" d="${d}"/>`).join("") +
    VEREIN_GLYPHS.map(([tx, d]) => `<g transform="translate(${tx} 346.729069)"><path fill="${wordFill}" d="${d}"/></g>`).join("");

  return `<svg width="${w}" height="${h}" viewBox="0 0 745 196" xmlns="http://www.w3.org/2000/svg">${defs}<g transform="translate(-245 -236)">${flamePaths}<path fill="${crescentFill}" d="${CRESCENT_PATH}"/>${wordPaths}</g></svg>`;
};

// ── Build Root Board Frame ──────────────────────────────────────────────────────
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
addText(topMeta, "03 / 05 · LOGO & AVATAR SYSTEM (V2 COBALT + TEAK)", { font: FONTS.monoReg, size: 12, ls: 6, upper: true, color: "#4A5E72" });
const hr = track(figma.createRectangle());
hr.resize(INNER_W, 1);
hr.fills = solid("#D5CFC4");
header.appendChild(hr);
hr.layoutSizingHorizontal = "FILL";

addText(header, "Logo & Emblem System (v2) — Faceted Flame & Crescent", {
  font: FONTS.sansExtra,
  size: 44,
  lh: 50,
  ls: -2.5,
  color: "#132435",
  w: INNER_W,
});
addText(
  header,
  "Authentic faceted teardrop-flame + crescent from public/logo.svg across 5 v2 variants: Primary Cobalt, Monochrome Slate-Blue Ink, Reverse White/Sky, Cobalt & Roasted Teak Duotone, and 1080×1080 Greige/Ivory IG Avatar.",
  { font: FONTS.sansReg, size: 17, lh: 26, color: "#4A5E72", w: INNER_W }
);

const colW2 = Math.floor((INNER_W - 24) / 2); // 724

const renderLockupCard = (parent, spec) => {
  const card = makeBox("VERTICAL", {
    name: spec.name,
    w: colW2,
    bg: "#FAF9F6",
    border: "#D5CFC4",
    bw: 1,
    radius: 12,
    clip: true,
  });
  parent.appendChild(card);

  const stage = makeBox("VERTICAL", {
    w: colW2,
    h: 270,
    bg: spec.stageBg,
    alignMain: "CENTER",
    alignCross: "CENTER",
  });
  card.appendChild(stage);

  const csBox = makeBox("VERTICAL", {
    px: 36,
    py: 24,
    noFill: true,
    border: "#1D5B8C",
    borderOpacity: 0.35,
    bw: 1,
    alignMain: "CENTER",
    alignCross: "CENTER",
  });
  csBox.dashPattern = [4, 4];
  stage.appendChild(csBox);

  const svgNode = track(figma.createNodeFromSvg(buildLogoSvg(spec.mode, 480, 126)));
  svgNode.name = spec.svgName;
  csBox.appendChild(svgNode);
  svgNode.resize(480, 126);

  const meta = makeBox("VERTICAL", { w: colW2, pad: 24, gap: 6, bg: "#FAF9F6" });
  card.appendChild(meta);
  addText(meta, spec.kicker, { font: FONTS.monoBold, size: 11, ls: 8, color: spec.kickerColor || "#1D5B8C" });
  addText(meta, spec.title, { font: FONTS.sansBold, size: 18, lh: 26, color: "#132435", w: colW2 - 48 });
  addText(meta, spec.desc, { font: FONTS.sansReg, size: 13, lh: 20, color: "#4A5E72", w: colW2 - 48 });
};

// Row 1: Primary Cobalt & Monochrome Slate-Blue Ink
const row1 = makeBox("HORIZONTAL", { name: "Row 1 · Primary & Monochrome", w: INNER_W, gap: 24, noFill: true });
board.appendChild(row1);

renderLockupCard(row1, {
  name: "Variant 01 · Primary Cobalt",
  svgName: "Logo / Primary Cobalt (v2)",
  mode: "primary",
  stageBg: "#EAE6DF",
  kicker: "VARIANT 01 · LOGO-PRIMARY.SVG",
  title: "Primary Cobalt (#1D5B8C / #5B7E9E) + Slate-Blue Ink (#132435)",
  desc: "For #EAE6DF Limestone Greige & #F4F2ED Warm Stone flyers, Wegweiser interior spreads & web headers.",
});

renderLockupCard(row1, {
  name: "Variant 02 · Monochrome Slate-Blue Ink",
  svgName: "Logo / Monochrome Ink (v2)",
  mode: "mono",
  stageBg: "#FAF9F6",
  kicker: "VARIANT 02 · LOGO-MONOCHROME-INK.SVG",
  title: "Monochrome Slate-Blue Ink (#132435) Flat Lockup",
  desc: "100% solid Slate-Blue Ink vector paths (zero gradients) for municipal letters, laser print & official seals.",
});

// Row 2: Reverse White/Powder Sky & Cobalt+Roasted Teak Duotone
const row2 = makeBox("HORIZONTAL", { name: "Row 2 · Reverse & Cobalt-Teak Duotone", w: INNER_W, gap: 24, noFill: true });
board.appendChild(row2);

const revCard = makeBox("VERTICAL", {
  name: "Variant 03 · Reverse White & Powder Sky",
  w: colW2,
  bg: "#FAF9F6",
  border: "#D5CFC4",
  bw: 1,
  radius: 12,
  clip: true,
});
row2.appendChild(revCard);

const revSplit = makeBox("HORIZONTAL", { w: colW2, h: 270, gap: 0, noFill: true });
revCard.appendChild(revSplit);

for (const bgHex of ["#132435", "#1D5B8C"]) {
  const half = makeBox("VERTICAL", { w: colW2 / 2, h: 270, bg: bgHex, gap: 10, alignMain: "CENTER", alignCross: "CENTER" });
  revSplit.appendChild(half);
  const revSvg = track(figma.createNodeFromSvg(buildLogoSvg("reverse", 290, 76)));
  revSvg.name = `Logo / Reverse (${bgHex})`;
  half.appendChild(revSvg);
  revSvg.resize(290, 76);
  addText(half, `ON ${bgHex}`, { font: FONTS.monoBold, size: 11, ls: 6, color: "#9CC4E4" });
}

const revMeta = makeBox("VERTICAL", { w: colW2, pad: 24, gap: 6, bg: "#FAF9F6" });
revCard.appendChild(revMeta);
addText(revMeta, "VARIANT 03 · LOGO-REVERSE-WHITE.SVG", { font: FONTS.monoBold, size: 11, ls: 8, color: "#1D5B8C" });
addText(revMeta, "Reverse White (#FFFFFF) + Powder Sky (#9CC4E4)", { font: FONTS.sansBold, size: 18, lh: 26, color: "#132435", w: colW2 - 48 });
addText(revMeta, "For Deep Slate-Blue (#132435) and Percikan Cobalt (#1D5B8C) dark photo recaps, Wegweiser covers & donation banners.", {
  font: FONTS.sansReg,
  size: 13,
  lh: 20,
  color: "#4A5E72",
  w: colW2 - 48,
});

renderLockupCard(row2, {
  name: "Variant 04 · Cobalt & Roasted Teak Duotone",
  svgName: "Logo / Cobalt & Teak Duotone (v2)",
  mode: "duotone",
  stageBg: "#E1DDD4",
  kicker: "VARIANT 04 · LOGO-DUOTONE-CIVIC.SVG",
  kickerColor: "#8C5327",
  title: "Cobalt & Roasted Teak Duotone (#1D5B8C + #8C5327)",
  desc: "Pairs Percikan Cobalt upper flame facets with Roasted Teak lower wings & crescent alongside #132435 Slate-Blue Ink wordmark.",
});

// Row 3: 1080×1080 Limestone Greige / Ivory IG Avatar + Clearspace & Rules
const row3 = makeBox("HORIZONTAL", { name: "Row 3 · 1080x1080 IG Avatar & Rules", w: INNER_W, gap: 28, noFill: true });
board.appendChild(row3);

const avatarFrame = makeBox("VERTICAL", {
  name: "Variant 05 · 1080×1080 Limestone Greige IG Avatar",
  w: 1080,
  h: 1080,
  bg: "#EAE6DF",
  border: "#D5CFC4",
  bw: 1,
  clip: true,
  alignMain: "CENTER",
  alignCross: "CENTER",
});
row3.appendChild(avatarFrame);

const outerCircle = track(figma.createEllipse());
outerCircle.name = "Crisp Ivory Inner Circle";
outerCircle.resize(992, 992);
outerCircle.fills = solid("#FAF9F6");
outerCircle.strokes = solid("#D5CFC4");
outerCircle.strokeWeight = 3;
avatarFrame.appendChild(outerCircle);
outerCircle.layoutPositioning = "ABSOLUTE";
outerCircle.x = 44;
outerCircle.y = 44;

const innerRing = track(figma.createEllipse());
innerRing.name = "Optical Safe Crop Ring";
innerRing.resize(920, 920);
innerRing.fills = [];
innerRing.strokes = solid("#E1DDD4");
innerRing.strokeWeight = 2;
avatarFrame.appendChild(innerRing);
innerRing.layoutPositioning = "ABSOLUTE";
innerRing.x = 80;
innerRing.y = 80;

const ticksSvg = `<svg width="1080" height="1080" viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M540 54V74M540 1006V1026M54 540H74M1006 540H1026" stroke="#8C5327" stroke-width="2.5" stroke-linecap="round"/></svg>`;
const ticksNode = track(figma.createNodeFromSvg(ticksSvg));
ticksNode.name = "Teak Cardinal Registration Ticks";
avatarFrame.appendChild(ticksNode);
ticksNode.layoutPositioning = "ABSOLUTE";
ticksNode.x = 0;
ticksNode.y = 0;

const igEmblem = track(figma.createNodeFromSvg(buildLogoSvg("emblem", 524, 585)));
igEmblem.name = "Emblem Mark (Centered Optical)";
avatarFrame.appendChild(igEmblem);
igEmblem.resize(524, 585);
igEmblem.layoutPositioning = "ABSOLUTE";
igEmblem.x = Math.round((1080 - 524) / 2);
igEmblem.y = Math.round((1080 - 585) / 2) - 8;

const sideW = INNER_W - 1080 - 28; // 364
const sideCol = makeBox("VERTICAL", { w: sideW, gap: 20, noFill: true });
row3.appendChild(sideCol);

const embCard = makeBox("VERTICAL", { w: sideW, pad: 24, gap: 14, bg: "#FAF9F6", border: "#D5CFC4", bw: 1, radius: 12 });
sideCol.appendChild(embCard);
addText(embCard, "VARIANT 05 · IG AVATAR (1080×1080)", { font: FONTS.monoBold, size: 11, ls: 8, color: "#1D5B8C" });
const embPreviewBox = makeBox("VERTICAL", { w: sideW - 48, h: 150, bg: "#EAE6DF", border: "#D5CFC4", radius: 8, alignMain: "CENTER", alignCross: "CENTER" });
embCard.appendChild(embPreviewBox);
const embMini = track(figma.createNodeFromSvg(buildLogoSvg("emblem", 96, 108)));
embPreviewBox.appendChild(embMini);
embMini.resize(96, 108);
addText(embCard, "Limestone Greige & Crisp Ivory Badge", { font: FONTS.sansBold, size: 16, lh: 22, color: "#132435", w: sideW - 48 });
addText(embCard, "Roasted Teak cardinal registration ticks frame the Cobalt faceted flame with >250px clearspace inside circular IG/WhatsApp crop.", {
  font: FONTS.sansReg,
  size: 13,
  lh: 20,
  color: "#4A5E72",
  w: sideW - 48,
});

const rulesCard = makeBox("VERTICAL", { w: sideW, pad: 24, gap: 12, bg: "#FAF9F6", border: "#D5CFC4", bw: 1, radius: 12 });
sideCol.appendChild(rulesCard);
addText(rulesCard, "CLEARSPACE & MINIMUM SIZES", { font: FONTS.monoBold, size: 11, ls: 8, color: "#8C5327" });
for (const [k, v] of [
  ["Clearspace Rule", "Min 1× cap-height of 'V' on all 4 sides."],
  ["Full Lockup Min", "120px digital width / 32mm print width."],
  ["Emblem Mark Min", "24px digital width / 8mm print width."],
  ["Prohibited Misuse", "NEVER stretch, drop-shadow, place #132435 wordmark over dark photos, or recolor facets to green/pastel."],
]) {
  const rowItem = makeBox("VERTICAL", { w: sideW - 48, pad: 12, gap: 4, bg: "#E1DDD4", radius: 6 });
  rulesCard.appendChild(rowItem);
  addText(rowItem, k, { font: FONTS.monoBold, size: 11, ls: 4, upper: true, color: "#132435" });
  addText(rowItem, v, { font: FONTS.sansReg, size: 12, lh: 18, color: "#4A5E72", w: sideW - 72 });
}

return {
  pageName: page.name,
  pageId: page.id,
  boardId: board.id,
  avatarFrameId: avatarFrame.id,
  bounds: { x: board.x, y: board.y, width: board.width, height: board.height },
  createdNodeIds,
};
