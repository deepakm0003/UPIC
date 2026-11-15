/**
 * Per-app colours: UPIC takes on the colour of the app you are looking at.
 * Known brands use their own colour; anything else gets a stable colour picked
 * from the UPIC palette based on the site name (same site → same colour).
 */

const BRANDS: [RegExp, string][] = [
  [/google|gmail|youtube/, '#4285F4'],
  [/github/, '#24292F'],
  [/gitlab/, '#FC6D26'],
  [/microsoft|outlook|live\.com|office|xbox/, '#0078D4'],
  [/apple|icloud/, '#1D1D1F'],
  [/facebook|meta/, '#1877F2'],
  [/instagram/, '#E1306C'],
  [/twitter|x\.com/, '#1D9BF0'],
  [/linkedin/, '#0A66C2'],
  [/amazon/, '#FF9900'],
  [/netflix/, '#E50914'],
  [/spotify/, '#1DB954'],
  [/discord/, '#5865F2'],
  [/slack/, '#4A154B'],
  [/dropbox/, '#0061FF'],
  [/paypal/, '#003087'],
  [/reddit/, '#FF4500'],
  [/whatsapp/, '#25D366'],
  [/airbnb/, '#FF5A5F'],
  [/udemy/, '#A435F0'],
  [/twitch/, '#9146FF'],
  [/steam/, '#1B2838'],
  [/figma/, '#A259FF'],
  [/notion/, '#191919'],
  [/zomato/, '#E23744'],
  [/swiggy/, '#FC8019'],
  [/flipkart/, '#2874F0'],
  [/myntra/, '#FF3F6C'],
  [/paytm/, '#00BAF2'],
  [/hdfc|icici|sbi|axis|bank/, '#004C8F'],
];

const FALLBACK = ['#2F5BFF', '#FF3B7A', '#7C4DFF', '#00A884', '#FF7A00', '#0091EA', '#E91E63', '#5E35B1'];

export function brandColor(site?: string): string {
  const name = (site || '').toLowerCase();
  const match = BRANDS.find(([re]) => re.test(name));
  if (match) return match[1];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Black or white — whichever reads better on the given colour. */
export function readableOn(hex: string): string {
  const lum = rgb(hex)
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  const L = 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
  return L > 0.42 ? '#121318' : '#FFFFFF';
}
