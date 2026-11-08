import type { Config } from '@netlify/functions';
import { githubStats } from '../../server/github';

export default async () => {
  try {
    return Response.json(await githubStats(), {
      headers: { 'cache-control': 'public, max-age=600', 'netlify-cdn-cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (e) {
    console.error('github pulse failed', e);
    return Response.json({ error: 'GitHub unavailable' }, { status: 502 });
  }
};

export const config: Config = { path: '/api/github' };
