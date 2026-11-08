import type { Config, Context } from '@netlify/functions';
import { LIMIT_MESSAGE, useQuota } from '../../server/limits';
import { createLiveToken, isAllowedOrigin } from '../../server/createToken';
import { SERVICE_MESSAGE, isQuotaError } from '../../src/serviceText';

export default async (req: Request, context: Context) => {
  const origin = req.headers.get('origin') ?? new URL(req.headers.get('referer') ?? 'http://x').origin;
  if (req.method !== 'POST') return new Response('Use POST', { status: 405 });
  if (!isAllowedOrigin(origin)) return new Response('Origin not allowed', { status: 403 });
  const limited = await useQuota('voice', context.ip).catch(() => null);
  if (limited) return Response.json({ error: LIMIT_MESSAGE[limited], limited }, { status: 429 });
  try {
    const body = await createLiveToken();
    return Response.json(body, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    console.error('nexus-token failed', e);
    return Response.json({ error: isQuotaError(e) ? SERVICE_MESSAGE.quota : 'Nexus is unavailable right now.' }, { status: 503 });
  }
};

export const config: Config = { path: '/api/nexus-token' };
