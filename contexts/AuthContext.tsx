import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Vault from '../services/fileStorage';
import { secure } from '../services/platformStorage';
import { defaultPrefs, loadPrefs, savePrefs, SecurityPrefs } from '../services/preferences';
import type { User } from '../types';

export type AuthStatus = 'loading' | 'signedOut' | 'locked' | 'unlocked';

interface AuthContextType {
  status: AuthStatus;
  user: User | null;
  /** An account that was created but never finished master-password setup. */
  pendingSetupUser: User | null;
  walkthroughDone: boolean;
  markWalkthroughDone: (done?: boolean) => Promise<void>;
  prefs: SecurityPrefs;
  updatePrefs: (patch: Partial<SecurityPrefs>) => Promise<void>;
  biometricAvailable: boolean;
  biometricLabel: string;
  biometricEnabled: boolean;
  signIn: (identifier: string, masterPassword: string) => Promise<Vault.UnlockResult>;
  unlock: (masterPassword: string) => Promise<void>;
  unlockWithBiometrics: (target?: User) => Promise<boolean>;
  enableBiometrics: () => Promise<boolean>;
  disableBiometrics: () => Promise<void>;
  /** Ends the sign-up / recovery flow and enters the app. */
  finishSetup: () => Promise<void>;
  lock: () => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  reportActivity: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const bioModeKey = (userId: string) => `@upic_bio_mode_${userId}`;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [pendingSetupUser, setPendingSetupUser] = useState<User | null>(null);
  const [walkthroughDone, setWalkthroughDone] = useState(true);
  const [prefs, setPrefs] = useState<SecurityPrefs>(defaultPrefs);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');
  const statusRef = useRef<AuthStatus>('loading');
  const lastActivity = useRef(Date.now());
  const backgroundAt = useRef<number | null>(null);

  const setStatusBoth = (s: AuthStatus) => {
    statusRef.current = s;
    setStatus(s);
  };

  const loadUserContext = useCallback(async (u: User) => {
    setUser(u);
    setPrefs(await loadPrefs(u.id));
    setWalkthroughDone(await Vault.isWalkthroughDone(u.id));
  }, []);

  /* ---------- startup ---------- */
  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS !== 'web') {
          const [hw, enrolled, types] = await Promise.all([
            LocalAuthentication.hasHardwareAsync(),
            LocalAuthentication.isEnrolledAsync(),
            LocalAuthentication.supportedAuthenticationTypesAsync(),
          ]);
          setBiometricAvailable(hw && enrolled);
          setBiometricLabel(
            types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
              ? Platform.OS === 'ios'
                ? 'Face ID'
                : 'Face unlock'
              : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
                ? Platform.OS === 'ios'
                  ? 'Touch ID'
                  : 'Fingerprint'
                : 'Biometrics'
          );
        }
        await Vault.initStorage();
        const current = await Vault.getCurrentUser();
        if (current?.masterPasswordHash) {
          await loadUserContext(current);
          setStatusBoth('locked');
        } else {
          setPendingSetupUser(current ?? null);
          setStatusBoth('signedOut');
        }
      } catch (e) {
        console.error('[auth] startup failed', e);
        setStatusBoth('signedOut');
      }
    })();
  }, [loadUserContext]);

  /* ---------- keep user in sync with storage ---------- */
  const refreshUser = useCallback(async () => {
    const current = await Vault.getCurrentUser();
    if (current) setUser(current);
  }, []);

  useEffect(() => Vault.subscribeVault(() => void refreshUser()), [refreshUser]);

  /* ---------- lock / sign out ---------- */
  const lock = useCallback(() => {
    if (statusRef.current !== 'unlocked') return;
    Vault.lockVault();
    setStatusBoth('locked');
  }, []);

  const signOut = useCallback(async () => {
    await Vault.logout();
    setUser(null);
    setPendingSetupUser(null);
    setStatusBoth('signedOut');
  }, []);

  /* ---------- auto-lock ---------- */
  const reportActivity = useCallback(() => {
    lastActivity.current = Date.now();
  }, []);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'background') {
        backgroundAt.current = Date.now();
        if (prefs.autoLockMinutes === 0) lock();
      } else if (next === 'active') {
        const since = backgroundAt.current;
        backgroundAt.current = null;
        if (since && Date.now() - since >= prefs.autoLockMinutes * 60_000) lock();
        lastActivity.current = Date.now();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [prefs.autoLockMinutes, lock]);

  useEffect(() => {
    if (status !== 'unlocked' || prefs.autoLockMinutes === 0) return;
    const limit = prefs.autoLockMinutes * 60_000;
    const id = setInterval(() => {
      if (Date.now() - lastActivity.current >= limit) lock();
    }, 10_000);
    return () => clearInterval(id);
  }, [status, prefs.autoLockMinutes, lock]);

  /* ---------- unlocking ---------- */
  const enterApp = useCallback(
    async (u: User) => {
      await loadUserContext(u);
      lastActivity.current = Date.now();
      setPendingSetupUser(null);
      setStatusBoth('unlocked');
    },
    [loadUserContext]
  );

  const signIn = useCallback(
    async (identifier: string, masterPassword: string) => {
      const result = await Vault.unlockWithMasterPassword(identifier, masterPassword);
      // A migrated vault first shows its new recovery key; the screen then calls finishSetup().
      if (!result.migratedRecoveryKey) await enterApp(result.user);
      else await loadUserContext(result.user);
      return result;
    },
    [enterApp, loadUserContext]
  );

  const unlock = useCallback(
    async (masterPassword: string) => {
      if (!user) throw new Vault.VaultError('NO_USER', 'No account selected.');
      const result = await Vault.unlockWithMasterPassword(user.id, masterPassword);
      await enterApp(result.user);
    },
    [user, enterApp]
  );

  const unlockWithBiometrics = useCallback(
    async (target?: User) => {
      const who = target ?? user;
      if (!who || !who.biometricEnabled) return false;
      const mode = await AsyncStorage.getItem(bioModeKey(who.id));
      let dek: string | null = null;
      if (mode === 'secure') {
        dek = await secure.get(Vault.biometricKeyName(who.id), { requireAuthentication: true, prompt: 'Unlock UPIC' });
      } else {
        const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock UPIC', cancelLabel: 'Use master password' });
        if (!res.success) return false;
        dek = await secure.get(Vault.biometricKeyName(who.id));
      }
      if (!dek) return false;
      try {
        const u = await Vault.unlockWithDataKey(who.id, dek);
        await enterApp(u);
        return true;
      } catch {
        return false;
      }
    },
    [user, enterApp]
  );

  const enableBiometrics = useCallback(async () => {
    const current = await Vault.getCurrentUser();
    const dek = Vault.getSessionDataKey();
    if (!current || !dek || !biometricAvailable) return false;
    const res = await LocalAuthentication.authenticateAsync({ promptMessage: `Turn on ${biometricLabel} for UPIC` });
    if (!res.success) return false;
    let mode: 'secure' | 'app' = 'secure';
    try {
      await secure.set(Vault.biometricKeyName(current.id), dek, { requireAuthentication: true, prompt: 'Protect UPIC with biometrics' });
    } catch {
      mode = 'app';
      await secure.set(Vault.biometricKeyName(current.id), dek);
    }
    await AsyncStorage.setItem(bioModeKey(current.id), mode);
    await Vault.setBiometricFlag(current.id, true);
    await refreshUser();
    return true;
  }, [biometricAvailable, biometricLabel, refreshUser]);

  const disableBiometrics = useCallback(async () => {
    const current = await Vault.getCurrentUser();
    if (!current) return;
    await secure.remove(Vault.biometricKeyName(current.id));
    await AsyncStorage.removeItem(bioModeKey(current.id));
    await Vault.setBiometricFlag(current.id, false);
    await refreshUser();
  }, [refreshUser]);

  const finishSetup = useCallback(async () => {
    const current = await Vault.getCurrentUser();
    if (!current) {
      console.warn('[auth] finishSetup: no current user');
      setStatusBoth('signedOut');
      return;
    }
    if (Vault.isUnlocked()) {
      await enterApp(current);
      return;
    }
    // The vault was locked in the meantime (e.g. the app reloaded): never leave the user stuck.
    console.warn('[auth] finishSetup: vault is locked, showing the unlock screen');
    await loadUserContext(current);
    setPendingSetupUser(null);
    setStatusBoth(current.masterPasswordHash ? 'locked' : 'signedOut');
  }, [enterApp, loadUserContext]);

  const updatePrefs = useCallback(
    async (patch: Partial<SecurityPrefs>) => {
      if (!user) return;
      const next = { ...prefs, ...patch };
      setPrefs(next);
      await savePrefs(user.id, next);
    },
    [user, prefs]
  );

  const markWalkthroughDone = useCallback(
    async (done = true) => {
      if (!user) return;
      await Vault.setWalkthroughDone(user.id, done);
      setWalkthroughDone(done);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        pendingSetupUser,
        walkthroughDone,
        markWalkthroughDone,
        prefs,
        updatePrefs,
        biometricAvailable,
        biometricLabel,
        biometricEnabled: !!user?.biometricEnabled && biometricAvailable,
        signIn,
        unlock,
        unlockWithBiometrics,
        enableBiometrics,
        disableBiometrics,
        finishSetup,
        lock,
        signOut,
        refreshUser,
        reportActivity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
