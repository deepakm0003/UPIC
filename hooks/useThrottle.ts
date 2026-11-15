import { useEffect, useRef, useState } from 'react';

/**
 * Slows down repeated wrong master-password guesses: after 5 failures the
 * form locks for 30 s, doubling with each further failure (max 15 min).
 */
export function useUnlockThrottle() {
  const failures = useRef(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const remaining = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  return {
    remaining,
    blocked: remaining > 0,
    fail() {
      failures.current += 1;
      if (failures.current >= 5) {
        const secs = Math.min(900, 30 * 2 ** (failures.current - 5));
        setLockedUntil(Date.now() + secs * 1000);
        setNow(Date.now());
      }
    },
    reset() {
      failures.current = 0;
      setLockedUntil(0);
    },
  };
}
