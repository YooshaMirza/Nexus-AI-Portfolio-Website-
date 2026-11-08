/**
 * limits.ts — keeps the Gemini bill safe.
 * Per visitor (hashed IP, never stored raw) per hour, plus a site-wide daily cap.
 * On Netlify the counters live in Netlify Blobs (shared by all function instances);
 * during `npm run dev` they live in memory. Counters are approximate (not atomic),
 * which is fine for a budget guard.
 */
import { createHash } from 'node:crypto';
import { SERVICE_MESSAGE } from '../src/serviceText';

export type Bucket = 'chat' | 'voice';

const LIMITS: Record<Bucket, { perIpHour: number; perDay: number }> = {
  chat: { perIpHour: Number(process.env.NEXUS_CHAT_PER_HOUR) || 40, perDay: Number(process.env.NEXUS_CHAT_DAILY) || 3000 },
  voice: { perIpHour: Number(process.env.NEXUS_VOICE_PER_HOUR) || 8, perDay: Number(process.env.NEXUS_VOICE_DAILY) || 400 },
};

export const LIMIT_MESSAGE = { ip: SERVICE_MESSAGE.ip, day: SERVICE_MESSAGE.day };

type Store = { get(k: string): Promise<number>; set(k: string, v: number): Promise<void> };

const memory = new Map<string, number>();
const memStore: Store = { get: async (k) => memory.get(k) ?? 0, set: async (k, v) => { memory.set(k, v); } };

let storeP: Promise<Store> | undefined;
function store(): Promise<Store> {
  storeP ??= (async () => {
    try {
      const { getStore } = await import('@netlify/blobs');
      const s = getStore('nexus-usage');
      await s.get('probe'); // throws outside Netlify
      return {
        get: async (k: string) => Number((await s.get(k)) ?? 0) || 0,
        set: async (k: string, v: number) => { await s.set(k, String(v)); },
      };
    } catch {
      return memStore;
    }
  })();
  return storeP;
}

const hash = (ip: string) => createHash('sha256').update(`nexus:${ip}`).digest('hex').slice(0, 16);

/** Counts one use. Returns null if allowed, or which limit was hit. */
export async function useQuota(bucket: Bucket, ip: string | undefined): Promise<null | 'ip' | 'day'> {
  const s = await store();
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const hour = now.toISOString().slice(0, 13);
  const dayKey = `${bucket}/day/${day}`;
  const ipKey = `${bucket}/ip/${hash(ip || 'unknown')}/${hour}`;
  const [d, h] = await Promise.all([s.get(dayKey), s.get(ipKey)]);
  if (d >= LIMITS[bucket].perDay) return 'day';
  if (h >= LIMITS[bucket].perIpHour) return 'ip';
  await Promise.all([s.set(dayKey, d + 1), s.set(ipKey, h + 1)]);
  return null;
}
