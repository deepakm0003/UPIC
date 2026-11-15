import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as Vault from '../services/fileStorage';
import { computeSecurityReport, SecurityReport } from '../services/securityScore';
import type { EmailAlias, MFAApproval, PasswordEntry } from '../types';

/** Re-runs `load` on mount, on screen focus and whenever the vault changes. */
function useLive<T>(load: () => Promise<T>, initial: T): { value: T; loading: boolean; reload: () => Promise<void> } {
  const [value, setValue] = useState<T>(initial);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setValue(await load());
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => Vault.subscribeVault(() => void reload()), [reload]);
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  return { value, loading, reload };
}

export function usePasswords() {
  const load = useCallback(() => Vault.getAllPasswords(), []);
  const { value, loading, reload } = useLive<PasswordEntry[]>(load, []);
  return { passwords: value, loading, reload };
}

export function useSecurityReport(): { report: SecurityReport; passwords: PasswordEntry[]; loading: boolean; reload: () => Promise<void> } {
  const { passwords, loading, reload } = usePasswords();
  const report = useMemo(() => computeSecurityReport(passwords), [passwords]);
  return { report, passwords, loading, reload };
}

export function useAliases() {
  const load = useCallback(() => Vault.getAllEmailAliases(), []);
  const { value, loading, reload } = useLive<EmailAlias[]>(load, []);
  return { aliases: value, loading, reload };
}

export function useMfa() {
  const load = useCallback(async () => {
    const [pending, all] = await Promise.all([Vault.getPendingMFAApprovals(), Vault.getAllMFAApprovals()]);
    return { pending, all };
  }, []);
  const { value, loading, reload } = useLive<{ pending: MFAApproval[]; all: MFAApproval[] }>(load, { pending: [], all: [] });
  return { ...value, loading, reload };
}

/** Pending MFA count for the tab-bar badge (no focus dependency). */
export function usePendingMfaCount(): number {
  const [count, setCount] = useState(Vault.getPendingMFACountSync());
  useEffect(() => {
    const update = () => setCount(Vault.getPendingMFACountSync());
    update();
    const unsub = Vault.subscribeVault(update);
    const id = setInterval(update, 15_000);
    return () => {
      unsub();
      clearInterval(id);
    };
  }, []);
  return count;
}
