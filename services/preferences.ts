import AsyncStorage from '@react-native-async-storage/async-storage';

/** Per-user security preferences (not secret, so stored outside the vault). */
export interface SecurityPrefs {
  /** Minutes of inactivity before UPIC locks. 0 = lock as soon as you leave the app. */
  autoLockMinutes: 0 | 1 | 5 | 15;
  /** Require biometrics (or a deliberate hold) to approve logins from new devices. */
  confirmNewDevices: boolean;
  /** Reminders about old, weak or reused passwords. */
  passwordReminders: boolean;
  /** Look up each saved website's colour and logo from the website itself. */
  fetchSiteBranding: boolean;
}

export const defaultPrefs: SecurityPrefs = {
  autoLockMinutes: 5,
  confirmNewDevices: true,
  passwordReminders: true,
  fetchSiteBranding: true,
};

const key = (userId: string) => `@upic_prefs_${userId}`;

export async function loadPrefs(userId: string): Promise<SecurityPrefs> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    return raw ? { ...defaultPrefs, ...JSON.parse(raw) } : defaultPrefs;
  } catch {
    return defaultPrefs;
  }
}

export async function savePrefs(userId: string, prefs: SecurityPrefs): Promise<void> {
  await AsyncStorage.setItem(key(userId), JSON.stringify(prefs));
}

export const autoLockLabel = (m: SecurityPrefs['autoLockMinutes']) =>
  m === 0 ? 'Immediately' : `After ${m} minute${m === 1 ? '' : 's'}`;
