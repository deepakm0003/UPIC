/**
 * Storage primitives with a web fallback.
 *
 * On iOS/Android the vault lives in the app's private documents folder and
 * secrets live in the Keychain / Android Keystore (expo-secure-store).
 * On web (used for development previews only) both fall back to browser
 * storage, which is NOT a secure enclave — the vault itself is still
 * AES-256-GCM encrypted.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';
const WEB_FILE_PREFIX = '@upic_file:';
const WEB_SECURE_PREFIX = '@upic_secure:';

function nativePath(relative: string): string {
  return `${FileSystem.documentDirectory}${relative}`;
}

export const files = {
  async read(relative: string): Promise<string | null> {
    if (isWeb) return AsyncStorage.getItem(WEB_FILE_PREFIX + relative);
    const path = nativePath(relative);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    return FileSystem.readAsStringAsync(path);
  },

  async write(relative: string, content: string): Promise<void> {
    if (isWeb) {
      await AsyncStorage.setItem(WEB_FILE_PREFIX + relative, content);
      return;
    }
    const path = nativePath(relative);
    const dir = path.substring(0, path.lastIndexOf('/') + 1);
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    // Write to a temp file then move, so a crash mid-write cannot corrupt the vault.
    const tmp = `${path}.tmp`;
    await FileSystem.writeAsStringAsync(tmp, content);
    await FileSystem.moveAsync({ from: tmp, to: path });
  },

  async remove(relative: string): Promise<void> {
    if (isWeb) {
      await AsyncStorage.removeItem(WEB_FILE_PREFIX + relative);
      return;
    }
    await FileSystem.deleteAsync(nativePath(relative), { idempotent: true });
  },
};

export const secure = {
  async get(key: string, opts?: { requireAuthentication?: boolean; prompt?: string }): Promise<string | null> {
    if (isWeb) return AsyncStorage.getItem(WEB_SECURE_PREFIX + key);
    try {
      return await SecureStore.getItemAsync(key, {
        requireAuthentication: opts?.requireAuthentication,
        authenticationPrompt: opts?.prompt,
      });
    } catch {
      return null;
    }
  },

  async set(key: string, value: string, opts?: { requireAuthentication?: boolean; prompt?: string }): Promise<void> {
    if (isWeb) {
      await AsyncStorage.setItem(WEB_SECURE_PREFIX + key, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value, {
        requireAuthentication: opts?.requireAuthentication,
        authenticationPrompt: opts?.prompt,
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (e: any) {
      // Expo Go on iOS may lack the Face ID usage string; store without the auth flag.
      if (opts?.requireAuthentication) {
        await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
      } else {
        throw e;
      }
    }
  },

  async remove(key: string): Promise<void> {
    if (isWeb) {
      await AsyncStorage.removeItem(WEB_SECURE_PREFIX + key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Already gone.
    }
  },
};
