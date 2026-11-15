import * as Clipboard from 'expo-clipboard';

let clearTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Copies a secret and wipes it from the clipboard after `seconds`,
 * unless the user has copied something else in the meantime.
 */
export async function copySecret(value: string, seconds = 30): Promise<void> {
  await Clipboard.setStringAsync(value);
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(async () => {
    try {
      if ((await Clipboard.getStringAsync()) === value) await Clipboard.setStringAsync('');
    } catch {
      // Clipboard may be unavailable in the background.
    }
  }, seconds * 1000);
}

export async function copyText(value: string): Promise<void> {
  await Clipboard.setStringAsync(value);
}
