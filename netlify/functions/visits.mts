import type { Config, Context } from '@netlify/functions';
import { visits } from '../../server/visits';

/** POST {first: boolean} → {count, since}. Counts a browser's first visit, deduped per IP per day. */
export default async (req: Request, context: Context) => {
  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    return Response.json(await visits(body?.first === true, context.ip), { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    console.error('visit counter failed', e);
    return Response.json({ error: 'counter unavailable' }, { status: 502 });
  }
};

export const config: Config = { path: '/api/visits' };
