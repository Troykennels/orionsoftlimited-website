// Signature extraction from a photo/scan of a signed paper.
//
// Pipeline (standard document-image practice):
//  1. Grayscale.
//  2. Sauvola adaptive threshold, computed with integral images so each pixel
//     is compared with the mean/std-dev of its own neighbourhood. This copes
//     with shadows, uneven phone-camera lighting and yellowed paper, where a
//     single global threshold fails.
//  3. Connected-component analysis (8-connected) to drop specks/noise and
//     long thin horizontal strokes (the printed "signature line").
//  4. Auto-trim to the remaining ink, then render ink as anti-aliased pixels
//     on a transparent background, in the chosen ink colour.

export const INK_COLORS = {
  black: [17, 20, 28],
  navy: [10, 37, 64],
  blue: [22, 64, 170],
};

function toGray(data, n) {
  const g = new Float32Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    // Treat transparent pixels (e.g. PNG input) as white paper.
    const a = data[j + 3] / 255;
    g[i] = (0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2]) * a + 255 * (1 - a);
  }
  return g;
}

function sauvola(gray, w, h, win, k) {
  const W = w + 1;
  const sum = new Float64Array(W * (h + 1));
  const sq = new Float64Array(W * (h + 1));
  for (let y = 1; y <= h; y++) {
    let rs = 0, rq = 0;
    for (let x = 1; x <= w; x++) {
      const v = gray[(y - 1) * w + (x - 1)];
      rs += v; rq += v * v;
      sum[y * W + x] = sum[(y - 1) * W + x] + rs;
      sq[y * W + x] = sq[(y - 1) * W + x] + rq;
    }
  }
  const r = Math.floor(win / 2);
  const mask = new Uint8Array(w * h);
  const threshold = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w - 1, x + r);
      const cnt = (y1 - y0 + 1) * (x1 - x0 + 1);
      const A = y0 * W + x0, B = y0 * W + x1 + 1, Cc = (y1 + 1) * W + x0, D = (y1 + 1) * W + x1 + 1;
      const s = sum[D] - sum[B] - sum[Cc] + sum[A];
      const q = sq[D] - sq[B] - sq[Cc] + sq[A];
      const mean = s / cnt;
      const sd = Math.sqrt(Math.max(0, q / cnt - mean * mean));
      const t = mean * (1 + k * (sd / 128 - 1));
      const i = y * w + x;
      threshold[i] = t;
      // Ink = darker than the local threshold AND meaningfully darker than
      // paper (stops faint texture in flat areas becoming "ink").
      mask[i] = gray[i] < t && gray[i] < 235 ? 1 : 0;
    }
  }
  return { mask, threshold };
}

function components(mask, w, h) {
  const labels = new Int32Array(w * h);
  const comps = [];
  const stack = new Int32Array(w * h);
  let next = 1;
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || labels[start]) continue;
    let sp = 0, area = 0, minX = w, minY = h, maxX = 0, maxY = 0;
    stack[sp++] = start; labels[start] = next;
    while (sp) {
      const p = stack[--sp];
      area++;
      const x = p % w, y = (p - x) / w;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy; if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx; if (nx < 0 || nx >= w || (!dx && !dy)) continue;
          const q = ny * w + nx;
          if (mask[q] && !labels[q]) { labels[q] = next; stack[sp++] = q; }
        }
      }
    }
    comps.push({ id: next, area, minX, minY, maxX, maxY });
    next++;
  }
  return { labels, comps };
}

/**
 * @param {ImageData} img  the cropped signature region
 * @param {{ sensitivity: number, minSpeck: number, removeLines: boolean, ink: string }} opts
 * @returns {{ canvas: HTMLCanvasElement, inkPixels: number } | null}
 */
export function extractSignature(img, { sensitivity = 0.5, minSpeck = 1, removeLines = true, ink = "navy" } = {}) {
  const { width: w, height: h, data } = img;
  const gray = toGray(data, w * h);
  // Neighbourhood ~1/8 of the shorter side, odd, clamped: large enough to see
  // paper around each stroke, small enough to follow lighting gradients.
  const win = Math.max(15, Math.min(151, (Math.floor(Math.min(w, h) / 8) | 1)));
  const k = 0.05 + (1 - sensitivity) * 0.45; // higher sensitivity → lower k → fainter ink kept
  const { mask, threshold } = sauvola(gray, w, h, win, k);
  const { labels, comps } = components(mask, w, h);

  const minArea = Math.max(4, Math.round(w * h * 0.00004 * minSpeck));
  const keep = new Uint8Array(comps.length + 1);
  for (const c of comps) {
    const cw = c.maxX - c.minX + 1, ch = c.maxY - c.minY + 1;
    const isSpeck = c.area < minArea;
    // A printed signature line: very wide, very flat, mostly solid.
    const isRule = removeLines && cw > w * 0.3 && ch <= Math.max(6, h * 0.04) && c.area > cw * 0.5;
    // Big solid blocks (logos, stamps' fills, dark borders) aren't handwriting.
    const isBlock = c.area > cw * ch * 0.85 && cw * ch > w * h * 0.02;
    keep[c.id] = isSpeck || isRule || isBlock ? 0 : 1;
  }

  let minX = w, minY = h, maxX = -1, maxY = -1, inkPixels = 0;
  for (let i = 0; i < w * h; i++) {
    if (!keep[labels[i]]) continue;
    inkPixels++;
    const x = i % w, y = (i - x) / w;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (inkPixels < 20) return null;

  const pad = Math.round(Math.max(6, Math.min(w, h) * 0.03));
  const ox = Math.max(0, minX - pad), oy = Math.max(0, minY - pad);
  const ow = Math.min(w, maxX + pad + 1) - ox, oh = Math.min(h, maxY + pad + 1) - oy;
  const canvas = document.createElement("canvas");
  canvas.width = ow; canvas.height = oh;
  const ctx = canvas.getContext("2d");
  const out = ctx.createImageData(ow, oh);
  const [r, g, b] = INK_COLORS[ink] || INK_COLORS.navy;

  // Anti-aliased alpha: how far below its local threshold each pixel sits.
  // Pixels touching kept ink (1px halo) are included so stroke edges stay smooth.
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const sx = x + ox, sy = y + oy, i = sy * w + sx;
      let near = keep[labels[i]] === 1;
      if (!near) {
        for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) {
          const nx = sx + dx, ny = sy + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h && keep[labels[ny * w + nx]] === 1) near = true;
        }
      }
      if (!near) continue;
      const t = threshold[i];
      const depth = Math.min(1, Math.max(0, (t - gray[i] + 12) / Math.max(24, t * 0.45)));
      const alpha = keep[labels[i]] === 1 ? Math.max(0.55, depth) : depth * 0.8;
      const o = (y * ow + x) * 4;
      out.data[o] = r; out.data[o + 1] = g; out.data[o + 2] = b; out.data[o + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(out, 0, 0);
  return { canvas, inkPixels };
}

// Downscale a canvas so stored signatures stay small (they're embedded in every PDF).
export function toStorableDataUrl(canvas, maxW = 700, maxH = 260) {
  const scale = Math.min(1, maxW / canvas.width, maxH / canvas.height);
  if (scale >= 1) return canvas.toDataURL("image/png");
  const c = document.createElement("canvas");
  c.width = Math.round(canvas.width * scale); c.height = Math.round(canvas.height * scale);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}
