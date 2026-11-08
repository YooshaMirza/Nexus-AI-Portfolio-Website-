/**
 * visits.ts — the site's visitor counter, counted from launch day (VISITS_SINCE). Earlier visits to the
 * old site were never recorded anywhere, so they can't be included.
 * - A visitor = a browser seen for the first time (the page remembers it in localStorage and only then
 *   sends `first: true`).
 * - Anti-spam: one count per hashed IP per day, whatever the page sends. IPs are hashed, never stored.
 * - Netlify Blobs on Netlify (conditional writes, so two visits at once can't overwrite each other);
 *   memory during `npm run dev`.
 */
import { createHash } from 'node:crypto';

export const VISITS_SINCE = '2026-11-08';

type Store = {
  /** returns the total after this visit */
  bump(ipKey: string): Promise<number>;
  total(): Promise<number>;
};

const mem = { total: 0, seen: new Set<string>() };
const memStore: Store = {
  bump: async (k) => { if (!mem.seen.has(k)) { mem.seen.add(k); mem.total++; } return mem.total; },
  total: async () => mem.total,
};

let storeP: Promise<Store> | undefined;
function store(): Promise<Store> {
  storeP ??= (async () => {
    try {
      const { getStore } = await import('@netlify/blobs');
      const s = getStore('nexus-visits');
      await s.get('probe'); // throws outside Netlify
      const total = async () => Number(await s.get('total')) || 0;
      return {
        total,
        bump: async (ipKey) => {
          // this IP already counted today: just report the total
          const fresh = await s.set(ipKey, '1', { onlyIfNew: true });
          if (!fresh.modified) return total();
          for (let i = 0; i < 6; i++) {
            const cur = await s.getWithMetadata('total');
            const next = (Number(cur?.data) || 0) + 1;
            const w = cur ? await s.set('total', String(next), { onlyIfMatch: cur.etag }) : await s.set('total', String(next), { onlyIfNew: true });
            if (w.modified) return next;
          }
          return total();
        },
      };
    } catch {
      return memStore;
    }
  })();
  return storeP;
}

const hash = (ip: string) => createHash('sha256').update(`visit:${ip}`).digest('hex').slice(0, 16);

/** Count a first visit (deduped per IP per day) or just read the total. */
export async function visits(first: boolean, ip: string | undefined): Promise<{ count: number; since: string }> {
  const s = await store();
  const day = new Date().toISOString().slice(0, 10);
  const count = first ? await s.bump(`ip/${day}/${hash(ip || 'unknown')}`) : await s.total();
  return { count, since: VISITS_SINCE };
}
