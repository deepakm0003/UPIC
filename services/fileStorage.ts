/**
 * UPIC local vault.
 *
 * Everything sensitive (passwords, MFA history, temporary emails) is stored in
 * one file per user, encrypted with AES-256-GCM under a random data key (DEK).
 * The DEK only exists in memory while the vault is unlocked; on disk it is
 * wrapped by:
 *   - the master password (PBKDF2-derived key),
 *   - the backup recovery key (shown once at setup),
 *   - optionally a device-only escrow key kept in the Keychain/Keystore, which
 *     enables "recover with email/phone on this device".
 * Biometric unlock stores the DEK in the secure enclave behind a biometric check.
 *
 * Vault format v1 (pre-UPIC) is migrated automatically on first unlock.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { files, secure } from './platformStorage';
import * as C from './crypto';
import { decryptData as legacyDecrypt } from './encryption';
import type { EmailAlias, KdfParams, MFAApproval, MFAStatus, PasswordEntry, User } from '../types';

const USER_KEY = '@current_user';
const REGISTRY_FILE = 'users_registry.json';
const WALKTHROUGH_KEY = '@onboarding_completed';

const vaultPath = (userId: string) => `users/${userId}/data.json`;
const safeKey = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '_');
const escrowKeyName = (userId: string) => `upic_escrow_${safeKey(userId)}`;
export const biometricKeyName = (userId: string) => `upic_bio_${safeKey(userId)}`;

interface VaultData {
  passwords: PasswordEntry[];
  mfaApprovals: MFAApproval[];
  emailAliases: EmailAlias[];
  knownDevices: string[];
}

interface VaultFile {
  encrypted: true;
  version: 2;
  kdf: KdfParams;
  keys: {
    master: C.Box;
    recovery?: C.Box & { salt: string; iterations: number };
    device?: C.Box;
  };
  payload: C.Box;
  updatedAt: string;
}

export type VaultErrorCode =
  | 'NO_USER'
  | 'BAD_PASSWORD'
  | 'LOCKED'
  | 'NO_VAULT'
  | 'BAD_RECOVERY_KEY'
  | 'NO_DEVICE_RECOVERY'
  | 'EXISTS';

export class VaultError extends Error {
  code: VaultErrorCode;
  constructor(code: VaultErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const emptyData = (): VaultData => ({ passwords: [], mfaApprovals: [], emailAliases: [], knownDevices: [] });

let users: User[] = [];
let session: { userId: string; dek: Uint8Array } | null = null;
let header: VaultFile | null = null;
let data: VaultData = emptyData();
let writeChain: Promise<void> = Promise.resolve();

/* ---------------- change notifications ---------------- */

const listeners = new Set<() => void>();
export function subscribeVault(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function emit() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // A broken listener must not break storage.
    }
  });
}

/* ---------------- users registry ---------------- */

export async function initStorage(): Promise<void> {
  try {
    const raw = await files.read(REGISTRY_FILE);
    users = raw ? (JSON.parse(raw).users as User[]) ?? [] : [];
  } catch (e) {
    console.error('[storage] could not read users registry', e);
    users = [];
  }
}

async function saveRegistry(): Promise<void> {
  await files.write(REGISTRY_FILE, JSON.stringify({ users }));
}

function findUser(identifier: string): User | undefined {
  const id = identifier.trim().toLowerCase();
  return users.find((u) => u.username.toLowerCase() === id || u.email.toLowerCase() === id);
}

async function updateUser(user: User): Promise<void> {
  const i = users.findIndex((u) => u.id === user.id);
  if (i === -1) users.push(user);
  else users[i] = user;
  await saveRegistry();
  const current = await AsyncStorage.getItem(USER_KEY);
  if (current && (JSON.parse(current) as User).id === user.id) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  emit();
}

async function setCurrentUser(user: User): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as User;
    if (users.length === 0) await initStorage();
    return users.find((u) => u.id === stored.id) ?? stored;
  } catch {
    return null;
  }
}

export async function getUserByUsername(identifier: string): Promise<User | null> {
  await initStorage();
  return findUser(identifier) ?? null;
}

export async function createUser(username: string, email: string, accountPassword: string): Promise<User> {
  await initStorage();
  if (findUser(username) || findUser(email)) {
    throw new VaultError('EXISTS', 'An account with that username or email already exists on this device.');
  }
  const user: User = {
    id: C.randomId('user'),
    username: username.trim(),
    email: email.trim().toLowerCase(),
    accountPasswordHash: await C.hashSecret(accountPassword),
    biometricEnabled: false,
    createdAt: new Date().toISOString(),
    recoveryEmail: email.trim().toLowerCase(),
  };
  users.push(user);
  await saveRegistry();
  await setCurrentUser(user);
  return user;
}

export async function verifyAccountPassword(user: User, password: string): Promise<boolean> {
  const { ok, legacy } = await C.verifySecret(password, user.accountPasswordHash);
  if (ok && legacy) {
    await updateUser({ ...user, accountPasswordHash: await C.hashSecret(password) });
  }
  return ok;
}

export async function changeAccountPassword(userId: string, current: string, next: string): Promise<void> {
  await initStorage();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new VaultError('NO_USER', 'User not found.');
  if (!(await verifyAccountPassword(user, current))) throw new VaultError('BAD_PASSWORD', 'Current account password is incorrect.');
  await updateUser({ ...user, accountPasswordHash: await C.hashSecret(next) });
}

/* ---------------- vault lifecycle ---------------- */

async function persist(): Promise<void> {
  if (!session || !header) throw new VaultError('LOCKED', 'Your vault is locked.');
  header.payload = C.sealJSON(session.dek, data);
  header.updatedAt = new Date().toISOString();
  const content = JSON.stringify(header);
  const path = vaultPath(session.userId);
  const job = writeChain.then(() => files.write(path, content));
  writeChain = job.catch(() => undefined);
  await job;
  emit();
}

function normalize(d: Partial<VaultData> | null | undefined): VaultData {
  return {
    passwords: d?.passwords ?? [],
    mfaApprovals: d?.mfaApprovals ?? [],
    emailAliases: d?.emailAliases ?? [],
    knownDevices: d?.knownDevices ?? [],
  };
}

async function readVaultFile(userId: string): Promise<VaultFile> {
  const raw = await files.read(vaultPath(userId));
  if (!raw) throw new VaultError('NO_VAULT', 'No vault found for this account on this device.');
  const parsed = JSON.parse(raw);
  if (parsed.version !== 2) throw new VaultError('NO_VAULT', 'This vault needs to be migrated.');
  return parsed as VaultFile;
}

async function wrapRecovery(dek: Uint8Array): Promise<{ key: string; box: VaultFile['keys']['recovery'] }> {
  const key = C.generateRecoveryKey();
  const kdf = { salt: C.toBase64(C.randomBytes(16)), iterations: 10_000 };
  const rkek = await C.deriveKey(C.normalizeRecoveryKey(key), kdf.salt, kdf.iterations);
  return { key, box: { ...C.seal(rkek, dek), ...kdf } };
}

async function wrapDevice(userId: string, dek: Uint8Array): Promise<C.Box> {
  const escrow = C.randomBytes(32);
  await secure.set(escrowKeyName(userId), C.toBase64(escrow));
  return C.seal(escrow, dek);
}

/**
 * Creates the encrypted vault for a new account (or re-creates it during
 * migration). Returns the backup recovery key, which must be shown to the user once.
 */
export async function setupMasterPassword(
  userId: string,
  masterPassword: string,
  initialData?: Partial<VaultData>
): Promise<{ recoveryKey: string }> {
  await initStorage();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new VaultError('NO_USER', 'User not found.');

  const kdf = C.newKdfParams();
  const kek = await C.deriveKey(masterPassword, kdf.salt, kdf.iterations);
  const dek = C.randomBytes(32);
  const recovery = await wrapRecovery(dek);

  header = {
    encrypted: true,
    version: 2,
    kdf,
    keys: { master: C.seal(kek, dek), recovery: recovery.box, device: await wrapDevice(userId, dek) },
    payload: { iv: '', ct: '' },
    updatedAt: new Date().toISOString(),
  };
  session = { userId, dek };
  data = normalize(initialData);

  const now = new Date().toISOString();
  await updateUser({
    ...user,
    kdf,
    masterPasswordHash: C.makeVerifier(kek),
    hasRecoveryKey: true,
    recoveryKeyCreatedAt: now,
    recoveryEmail: user.recoveryEmail ?? user.email,
  });
  await setCurrentUser(users.find((u) => u.id === userId)!);
  await persist();
  return { recoveryKey: recovery.key };
}

/** Kept for older call sites. */
export const setMasterPassword = setupMasterPassword;

async function openSession(user: User, unwrap: (h: VaultFile) => Uint8Array): Promise<void> {
  const h = await readVaultFile(user.id);
  let dek: Uint8Array;
  try {
    dek = unwrap(h);
  } catch {
    throw new VaultError('BAD_PASSWORD', 'Could not unlock the vault.');
  }
  data = normalize(C.openJSON<VaultData>(dek, h.payload));
  header = h;
  session = { userId: user.id, dek };
  await setCurrentUser(user);
  emit();
}

export interface UnlockResult {
  user: User;
  /** Set when an old vault was upgraded: show this new recovery key to the user. */
  migratedRecoveryKey?: string;
}

/** Unlock with username/email + master password. */
export async function unlockWithMasterPassword(identifier: string, masterPassword: string): Promise<UnlockResult> {
  await initStorage();
  const user = findUser(identifier) ?? users.find((u) => u.id === identifier);
  if (!user) throw new VaultError('NO_USER', 'No account with that username or email on this device.');
  if (!user.masterPasswordHash) throw new VaultError('NO_VAULT', 'This account has not finished setting up a master password.');

  // Legacy (pre-UPIC) vault: verify old hash, decrypt old format, upgrade to v2.
  if (!user.masterPasswordHash.startsWith('v2:')) {
    if (!(await C.legacyMasterHashMatches(masterPassword, user.masterPasswordHash))) {
      throw new VaultError('BAD_PASSWORD', 'Incorrect master password.');
    }
    let legacy: Partial<VaultData> = {};
    const raw = await files.read(vaultPath(user.id));
    if (raw) {
      const parsed = JSON.parse(raw);
      legacy = parsed.encrypted && parsed.data ? JSON.parse(await legacyDecrypt(parsed.data, masterPassword)) : parsed;
    }
    await setCurrentUser(user);
    const { recoveryKey } = await setupMasterPassword(user.id, masterPassword, legacy);
    return { user: users.find((u) => u.id === user.id)!, migratedRecoveryKey: recoveryKey };
  }

  const kdf = user.kdf!;
  const kek = await C.deriveKey(masterPassword, kdf.salt, kdf.iterations);
  if (!C.constantTimeEqual(C.makeVerifier(kek), user.masterPasswordHash)) {
    throw new VaultError('BAD_PASSWORD', 'Incorrect master password.');
  }
  await openSession(user, (h) => C.open(kek, h.keys.master));
  return { user };
}

/** Unlock with the data key released by a successful biometric check. */
export async function unlockWithDataKey(userId: string, dekB64: string): Promise<User> {
  await initStorage();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new VaultError('NO_USER', 'User not found.');
  await openSession(user, () => C.fromBase64(dekB64));
  return user;
}

export function getSessionDataKey(): string | null {
  return session ? C.toBase64(session.dek) : null;
}

export function isUnlocked(): boolean {
  return session !== null;
}

/** Clears keys and decrypted data from memory. The account stays on the device. */
export function lockVault(): void {
  if (session) session.dek.fill(0);
  session = null;
  header = null;
  data = emptyData();
  emit();
}

/** Signs out completely: locks and forgets the current account selection. */
export async function logout(): Promise<void> {
  lockVault();
  await AsyncStorage.removeItem(USER_KEY);
}

async function resetMasterKey(userId: string, newMaster: string): Promise<void> {
  if (!session || !header) throw new VaultError('LOCKED', 'Your vault is locked.');
  const user = users.find((u) => u.id === userId)!;
  const kdf = C.newKdfParams();
  const kek = await C.deriveKey(newMaster, kdf.salt, kdf.iterations);
  header.kdf = kdf;
  header.keys.master = C.seal(kek, session.dek);
  await updateUser({ ...user, kdf, masterPasswordHash: C.makeVerifier(kek) });
  await persist();
}

/** Re-checks the master password of the unlocked account (for sensitive actions such as export). */
export async function confirmMasterPassword(candidate: string): Promise<boolean> {
  if (!session) return false;
  const user = users.find((u) => u.id === session!.userId);
  if (!user?.kdf || !user.masterPasswordHash) return false;
  const kek = await C.deriveKey(candidate, user.kdf.salt, user.kdf.iterations);
  return C.constantTimeEqual(C.makeVerifier(kek), user.masterPasswordHash);
}

export async function changeMasterPassword(current: string, next: string): Promise<void> {
  if (!session) throw new VaultError('LOCKED', 'Your vault is locked.');
  const user = users.find((u) => u.id === session!.userId)!;
  const kek = await C.deriveKey(current, user.kdf!.salt, user.kdf!.iterations);
  if (!C.constantTimeEqual(C.makeVerifier(kek), user.masterPasswordHash ?? '')) {
    throw new VaultError('BAD_PASSWORD', 'Current master password is incorrect.');
  }
  await resetMasterKey(user.id, next);
}

/* ---------------- recovery ---------------- */

/** Forgot master password → backup recovery key. Returns a fresh recovery key (the old one stops working). */
export async function recoverWithRecoveryKey(
  identifier: string,
  recoveryKey: string,
  newMaster: string
): Promise<{ recoveryKey: string; user: User }> {
  await initStorage();
  const user = findUser(identifier);
  if (!user) throw new VaultError('NO_USER', 'No account with that username or email on this device.');
  const h = await readVaultFile(user.id);
  if (!h.keys.recovery) throw new VaultError('BAD_RECOVERY_KEY', 'This vault has no recovery key.');
  const rkek = await C.deriveKey(C.normalizeRecoveryKey(recoveryKey), h.keys.recovery.salt, h.keys.recovery.iterations);
  try {
    await openSession(user, (vf) => C.open(rkek, vf.keys.recovery!));
  } catch {
    throw new VaultError('BAD_RECOVERY_KEY', 'That recovery key does not match this account.');
  }
  await resetMasterKey(user.id, newMaster);
  const fresh = await rotateRecoveryKey();
  return { recoveryKey: fresh, user: users.find((u) => u.id === user.id)! };
}

/** Forgot master password → verified email/phone on this trusted device. */
export async function recoverOnThisDevice(identifier: string, newMaster: string): Promise<User> {
  await initStorage();
  const user = findUser(identifier);
  if (!user) throw new VaultError('NO_USER', 'No account with that username or email on this device.');
  const escrow = await secure.get(escrowKeyName(user.id));
  const h = await readVaultFile(user.id);
  if (!escrow || !h.keys.device) {
    throw new VaultError('NO_DEVICE_RECOVERY', 'Email/phone recovery is turned off for this device. Use your recovery key.');
  }
  await openSession(user, (vf) => C.open(C.fromBase64(escrow), vf.keys.device!));
  await resetMasterKey(user.id, newMaster);
  return users.find((u) => u.id === user.id)!;
}

export async function rotateRecoveryKey(): Promise<string> {
  if (!session || !header) throw new VaultError('LOCKED', 'Your vault is locked.');
  const recovery = await wrapRecovery(session.dek);
  header.keys.recovery = recovery.box;
  const user = users.find((u) => u.id === session!.userId)!;
  await updateUser({ ...user, hasRecoveryKey: true, recoveryKeyCreatedAt: new Date().toISOString() });
  await persist();
  return recovery.key;
}

export function isDeviceRecoveryEnabled(): boolean {
  return !!header?.keys.device;
}

export async function setDeviceRecoveryEnabled(enabled: boolean): Promise<void> {
  if (!session || !header) throw new VaultError('LOCKED', 'Your vault is locked.');
  if (enabled) {
    header.keys.device = await wrapDevice(session.userId, session.dek);
  } else {
    delete header.keys.device;
    await secure.remove(escrowKeyName(session.userId));
  }
  await persist();
}

export async function updateRecoveryContacts(contacts: { recoveryEmail?: string; recoveryPhone?: string }): Promise<User> {
  const current = await getCurrentUser();
  if (!current) throw new VaultError('NO_USER', 'Not signed in.');
  const updated = { ...current, ...contacts };
  await updateUser(updated);
  return updated;
}

export async function setBiometricFlag(userId: string, enabled: boolean): Promise<void> {
  const user = users.find((u) => u.id === userId);
  if (user) await updateUser({ ...user, biometricEnabled: enabled });
}

/* ---------------- walkthrough flag ---------------- */

export async function setWalkthroughDone(userId: string, done = true): Promise<void> {
  if (done) await AsyncStorage.setItem(`${WALKTHROUGH_KEY}_${userId}`, 'true');
  else await AsyncStorage.removeItem(`${WALKTHROUGH_KEY}_${userId}`);
}

export async function isWalkthroughDone(userId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(`${WALKTHROUGH_KEY}_${userId}`)) === 'true';
}

/* ---------------- passwords ---------------- */

function requireSession() {
  if (!session) throw new VaultError('LOCKED', 'Your vault is locked. Unlock it and try again.');
}

export async function getAllPasswords(_legacyMasterPassword?: string): Promise<PasswordEntry[]> {
  return [...data.passwords];
}

export async function getPassword(id: string, _legacyMasterPassword?: string): Promise<PasswordEntry | null> {
  return data.passwords.find((p) => p.id === id) ?? null;
}

export async function savePassword(
  entry: Partial<PasswordEntry> & { website: string; username: string; password: string },
  _legacyMasterPassword?: string
): Promise<PasswordEntry> {
  requireSession();
  const now = new Date().toISOString();
  const existing = entry.id ? data.passwords.find((p) => p.id === entry.id) : undefined;
  const saved: PasswordEntry = {
    ...existing,
    ...entry,
    id: existing?.id ?? C.randomId('pwd'),
    createdAt: existing?.createdAt ?? now,
    updatedAt: existing && existing.password === entry.password ? existing.updatedAt : now,
  } as PasswordEntry;
  if (existing && existing.password !== entry.password) saved.isBreached = false;
  if (existing && existing.website !== entry.website) {
    saved.brandColor = undefined;
    saved.iconUrl = undefined;
    saved.metaCheckedAt = undefined;
  }
  data.passwords = existing ? data.passwords.map((p) => (p.id === saved.id ? saved : p)) : [...data.passwords, saved];
  await persist();
  return saved;
}

export async function deletePassword(id: string, _legacyMasterPassword?: string): Promise<void> {
  requireSession();
  data.passwords = data.passwords.filter((p) => p.id !== id);
  await persist();
}

export async function updatePasswordLastUsed(id: string, _legacyMasterPassword?: string): Promise<void> {
  if (!session) return;
  const p = data.passwords.find((x) => x.id === id);
  if (!p) return;
  p.lastUsed = new Date().toISOString();
  await persist();
}

export async function setPasswordFavorite(id: string, favorite: boolean): Promise<void> {
  requireSession();
  const p = data.passwords.find((x) => x.id === id);
  if (!p) return;
  p.favorite = favorite;
  await persist();
}

/** Stores the colour/logo found for a website (kept inside the encrypted vault). */
export async function setPasswordBranding(id: string, branding: { brandColor?: string; iconUrl?: string }): Promise<void> {
  if (!session) return;
  const p = data.passwords.find((x) => x.id === id);
  if (!p) return;
  p.brandColor = branding.brandColor;
  p.iconUrl = branding.iconUrl;
  p.metaCheckedAt = new Date().toISOString();
  await persist();
}

/** Adds many entries at once, skipping exact duplicates. Returns how many were added. */
export async function importPasswords(
  entries: { website: string; username: string; password: string; notes?: string; category?: string }[]
): Promise<number> {
  requireSession();
  const now = new Date().toISOString();
  let added = 0;
  for (const e of entries) {
    const dup = data.passwords.some(
      (p) => p.website.toLowerCase() === e.website.toLowerCase() && p.username === e.username && p.password === e.password
    );
    if (dup || !e.website || !e.password) continue;
    data.passwords.push({ ...e, id: C.randomId('pwd'), createdAt: now, updatedAt: now });
    added++;
  }
  await persist();
  return added;
}

/* ---------------- MFA ---------------- */

export async function createMFAApproval(
  service: string,
  location: string,
  deviceInfo?: string,
  extra?: { ipAddress?: string; recognizedDevice?: boolean }
): Promise<MFAApproval> {
  requireSession();
  const now = Date.now();
  const approval: MFAApproval = {
    id: C.randomId('mfa'),
    service,
    location,
    timestamp: new Date(now).toISOString(),
    expiresAt: new Date(now + 2 * 60 * 1000).toISOString(),
    status: 'pending',
    deviceInfo,
    ipAddress: extra?.ipAddress,
    recognizedDevice: extra?.recognizedDevice ?? (deviceInfo ? data.knownDevices.includes(deviceInfo) : false),
  };
  data.mfaApprovals.push(approval);
  await persist();
  return approval;
}

export async function getPendingMFAApprovals(): Promise<MFAApproval[]> {
  if (!session) return [];
  const now = Date.now();
  let changed = false;
  data.mfaApprovals.forEach((a) => {
    if (a.status === 'pending' && a.expiresAt && new Date(a.expiresAt).getTime() < now) {
      a.status = 'expired';
      changed = true;
    }
  });
  if (changed) await persist();
  return data.mfaApprovals.filter((a) => a.status === 'pending').sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function getPendingMFACountSync(): number {
  const now = Date.now();
  return data.mfaApprovals.filter(
    (a) => a.status === 'pending' && (!a.expiresAt || new Date(a.expiresAt).getTime() >= now)
  ).length;
}

export async function getAllMFAApprovals(): Promise<MFAApproval[]> {
  return [...data.mfaApprovals].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 100);
}

export async function updateMFAApprovalStatus(id: string, status: Exclude<MFAStatus, 'pending'>): Promise<void> {
  requireSession();
  const a = data.mfaApprovals.find((x) => x.id === id);
  if (!a) return;
  a.status = status;
  a.respondedAt = new Date().toISOString();
  if (status === 'approved' && a.deviceInfo && !data.knownDevices.includes(a.deviceInfo)) {
    data.knownDevices.push(a.deviceInfo);
  }
  await persist();
}

/* ---------------- temporary emails (relay aliases) ---------------- */

const ALIAS_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function makeAliasAddress(label?: string, website?: string): string {
  const base = (label || website || 'mail')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('.')[0]
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12) || 'mail';
  return `${base}.${C.randomString(6, ALIAS_ALPHABET)}@relay.upic.app`;
}

export async function createEmailAlias(options?: {
  address?: string;
  label?: string;
  website?: string;
  forwardTo?: string;
  expiresInDays?: number | null;
  autoExpire?: boolean;
  replyMasking?: boolean;
}): Promise<EmailAlias> {
  requireSession();
  const now = Date.now();
  const days = options?.expiresInDays;
  const alias: EmailAlias = {
    id: C.randomId('alias'),
    alias: options?.address ?? makeAliasAddress(options?.label, options?.website),
    label: options?.label,
    website: options?.website,
    forwardTo: options?.forwardTo,
    status: 'active',
    createdAt: new Date(now).toISOString(),
    expiresAt: options?.autoExpire
      ? new Date(now + 24 * 3600 * 1000).toISOString()
      : days
        ? new Date(now + days * 24 * 3600 * 1000).toISOString()
        : undefined,
    autoExpire: options?.autoExpire ?? false,
    usedCount: 0,
    replyMasking: options?.replyMasking ?? false,
    replyMaskingEnabled: options?.replyMasking ?? false,
    emailsReceived: 0,
    loginsViaAlias: 0,
    trackerDetected: false,
    trackersBlocked: 0,
  };
  data.emailAliases.push(alias);
  await persist();
  return alias;
}

export async function getAllEmailAliases(): Promise<EmailAlias[]> {
  if (!session) return [];
  const now = Date.now();
  let changed = false;
  data.emailAliases.forEach((a) => {
    if (a.status === 'active' && a.expiresAt && new Date(a.expiresAt).getTime() < now) {
      a.status = 'expired';
      changed = true;
    }
  });
  if (changed) await persist();
  return [...data.emailAliases].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getEmailAlias(id: string): Promise<EmailAlias | null> {
  return data.emailAliases.find((a) => a.id === id) ?? null;
}

export async function updateEmailAliasStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
  requireSession();
  const a = data.emailAliases.find((x) => x.id === id);
  if (!a) return;
  a.status = status;
  await persist();
}

export async function deleteEmailAlias(id: string): Promise<void> {
  requireSession();
  data.emailAliases = data.emailAliases.filter((a) => a.id !== id);
  await persist();
}

export async function recordEmailAliasUsage(id: string, type: 'email' | 'login'): Promise<void> {
  if (!session) return;
  const a = data.emailAliases.find((x) => x.id === id);
  if (!a) return;
  a.usedCount = (a.usedCount ?? 0) + 1;
  a.lastUsedAt = new Date().toISOString();
  if (type === 'email') a.emailsReceived = (a.emailsReceived ?? 0) + 1;
  else a.loginsViaAlias = (a.loginsViaAlias ?? 0) + 1;
  if (a.autoExpire) {
    a.status = 'expired';
    a.expiresAt = new Date().toISOString();
  }
  await persist();
}

export async function recordTrackerBlocked(id: string, count = 1): Promise<void> {
  if (!session) return;
  const a = data.emailAliases.find((x) => x.id === id);
  if (!a) return;
  a.trackerDetected = true;
  a.trackersBlocked = (a.trackersBlocked ?? 0) + count;
  await persist();
}

/* ---------------- export ---------------- */

/** Plain export of the decrypted vault (the caller must warn the user). */
export function exportVaultSnapshot(): { passwords: PasswordEntry[]; emailAliases: EmailAlias[]; exportedAt: string } {
  requireSession();
  return { passwords: data.passwords, emailAliases: data.emailAliases, exportedAt: new Date().toISOString() };
}
