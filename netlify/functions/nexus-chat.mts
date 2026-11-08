import type { Config, Context } from '@netlify/functions';
import { LIMIT_MESSAGE, useQuota } from '../../server/limits';
import { isAllowedOrigin } from '../../server/createToken';
import { streamChat, validate } from '../../server/chat';

export default async (req: Request, context: Context) => {
  const origin = req.headers.get('origin') ?? new URL(req.headers.get('referer') ?? 'http://x').origin;
  if (req.method !== 'POST') return new Response('Use POST', { status: 405 });
  if (!isAllowedOrigin(origin)) return new Response('Origin not allowed', { status: 403 });
  const limited = await useQuota('chat', context.ip).catch(() => null);
  if (limited) return Response.json({ error: LIMIT_MESSAGE[limited], limited }, { status: 429 });
  let parsed;
  try { parsed = validate(await req.json()); } catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }); }
  return new Response(streamChat(parsed.messages, parsed.page), {
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' },
  });
};

export const config: Config = { path: '/api/nexus-chat' };
