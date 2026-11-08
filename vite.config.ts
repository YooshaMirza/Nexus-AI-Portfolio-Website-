import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { seo } from './seo';

/** Serves /api/nexus-token during `npm run dev` with the same code as the Netlify function. */
function nexusTokenDev(): Plugin {
  return {
    name: 'nexus-token-dev',
    configureServer(server) {
      server.middlewares.use('/api/nexus-token', async (req, res) => {
        try {
          const { useQuota, LIMIT_MESSAGE } = await server.ssrLoadModule('/server/limits.ts');
          const limited = await useQuota('voice', req.socket.remoteAddress);
          if (limited) { res.statusCode = 429; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ error: LIMIT_MESSAGE[limited], limited })); return; }
          const { createLiveToken } = await server.ssrLoadModule('/server/createToken.ts');
          const body = await createLiveToken();
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(body));
        } catch (e) {
          console.error('\n[nexus-token] could not create a Gemini token:', (e as Error).message, '\n');
          res.statusCode = 503;
          res.setHeader('content-type', 'application/json');
          const { SERVICE_MESSAGE, isQuotaError } = await server.ssrLoadModule('/src/serviceText.ts');
          res.end(JSON.stringify({ error: isQuotaError(e) ? SERVICE_MESSAGE.quota : (e as Error).message }));
        }
      });
      // same as netlify/functions/nexus-chat.mts (text chat, streamed as NDJSON)
      server.middlewares.use('/api/nexus-chat', async (req, res) => {
        try {
          if (req.method !== 'POST') { res.statusCode = 405; res.end('Use POST'); return; }
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const { useQuota, LIMIT_MESSAGE } = await server.ssrLoadModule('/server/limits.ts');
          const limited = await useQuota('chat', req.socket.remoteAddress);
          if (limited) { res.statusCode = 429; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ error: LIMIT_MESSAGE[limited], limited })); return; }
          const { streamChat, validate } = await server.ssrLoadModule('/server/chat.ts');
          const { messages, page } = validate(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
          res.setHeader('content-type', 'application/x-ndjson; charset=utf-8');
          const reader = (streamChat(messages, page) as ReadableStream<Uint8Array>).getReader();
          for (;;) { const { value, done } = await reader.read(); if (done) break; res.write(Buffer.from(value)); }
          res.end();
        } catch (e) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });
      // same as netlify/functions/visits.mts (counts in memory while developing)
      server.middlewares.use('/api/visits', async (req, res) => {
        try {
          let raw = '';
          for await (const c of req) raw += c;
          const first = (() => { try { return JSON.parse(raw || '{}').first === true; } catch { return false; } })();
          const { visits } = await server.ssrLoadModule('/server/visits.ts');
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(await visits(first, req.socket.remoteAddress)));
        } catch (e) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });
      // same as netlify/functions/github.mts
      server.middlewares.use('/api/github', async (_req, res) => {
        try {
          const { githubStats } = await server.ssrLoadModule('/server/github.ts');
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(await githubStats()));
        } catch (e) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });
      // same as netlify/functions/resume.mts
      server.middlewares.use('/api/resume', async (_req, res) => {
        try {
          const { fetchResume } = await server.ssrLoadModule('/server/resume.ts');
          const bytes: ArrayBuffer = await fetchResume();
          res.setHeader('content-type', 'application/pdf');
          res.end(Buffer.from(bytes));
        } catch (e) {
          console.error('\n[resume] could not fetch the resume PDF:', (e as Error).message, '\n');
          res.statusCode = 502;
          res.end('Resume unavailable');
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  // `npm run build:test` → one self-contained index.html for quick phone testing
  const single = process.env.SINGLEFILE === '1';
  return {
    plugins: [react(), nexusTokenDev(), seo(), ...(single ? [viteSingleFile()] : [])],
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 700,
      outDir: single ? 'dist-test' : 'dist',
      ...(single ? { assetsInlineLimit: 100_000_000 } : {}),
    },
  };
});
