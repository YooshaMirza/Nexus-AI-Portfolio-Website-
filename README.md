# Mirza Yoosha Minhaj — portfolio with Nexus, a live voice agent

A one-page portfolio where **Nexus**, a Gemini Live voice agent, talks visitors through the work. It knows what they are looking at and can scroll the page for them.

## What's inside

| Part | File |
|---|---|
| All content (page **and** Nexus's knowledge) | `src/content.ts` |
| Nexus's persona, rules and tools | `src/agent/liveConfig.ts` |
| Voice session (Gemini Live, captions, page context) | `src/agent/NexusAgent.ts` |
| Mic capture and playback | `src/agent/audio.ts` |
| 3D voice blob (three.js shader) | `src/voice/VoiceBlob.ts` |
| Blob flight between hero and dock | `src/components/Stage.tsx` |
| Secure token endpoint | `server/createToken.ts`, `netlify/functions/nexus-token.mts` |
| Scripted preview, no API key needed | `src/agent/DemoAgent.ts` (open the site with `?demo`) |

To change anything about you, such as a new job, project or link, edit `src/content.ts` only. The page and Nexus both update from it.

## Run locally

```bash
npm install
cp .env.example .env      # then put your real GEMINI_API_KEY in .env
npm run dev               # http://localhost:5173
```

- `http://localhost:5173/?demo` previews the whole experience with a scripted Nexus and no key.
- `http://localhost:5173/?demo&autostart` does the same and starts Nexus immediately.

## Deploy on Netlify

1. Push this folder to a GitHub repo and import it in Netlify. `netlify.toml` already sets the build command and output folder.
2. In **Site configuration → Environment variables**, add `GEMINI_API_KEY`.
3. If you use a custom domain such as `yoosha.tech`, also add `ALLOWED_ORIGINS=https://yoosha.tech`. Any `*.netlify.app` URL and localhost are allowed by default.
4. Deploy.

## How the voice agent works

- **The key never reaches the browser.** The browser asks `/api/nexus-token` for a single-use token that expires in 30 minutes and is locked to the Nexus model and config. Even if someone copies a token, it only opens one Nexus session.
- **Model:** `gemini-3.8-live`, the current stable Live model. `gemini-3.1-flash-live-preview`, which the old code used, is now legacy.
- **Starting:** browsers don't allow a page to play sound or use the microphone before the visitor interacts. Nexus connects on the visitor's first tap, click or key press anywhere on the page, then greets them in English and Hindi.
- **Page awareness:** every job, project and paper has a `data-ctx` id. When a visitor stays on one for about a second and nobody is talking, Nexus gets a short note about it and may add one sentence. It never interrupts the visitor.
- **Tools:** `show_on_page` lets visitors say "show me his research" and the page scrolls there. `end_conversation` hangs up when they say goodbye.
- **No mic?** If the microphone is blocked, the dock switches to a text box automatically.
- **Long visits:** session resumption and context-window compression keep calls alive past Gemini's usual session limit.

## Cost control

Each visitor who taps starts one Live session. To cap spending, set a budget alert in Google AI Studio. You can also lower the token's `expireTime` in `server/createToken.ts` to make sessions shorter.
