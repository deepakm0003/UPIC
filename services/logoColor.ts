/**
 * Dominant brand colour from a website's logo, in pure JavaScript (works in
 * Expo Go on iOS and Android — no native modules). Supports PNG and ICO
 * (embedded PNG or 32-bit BMP). Other formats return undefined.
 */
import UPNG from 'upng-js';

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47];

function isPng(b: Uint8Array, at = 0): boolean {
  return PNG_SIG.every((v, i) => b[at + i] === v);
}

/** Decodes a PNG to RGBA bytes. */
function decodePng(buf: ArrayBuffer): { w: number; h: number; rgba: Uint8Array } | null {
  try {
    const img = UPNG.decode(buf);
    const frames = UPNG.toRGBA8(img);
    return { w: img.width, h: img.height, rgba: new Uint8Array(frames[0]) };
  } catch {
    return null;
  }
}

/** Picks the largest image inside an .ico file and decodes it. */
function decodeIco(bytes: Uint8Array): { w: number; h: number; rgba: Uint8Array } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 6 || view.getUint16(0, true) !== 0 || view.getUint16(2, true) !== 1) return null;
  const count = view.getUint16(4, true);
  let best = { size: 0, offset: 0, length: 0, w: 0 };
  for (let i = 0; i < count; i++) {
    const e = 6 + i * 16;
    if (e + 16 > bytes.length) break;
    const w = bytes[e] || 256;
    const length = view.getUint32(e + 8, true);
    const offset = view.getUint32(e + 12, true);
    if (w >= best.w) best = { size: w, offset, length, w };
  }
  if (!best.length || best.offset + best.length > bytes.length) return null;
  const data = bytes.subarray(best.offset, best.offset + best.length);
  if (isPng(data)) return decodePng(data.slice().buffer);

  // BMP (DIB) without the file header: support 32-bit BGRA only.
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const headerSize = dv.getUint32(0, true);
  const w = dv.getInt32(4, true);
  const h = Math.abs(dv.getInt32(8, true)) / 2; // height includes the AND mask
  const bpp = dv.getUint16(14, true);
  if (bpp !== 32 || w <= 0 || h <= 0) return null;
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const src = headerSize + ((h - 1 - y) * w + x) * 4; // bottom-up rows
      const dst = (y * w + x) * 4;
      rgba[dst] = data[src + 2];
      rgba[dst + 1] = data[src + 1];
      rgba[dst + 2] = data[src];
      rgba[dst + 3] = data[src + 3];
    }
  }
  return { w, h, rgba };
}

/**
 * The most common *colourful* pixel colour. Ignores transparent, white and
 * grey pixels; falls back to the most common dark colour for black logos.
 */
export function dominantColor(rgba: Uint8Array): string | undefined {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  const dark = new Map<number, { n: number; r: number; g: number; b: number }>();
  const step = Math.max(1, Math.floor(rgba.length / 4 / 6000)) * 4; // sample ~6000 pixels
  for (let i = 0; i < rgba.length; i += step) {
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2], a = rgba[i + 3];
    if (a < 160) continue;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (max > 235 && sat < 0.15) continue; // white / near-white
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const target = sat > 0.28 && max > 50 ? buckets : max < 90 ? dark : null;
    if (!target) continue; // grey
    const cur = target.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    cur.n++;
    cur.r += r;
    cur.g += g;
    cur.b += b;
    target.set(key, cur);
  }
  const pick = (m: typeof buckets, minCount: number) => {
    let best: { n: number; r: number; g: number; b: number } | undefined;
    m.forEach((v) => {
      if (!best || v.n > best.n) best = v;
    });
    if (!best || (best as any).n < minCount) return undefined;
    const bb = best as { n: number; r: number; g: number; b: number };
    return '#' + [bb.r, bb.g, bb.b].map((c) => Math.round(c / bb.n).toString(16).padStart(2, '0')).join('');
  };
  return pick(buckets, 8) ?? pick(dark, 8);
}

/** Downloads a logo and returns its dominant colour, or undefined. */
export async function logoColor(url: string): Promise<string | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(url, { signal: controller.signal, credentials: 'omit' });
    if (!res.ok) return undefined;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 2_000_000) return undefined;
    const bytes = new Uint8Array(buf);
    const img = isPng(bytes) ? decodePng(buf) : decodeIco(bytes);
    return img ? dominantColor(img.rgba) : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
