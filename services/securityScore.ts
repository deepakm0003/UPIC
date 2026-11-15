/**
 * The single UPIC security score.
 *
 * Phase 1 finding: participants did not know what the score was based on, and
 * the Privacy Dashboard showed a different number from the home screen. This
 * module is the only place the score is computed; Home, Password Health and the
 * Privacy Dashboard all call it, and it returns a plain-language breakdown of
 * exactly where points were lost.
 */
import type { PasswordEntry } from '../types';
import { assessPassword } from '../utils/passwordStrength';
import { displaySiteName } from '../utils/siteIcon';

export type IssueType = 'breached' | 'reused' | 'weak' | 'old';
export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface PasswordIssue {
  key: string;
  entryId: string;
  website: string;
  username: string;
  type: IssueType;
  severity: Severity;
  title: string;
  reason: string;
  fix: string;
}

export interface ScoreFactor {
  key: IssueType;
  label: string;
  affected: number;
  pointsLost: number;
  maxPoints: number;
  explanation: string;
}

export interface SecurityReport {
  score: number | null;
  label: string;
  summary: string;
  counts: { total: number; weak: number; reused: number; breached: number; old: number; healthy: number };
  issues: PasswordIssue[];
  factors: ScoreFactor[];
}

const OLD_AFTER_DAYS = 180;
const BREACHED_LIST = new Set(['password', 'password1', 'password123', '123456', '12345678', 'qwerty', 'abc123', 'letmein', 'iloveyou', 'admin', 'welcome']);
const severityRank: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export const SCORE_EXPLANATION =
  'Your score starts at 100 and loses points for passwords that are breached (up to 30), reused (up to 30), weak (up to 25) or older than 6 months (up to 15). It is calculated on your device from your vault only — the same score appears everywhere in UPIC.';

export function isBreached(p: PasswordEntry): boolean {
  return !!p.isBreached || BREACHED_LIST.has(p.password.toLowerCase());
}

export function computeSecurityReport(passwords: PasswordEntry[]): SecurityReport {
  const total = passwords.length;
  const issues: PasswordIssue[] = [];

  const byPassword = new Map<string, PasswordEntry[]>();
  passwords.forEach((p) => byPassword.set(p.password, [...(byPassword.get(p.password) ?? []), p]));

  const weakIds = new Set<string>();
  const reusedIds = new Set<string>();
  const breachedIds = new Set<string>();
  const oldIds = new Set<string>();
  const now = Date.now();

  for (const p of passwords) {
    const site = displaySiteName(p.website);
    const strength = assessPassword(p.password, { username: p.username, site: p.website });

    if (isBreached(p)) {
      breachedIds.add(p.id);
      issues.push({
        key: `${p.id}-breached`,
        entryId: p.id,
        website: p.website,
        username: p.username,
        type: 'breached',
        severity: 'critical',
        title: `${site} password appeared in a data breach`,
        reason: 'This exact password is on lists that attackers use. Anyone can try it against your account.',
        fix: 'Change it now to a new generated password.',
      });
    }

    const shared = byPassword.get(p.password) ?? [];
    if (shared.length > 1) {
      reusedIds.add(p.id);
      const others = shared.filter((o) => o.id !== p.id).map((o) => displaySiteName(o.website));
      issues.push({
        key: `${p.id}-reused`,
        entryId: p.id,
        website: p.website,
        username: p.username,
        type: 'reused',
        severity: 'high',
        title: `${site} reuses a password`,
        reason: `The same password is also used for ${others.slice(0, 3).join(', ')}${others.length > 3 ? '…' : ''}. If one site leaks, all of them are exposed.`,
        fix: 'Give this account its own generated password.',
      });
    }

    if (strength.level <= 1) {
      weakIds.add(p.id);
      issues.push({
        key: `${p.id}-weak`,
        entryId: p.id,
        website: p.website,
        username: p.username,
        type: 'weak',
        severity: strength.level === 0 ? 'high' : 'medium',
        title: `${site} has a ${strength.label.toLowerCase()} password`,
        reason: strength.reasons[0] ?? 'This password could be guessed quickly.',
        fix: 'Replace it with a long, random password.',
      });
    }

    const changed = new Date(p.updatedAt || p.createdAt).getTime();
    if (now - changed > OLD_AFTER_DAYS * 24 * 3600 * 1000) {
      oldIds.add(p.id);
      issues.push({
        key: `${p.id}-old`,
        entryId: p.id,
        website: p.website,
        username: p.username,
        type: 'old',
        severity: 'low',
        title: `${site} password is over 6 months old`,
        reason: 'Old passwords are more likely to have leaked somewhere without you knowing.',
        fix: 'Update it when convenient.',
      });
    }
  }

  issues.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  const share = (n: number) => (total === 0 ? 0 : n / total);
  const factor = (key: IssueType, label: string, affected: number, max: number, explanation: string): ScoreFactor => ({
    key,
    label,
    affected,
    maxPoints: max,
    pointsLost: affected === 0 ? 0 : Math.max(Math.round(share(affected) * max), Math.round(max / 3)),
    explanation,
  });

  const factors: ScoreFactor[] = [
    factor('breached', 'Breached passwords', breachedIds.size, 30, 'Passwords found in known data breaches.'),
    factor('reused', 'Reused passwords', reusedIds.size, 30, 'Accounts sharing the same password.'),
    factor('weak', 'Weak passwords', weakIds.size, 25, 'Passwords that are short, common or predictable.'),
    factor('old', 'Old passwords', oldIds.size, 15, 'Not changed in more than 6 months.'),
  ];

  const unhealthy = new Set([...weakIds, ...reusedIds, ...breachedIds]);
  const counts = {
    total,
    weak: weakIds.size,
    reused: reusedIds.size,
    breached: breachedIds.size,
    old: oldIds.size,
    healthy: total - unhealthy.size,
  };

  if (total === 0) {
    return {
      score: null,
      label: 'No score yet',
      summary: 'Add your first password to see your security score.',
      counts,
      issues,
      factors,
    };
  }

  const score = Math.max(0, 100 - factors.reduce((s, f) => s + f.pointsLost, 0));
  const label = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 50 ? 'Needs attention' : 'At risk';
  const urgent = issues.filter((i) => i.severity === 'critical' || i.severity === 'high').length;
  const summary =
    urgent > 0
      ? `${urgent} urgent issue${urgent === 1 ? '' : 's'} to fix`
      : issues.length > 0
        ? `${issues.length} small improvement${issues.length === 1 ? '' : 's'} available`
        : 'All your passwords look healthy';

  return { score, label, summary, counts, issues, factors };
}
