/**
 * Creates realistic demo login requests so the one-tap MFA flow can be tried
 * (and usability-tested) without a website integration.
 */
import { createMFAApproval, getAllPasswords } from './fileStorage';
import { randomInt } from './crypto';
import { displaySiteName } from '../utils/siteIcon';

const DEVICES = ['Chrome on Windows 11', 'Safari on MacBook Air', 'Firefox on Ubuntu', 'Edge on Surface Laptop', 'Chrome on Pixel 8'];
const LOCATIONS = ['New Delhi, India', 'Mumbai, India', 'Bengaluru, India', 'London, United Kingdom', 'Frankfurt, Germany', 'Singapore'];
const FALLBACK_SERVICES = ['Google', 'GitHub', 'Microsoft', 'Amazon', 'Netflix', 'LinkedIn'];

const pick = <T,>(list: T[]): T => list[randomInt(list.length)];

export async function simulateLoginRequest() {
  const saved = (await getAllPasswords()).map((p) => displaySiteName(p.website));
  const service = saved.length && randomInt(3) > 0 ? pick(saved) : pick(FALLBACK_SERVICES);
  const ip = `${pick([49, 103, 117, 152, 182])}.${randomInt(255)}.${randomInt(255)}.${randomInt(255)}`;
  return createMFAApproval(service, pick(LOCATIONS), pick(DEVICES), { ipAddress: ip });
}
