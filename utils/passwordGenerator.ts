/**
 * Password generator. Uses the platform CSPRNG (never Math.random) and
 * guarantees at least one character from every selected group.
 */
import { randomInt } from '../services/crypto';
import { assessPassword } from './passwordStrength';

export interface PasswordOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  /** Leave out characters that are easy to confuse (0/O, 1/l/I). */
  avoidAmbiguous?: boolean;
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?';
const AMBIGUOUS = /[0O1lI]/g;

export function generatePassword(options: PasswordOptions): string {
  const groups: string[] = [];
  if (options.includeUppercase) groups.push(UPPERCASE);
  if (options.includeLowercase) groups.push(LOWERCASE);
  if (options.includeNumbers) groups.push(NUMBERS);
  if (options.includeSymbols) groups.push(SYMBOLS);
  if (groups.length === 0) groups.push(LOWERCASE, UPPERCASE, NUMBERS);

  const sets = options.avoidAmbiguous ? groups.map((g) => g.replace(AMBIGUOUS, '')) : groups;
  const all = sets.join('');
  const length = Math.max(options.length, sets.length);

  const chars: string[] = sets.map((s) => s[randomInt(s.length)]);
  while (chars.length < length) chars.push(all[randomInt(all.length)]);

  // Fisher–Yates shuffle with the secure RNG.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/** Kept for older call sites; prefer assessPassword(). */
export function calculatePasswordStrength(password: string): {
  score: number;
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  color: string;
} {
  const r = assessPassword(password);
  const map = ['weak', 'weak', 'fair', 'strong', 'very-strong'] as const;
  const colors = ['#ef4444', '#ef4444', '#f59e0b', '#22c55e', '#10b981'];
  return { score: r.score, strength: map[r.level], color: colors[r.level] };
}

export const defaultPasswordOptions: PasswordOptions = {
  length: 20,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
  avoidAmbiguous: true,
};
