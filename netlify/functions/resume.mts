import type { Config } from '@netlify/functions';
import { fetchResume } from '../../server/resume';

export default async () => {
  try {
    const bytes = await fetchResume();
    return new Response(bytes, {
      headers: {
        'content-type': 'application/pdf',
        'cache-control': 'public, max-age=300',
        // Netlify's CDN keeps a copy for an hour and refreshes it in the background
        'netlify-cdn-cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (e) {
    console.error('resume fetch failed', e);
    return new Response('Resume unavailable', { status: 502 });
  }
};

export const config: Config = { path: '/api/resume' };
