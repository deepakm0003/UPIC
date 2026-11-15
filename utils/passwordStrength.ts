/**
 * Explainable password strength.
 *
 * Phase 1 participants wanted to see *why* a password is weak, not just a
 * colour, so every penalty here produces a human-readable reason.
 */
import type { Tone } from '../theme/tokens';

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface StrengthResult {
  score: number; // 0-100
  level: StrengthLevel;
  label: string;
  tone: Tone;
  entropy: number;
  reasons: string[];
  crackTime: string;
}

const COMMON = new Set([
  'password', 'password1', 'password123', '123456', '1234567', '12345678', '123456789', '1234567890',
  'qwerty', 'qwerty123', 'qwertyuiop', 'abc123', '111111', '000000', '123123', 'iloveyou', 'admin',
  'admin123', 'welcome', 'welcome1', 'letmein', 'monkey', 'dragon', 'sunshine', 'princess', 'football',
  'baseball', 'master', 'shadow', 'superman', 'trustno1', 'passw0rd', 'p@ssw0rd', 'login', 'starwars',
  'whatever', 'hello123', 'freedom', 'charlie', 'michael', 'secret', 'zaq12wsx', '1q2w3e4r', 'asdfgh',
  'india123', 'pokemon', 'cricket', 'naruto', 'killer', 'computer',
]);

const COMMON_WORDS = ['password', 'passw0rd', 'qwerty', 'admin', 'welcome', 'letmein', 'iloveyou', 'monkey', 'dragon', 'login'];

const SEQUENCES = ['abcdefghijklmnopqrstuvwxyz', '01234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

function hasSequence(pw: string): boolean {
  const lower = pw.toLowerCase();
  for (const seq of SEQUENCES) {
    for (let i = 0; i + 3 <= seq.length; i++) {
      const chunk = seq.slice(i, i + 3);
      const reversed = chunk.split('').reverse().join('');
      if (lower.includes(chunk) || lower.includes(reversed)) return true;
    }
  }
  return false;
}

function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds > 3.15e13) return 'centuries';
  if (seconds < 1) return 'instantly';
  const units: [number, string][] = [
    [3.15e9, 'century'],
    [3.15e7, 'year'],
    [2.6e6, 'month'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
    [1, 'second'],
  ];
  for (const [size, name] of units) {
    if (seconds >= size) {
      const n = Math.floor(seconds / size);
      return `${n} ${name}${n === 1 ? '' : name === 'century' ? '' : 's'}`.replace('centurys', 'centuries');
    }
  }
  return 'instantly';
}

export function assessPassword(
  password: string,
  context: { username?: string; email?: string; site?: string } = {}
): StrengthResult {
  if (!password) {
    return { score: 0, level: 0, label: 'Not entered', tone: 'neutral', entropy: 0, reasons: [], crackTime: 'instantly' };
  }

  const reasons: string[] = [];
  let pool = 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  if (hasLower) pool += 26;
  if (hasUpper) pool += 26;
  if (hasDigit) pool += 10;
  if (hasSymbol) pool += 33;

  let entropy = password.length * Math.log2(Math.max(pool, 1));
  const lower = password.toLowerCase();

  if (COMMON.has(lower)) {
    entropy = Math.min(entropy, 8);
    reasons.push('This is one of the most common passwords — attackers try it first.');
  } else if (COMMON_WORDS.some((w) => lower.includes(w))) {
    entropy -= 22;
    reasons.push('Contains a common word that attackers guess early.');
  }
  if (hasSequence(password)) {
    entropy -= 10;
    reasons.push('Contains a predictable sequence like "123" or "abc".');
  }
  if (/(.)\1{2,}/.test(password)) {
    entropy -= 8;
    reasons.push('Repeats the same character several times.');
  }
  if (/(19|20)\d{2}$/.test(password)) {
    entropy -= 6;
    reasons.push('Ends with a year — a very common pattern.');
  }
  const personal = [context.username, context.email?.split('@')[0], context.site?.replace(/^www\./, '').split('.')[0]]
    .filter((s): s is string => !!s && s.length >= 3)
    .map((s) => s.toLowerCase());
  if (personal.some((p) => lower.includes(p))) {
    entropy -= 15;
    reasons.push('Contains your username or the website name.');
  }
  if (password.length < 8) reasons.push('Shorter than 8 characters.');
  else if (password.length < 12) reasons.push('Use at least 12 characters for a strong password.');
  if (/^\d+$/.test(password)) reasons.push('Uses only numbers.');
  else {
    const missing: string[] = [];
    if (!hasUpper) missing.push('capital letters');
    if (!hasDigit) missing.push('numbers');
    if (!hasSymbol) missing.push('symbols');
    if (missing.length >= 2 && password.length < 16) reasons.push(`Add ${missing.join(' or ')} to make it harder to guess.`);
  }

  entropy = Math.max(0, entropy);
  const level: StrengthLevel = entropy < 28 ? 0 : entropy < 40 ? 1 : entropy < 60 ? 2 : entropy < 80 ? 3 : 4;
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
  const tones: Tone[] = ['danger', 'danger', 'warning', 'success', 'success'];
  const score = Math.round(Math.min(100, (entropy / 90) * 100));
  // Offline attack at ~10 billion guesses per second.
  const crackTime = formatDuration(Math.pow(2, entropy) / 1e10 / 2);

  return { score, level, label: labels[level], tone: tones[level], entropy: Math.round(entropy), reasons, crackTime };
}
