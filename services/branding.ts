/**
 * Fills in brand colour + logo for saved logins in the background, one site at
 * a time, and stores the result in the encrypted vault.
 */
import { fetchSiteMeta } from './siteMeta';
import { setPasswordBranding } from './fileStorage';
import type { PasswordEntry } from '../types';

const RETRY_AFTER_MS = 7 * 24 * 3600 * 1000;
const inFlight = new Set<string>();
let queue: Promise<void> = Promise.resolve();

function needsLookup(p: PasswordEntry): boolean {
  if (inFlight.has(p.id)) return false;
  if (!p.metaCheckedAt) return true;
  // Retry sites that gave nothing, but not too often.
  return !p.brandColor && !p.iconUrl && Date.now() - new Date(p.metaCheckedAt).getTime() > RETRY_AFTER_MS;
}

export function ensureBranding(entries: PasswordEntry[], enabled: boolean): void {
  if (!enabled) return;
  for (const p of entries.filter(needsLookup)) {
    inFlight.add(p.id);
    queue = queue
      .then(async () => {
        const meta = await fetchSiteMeta(p.website);
        await setPasswordBranding(p.id, { brandColor: meta.color, iconUrl: meta.logoUrl });
      })
      .catch(() => undefined)
      .finally(() => inFlight.delete(p.id));
  }
}
