/**
 * createToken.ts — mints a short-lived, single-use Gemini Live token.
 * The real GEMINI_API_KEY never reaches the browser. The token is locked to
 * our model + config, so even if someone copies it they can only open one
 * Nexus session for a few minutes.
 */
import { GoogleGenAI } from '@google/genai';
import { LIVE_MODEL, liveConfig } from '../src/agent/liveConfig';

const DEFAULT_ALLOWED = [/^https?:\/\/localhost(:\d+)?$/, /^https?:\/\/127\.0\.0\.1(:\d+)?$/, /^https:\/\/[a-z0-9-]+\.netlify\.app$/];

export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  const extra = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (extra.includes(origin)) return true;
  return DEFAULT_ALLOWED.some((re) => re.test(origin));
}

export async function createLiveToken() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set on the server.');
  const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1alpha' } });
  // optional override in .env / Netlify, e.g. GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview
  const model = process.env.GEMINI_LIVE_MODEL || LIVE_MODEL;
  const now = Date.now();
  const token = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
      newSessionExpireTime: new Date(now + 2 * 60 * 1000).toISOString(),
      liveConnectConstraints: { model, config: liveConfig() },
    },
  });
  if (!token.name) throw new Error('Token service returned no token.');
  return { token: token.name, model, expiresAt: now + 30 * 60 * 1000 };
}
