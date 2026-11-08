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
    // a safe reason code (never the key) so a failing deploy can be diagnosed from the browser console
    const m = String((e as Error)?.message ?? e);
    const code = /GEMINI_API_KEY is not set/.test(m) ? 'no-key' : /API key not valid|API_KEY_INVALID|PERMISSION_DENIED|401|403/i.test(m) ? 'key-rejected' : /not found|404|unsupported/i.test(m) ? 'model-unavailable' : isQuotaError(e) ? 'quota' : 'other';
    return Response.json({ error: isQuotaError(e) ? SERVICE_MESSAGE.quota : 'Nexus is unavailable right now.', code }, { status: 503 });
  }
};

export const config: Config = { path: '/api/nexus-token' };
