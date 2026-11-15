/**
 * Website branding (colour + logo) for any site, with no API key.
 *
 * UPIC asks the website itself for the brand colour it publishes
 * (<meta name="theme-color">, the web-app manifest's theme_color or
 * msapplication-TileColor) and for its app icon (apple-touch-icon, icon links,
 * manifest icons, /favicon.ico).
 *
 * Privacy: only the website you saved is contacted — never a third-party logo
 * service — and the result is stored inside your encrypted vault. It can be
 * switched off in Settings.
 *
 * If the site publishes no colour, the dominant colour of its logo is used
 * (decoded in pure JS, see logoColor.ts).
 *
 * This file has no React Native imports so it can be tested in Node.
 */
import { logoColor } from './logoColor';

export interface SiteMeta {
  color?: string;
  logoUrl?: string;
}

const TIMEOUT_MS = 7000;

export function siteOrigin(website: string): string | null {
  const raw = (website || '').trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes('.')) return null;
    return `https://${url.hostname}`;
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<{ text: string; finalUrl: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
      },
      credentials: 'omit',
    });
    if (!res.ok) return null;
    const text = (await res.text()).slice(0, 400_000);
    return { text, finalUrl: res.url || url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Reads an attribute from a tag regardless of attribute order or quote style. */
function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[2] ?? m[3] ?? m[4])?.trim() : undefined;
}

function tags(html: string, tagName: string): string[] {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, 'gi')) ?? [];
}

const NAMED: Record<string, string> = {
  black: '#000000', white: '#ffffff', red: '#ff0000', blue: '#0000ff', green: '#008000', orange: '#ffa500',
  purple: '#800080', navy: '#000080', teal: '#008080', maroon: '#800000',
};

/** Normalises #rgb, #rrggbb, #rrggbbaa, rgb()/rgba() and a few names to #rrggbb. */
export function normalizeColor(input?: string): string | undefined {
  if (!input) return undefined;
  const v = input.trim().toLowerCase();
  if (NAMED[v]) return NAMED[v];
  let m = v.match(/^#([0-9a-f]{3})$/);
  if (m) return '#' + m[1].split('').map((c) => c + c).join('');
  m = v.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/);
  if (m) return '#' + m[1];
  m = v.match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/);
  if (m) return '#' + [m[1], m[2], m[3]].map((n) => Math.min(255, parseInt(n, 10)).toString(16).padStart(2, '0')).join('');
  return undefined;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** White or near-white theme colours make invisible cards on a white app, so skip them. */
function usable(hex?: string): hex is string {
  return !!hex && luminance(hex) < 0.85;
}

function resolve(href: string | undefined, base: string): string | undefined {
  if (!href || href.startsWith('data:')) return undefined;
  try {
    const u = new URL(href, base);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString().replace(/^http:/, 'https:') : undefined;
  } catch {
    return undefined;
  }
}

function iconSize(tag: string): number {
  const sizes = attr(tag, 'sizes') ?? '';
  const m = sizes.match(/(\d+)x(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Pure parser: extracts branding from a page's HTML (exported for tests). */
export function parseBranding(html: string, baseUrl: string): { color?: string; logoUrl?: string; manifestUrl?: string } {
  const head = html.split(/<\/head>/i)[0] ?? html;
  const metas = tags(head, 'meta');
  const links = tags(head, 'link');

  const metaColor = (name: string) =>
    metas
      .filter((t) => (attr(t, 'name') ?? attr(t, 'property') ?? '').toLowerCase() === name)
      // Prefer the light-scheme value when several are given.
      .sort((a, b) => Number(/dark/i.test(attr(a, 'media') ?? '')) - Number(/dark/i.test(attr(b, 'media') ?? '')))
      .map((t) => normalizeColor(attr(t, 'content')))
      .find(usable);

  const color = metaColor('theme-color') ?? metaColor('msapplication-tilecolor');

  const relOf = (t: string) => (attr(t, 'rel') ?? '').toLowerCase();
  const touch = links.filter((t) => relOf(t).includes('apple-touch-icon')).sort((a, b) => iconSize(b) - iconSize(a))[0];
  const icons = links
    .filter((t) => /(^|\s)icon(\s|$)/.test(relOf(t)) && !/\.svg(\?|$)/i.test(attr(t, 'href') ?? ''))
    .sort((a, b) => iconSize(b) - iconSize(a));
  const logoUrl = resolve(attr(touch ?? '', 'href'), baseUrl) ?? resolve(attr(icons[0] ?? '', 'href'), baseUrl);
  const manifest = links.find((t) => relOf(t) === 'manifest');

  return { color, logoUrl, manifestUrl: resolve(attr(manifest ?? '', 'href'), baseUrl) };
}

/** Looks up a website's brand colour and logo. Never throws; returns {} on any failure. */
export async function fetchSiteMeta(website: string): Promise<SiteMeta> {
  const origin = siteOrigin(website);
  if (!origin) return {};
  const page = await fetchText(origin + '/');
  if (!page) {
    const fav = `${origin}/favicon.ico`;
    const c = await logoColor(fav);
    return { color: usable(c) ? c : undefined, logoUrl: fav };
  }

  const parsed = parseBranding(page.text, page.finalUrl);
  let { color, logoUrl } = parsed;

  if ((!color || !logoUrl) && parsed.manifestUrl) {
    const man = await fetchText(parsed.manifestUrl);
    if (man) {
      try {
        const json = JSON.parse(man.text);
        const c = normalizeColor(json.theme_color) ?? normalizeColor(json.background_color);
        if (!color && usable(c)) color = c;
        if (!logoUrl && Array.isArray(json.icons)) {
          const best = [...json.icons]
            .filter((i: any) => i?.src && !/\.svg/i.test(i.src))
            .sort((a: any, b: any) => parseInt(b.sizes ?? '0', 10) - parseInt(a.sizes ?? '0', 10))[0];
          logoUrl = resolve(best?.src, man.finalUrl);
        }
      } catch {
        // Not valid JSON — ignore.
      }
    }
  }

  const favicon = `${new URL(page.finalUrl).origin}/favicon.ico`;
  logoUrl = logoUrl ?? favicon;
  if (!color) {
    const fromLogo = await logoColor(logoUrl);
    color = usable(fromLogo) ? fromLogo : undefined;
  }
  if (!color && logoUrl !== favicon) {
    const fromFavicon = await logoColor(favicon);
    color = usable(fromFavicon) ? fromFavicon : undefined;
  }
  return { color, logoUrl };
}
