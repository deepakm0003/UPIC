export interface KdfParams {
  alg: 'PBKDF2-SHA256';
  salt: string; // base64
  iterations: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  /** Salted PBKDF2 hash of the account password ("pbkdf2$…"); legacy accounts may still hold a bare SHA-256 hex. */
  accountPasswordHash: string;
  /** Verifier derived from the master key ("v2:…"); never the master password itself. */
  masterPasswordHash?: string;
  kdf?: KdfParams;
  biometricEnabled: boolean;
  createdAt: string;
  recoveryEmail?: string;
  recoveryPhone?: string;
  hasRecoveryKey?: boolean;
  recoveryKeyCreatedAt?: string;
}

export interface PasswordEntry {
  id: string;
  website: string;
  username: string;
  password: string;
  notes?: string;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
  category?: string;
  tags?: string[];
  isShared?: boolean;
  sharedWith?: string[];
  isBreached?: boolean;
  iconUrl?: string;
  /** Pinned to the top of the vault (heart). */
  favorite?: boolean;
  /** Brand colour read from the website itself (see services/siteMeta.ts). */
  brandColor?: string;
  /** When UPIC last looked up this site's colour and logo. */
  metaCheckedAt?: string;
}

export type MFAStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface MFAApproval {
  id: string;
  service: string;
  location: string;
  timestamp: string;
  status: MFAStatus;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  aliasUsed?: string;
  /** False when the request comes from a device the user has never approved before. */
  recognizedDevice?: boolean;
  respondedAt?: string;
  expiresAt?: string;
}

export interface EmailAlias {
  id: string;
  alias: string;
  status: 'active' | 'inactive' | 'expired';
  createdAt: string;
  expiresAt?: string;
  /** Friendly name shown in the app, e.g. "Shopping account". */
  label?: string;
  /** Which website this temporary email was made for. */
  website?: string;
  /** Real address that messages are forwarded to. */
  forwardTo?: string;
  autoExpire?: boolean;
  usedCount?: number;
  lastUsedAt?: string;
  replyMasking?: boolean;
  replyMaskingEnabled?: boolean;
  emailsReceived?: number;
  loginsViaAlias?: number;
  trackerDetected?: boolean;
  trackersBlocked?: number;
}

export interface SecurityEvent {
  id: string;
  type: 'login' | 'mfa_approval' | 'mfa_denial' | 'password_shared' | 'alias_created' | 'alias_expired' | 'tracker_blocked';
  title: string;
  description: string;
  timestamp: string;
  location?: string;
  metadata?: Record<string, any>;
}

export interface PrivacyMetrics {
  reusedPasswords: number;
  uniquePasswords: number;
  mfaApprovalsThisWeek: number;
  aliasesUsed: number;
  totalAliases: number;
  digitalHygieneScore: number; // 0-100
  trackersBlocked: number;
  loginsViaAlias: number;
}

export interface DashboardData {
  metrics: PrivacyMetrics;
  events: SecurityEvent[];
  recentEvents: SecurityEvent[];
}

/* ---------------- Navigation ---------------- */

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  MasterPasswordSetup: undefined;
  RecoveryKey: { recoveryKey: string; mode: 'setup' | 'rotated' };
  BiometricSetup: undefined;
  HowUPICProtects: { onboarding?: boolean } | undefined;
  ForgotMasterPassword: { identifier?: string } | undefined;
  ForgotUsername: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Passwords: undefined;
  MFA: undefined;
  Relay: undefined;
  Settings: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  Walkthrough: undefined;
  PasswordDetails: { passwordId: string };
  PasswordEdit: { passwordId?: string; generated?: string; focusFix?: boolean } | undefined;
  PasswordGenerator: { returnTo?: 'PasswordEdit'; passwordId?: string } | undefined;
  PasswordHealth: undefined;
  ImportExport: undefined;
  MFAHistory: undefined;
  RelayIntro: undefined;
  CreateAlias: undefined;
  AliasDetails: { aliasId: string };
  PrivacyDashboard: undefined;
  HowUPICProtects: { onboarding?: boolean } | undefined;
  RecoverySettings: undefined;
  RecoveryKey: { recoveryKey: string; mode: 'setup' | 'rotated' };
  ChangeMasterPassword: undefined;
  Appearance: undefined;
  About: undefined;
};
