/**
 * Local site icons. UPIC deliberately does NOT fetch favicons from a third-party
 * service: that would tell the service which websites you have accounts on.
 */
import type { MaterialCommunityIcons } from '@expo/vector-icons';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

const BRANDS: [RegExp, Glyph][] = [
  [/google|gmail|youtube/, 'google'],
  [/github/, 'github'],
  [/microsoft|outlook|live\.com|office|xbox/, 'microsoft'],
  [/apple|icloud/, 'apple'],
  [/facebook|meta/, 'facebook'],
  [/instagram/, 'instagram'],
  [/twitter|x\.com/, 'twitter'],
  [/linkedin/, 'linkedin'],
  [/netflix/, 'netflix'],
  [/spotify/, 'spotify'],
  [/slack/, 'slack'],
  [/dropbox/, 'dropbox'],
  [/reddit/, 'reddit'],
  [/whatsapp/, 'whatsapp'],
  [/gitlab/, 'gitlab'],
  [/steam/, 'steam'],
  [/twitch/, 'twitch'],
  [/bank|hdfc|icici|sbi|axis/, 'bank'],
];

export function siteIcon(name: string): { glyph?: Glyph; letter: string } {
  const lower = (name || '').toLowerCase();
  const match = BRANDS.find(([re]) => re.test(lower));
  const clean = lower.replace(/^https?:\/\//, '').replace(/^www\./, '');
  return { glyph: match?.[1], letter: (clean.charAt(0) || '?').toUpperCase() };
}

/** "https://www.github.com/login" → "GitHub"-ish display name: "Github". */
export function displaySiteName(website: string): string {
  const clean = (website || '').trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (!clean.includes('.')) return clean.charAt(0).toUpperCase() + clean.slice(1);
  const base = clean.split('.').slice(-2, -1)[0] || clean;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function timeAgo(iso?: string): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
  const y = Math.round(mo / 12);
  return `${y} year${y === 1 ? '' : 's'} ago`;
}
