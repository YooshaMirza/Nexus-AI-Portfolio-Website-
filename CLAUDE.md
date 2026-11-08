# Project context: Yoosha's portfolio + Nexus voice agent

Handoff from a claude.ai chat (7 Nov 2026) where this project was designed and built.
Read this first. The owner is **Mirza Yoosha Minhaj** (goes by Yoosha). He writes in a mix of
English and Hindi; reply in clear English unless he asks otherwise.

## Goal
A new personal portfolio (replacing https://yoosha-portfolio.netlify.app, old repo
`YooshaMirza/port-web-with-bot`) where **Nexus**, a live voice agent on **Gemini Live**,
talks to visitors and knows in real time what they are looking at as they scroll.
It must feel "wow" on both desktop and mobile (most visitors are on phones in India).
Hosting: **Netlify**. Voice: **Gemini Live, not Weya**.

## Decisions already made (don't relitigate without asking)
- Design direction **"A: live captions"** was chosen over two alternatives: light cool grey,
  cobalt accent, big Bricolage Grotesque captions that light up word by word as Nexus speaks.
  Tokens are at the top of `src/styles.css` (fog #E6EBEF, ink #0F1B26, cobalt #2443F2,
  slate #56677A, line #CBD4DB, teal #0C8F80 for the visitor's words). Body font: Onest.
- **Vertical scrolling only** (the old horizontal scroll was rejected).
- A **3D voice blob** (three.js shader) sits in the hero and flies into a bottom **dock** as
  the visitor scrolls. It reacts to Nexus's voice (cobalt) and the visitor's voice (teal tint).
- Nexus should start speaking as soon as the site opens. Browsers block audio and the mic
  until a user gesture, so it **starts on the first tap, click or key press anywhere**.
  Don't promise true autoplay.
- Greeting is bilingual: English plus "या फिर हिंदी में भी।"
- All content lives in **`src/content.ts`**. The page AND Nexus's knowledge are generated
  from it, so they can't disagree. Firebase and the admin portal from the old AI Studio
  build were deliberately removed.

## Facts about Yoosha used on the site
- Current: **AI Forward Deployed Engineer at Weya.ai, Sep 2026 – now** (voice agents).
- Previous: **AI Engineer at Neurabit Solutions, Nov 2025 – Sep 2026** (architected InstaBus,
  a production voice agent platform for intercity bus operators; STT/TTS, CV, MCP).
- Earlier: Sarvm.ai, DRISHTI CPS (IIT Indore), BIT Sindri, web internships. Freelancing since
  2021, YouTube since 2022. B.Tech CSE (AI & ML), Bennett University 2022–2026.
- Papers: IEEE Xplore Jan 2025 (skin disease CNN, 96.64%, 57 classes); Springer, in
  publication (brain tumour CNN, 97.1%).
- Data came from the old repo plus his resume. **Not yet confirmed by him:** the Weya role
  description wording, the "usually replies within a day" line in Contact, the CV link (old
  Google Drive file), and missing links for the Pokémon MCP server and MediSum.

## Architecture
| What | Where |
|---|---|
| Content (single source of truth) | `src/content.ts` |
| Nexus persona, rules, tools, model | `src/agent/liveConfig.ts` (`LIVE_MODEL = 'gemini-3.8-live'`, voice `Kore`) |
| Live session: connect, captions, tools, page-context policy | `src/agent/NexusAgent.ts` |
| Mic (AudioWorklet → 16 kHz PCM) and 24 kHz playback with levels | `src/agent/audio.ts` |
| Scripted stand-in for previews/recordings (`?demo`, `?demo&autostart`) | `src/agent/DemoAgent.ts` |
| 3D blob shader | `src/voice/VoiceBlob.ts` |
| Blob flight hero → dock, per-frame hooks | `src/components/Stage.tsx` |
| Live word-by-word caption | `src/components/Caption.tsx` |
| Bottom dock (caption, "Seeing …", mute, type, end) | `src/components/Dock.tsx` |
| Page, sections, scroll-context tracker, show_on_page handler | `src/App.tsx` |
| Ephemeral token minting (key stays server-side) | `server/createToken.ts` |
| Netlify function at `/api/nexus-token` | `netlify/functions/nexus-token.mts` |
| Same endpoint during `npm run dev` | Vite plugin in `vite.config.ts` |

Key behaviours:
- **Security:** the browser never sees `GEMINI_API_KEY`. It POSTs `/api/nexus-token` and gets a
  single-use ephemeral token (30 min, new session within 2 min) locked to the model + config.
  The token path uses `apiVersion: 'v1alpha'` (required by the SDK for ephemeral tokens).
  Origins are allow-listed (localhost, `*.netlify.app`, plus `ALLOWED_ORIGINS`).
- **Page awareness:** elements carry `data-ctx` ids (sections, jobs, projects, papers). The item
  under the line 42% down the viewport is "what the visitor sees". After ~1.3 s dwell, when
  neither side is talking, Nexus gets a `[page-context]` note via `sendClientContent` and may
  add one sentence. Gemini 3.8 Live has proactive audio, so it can choose to stay silent.
- **Tools:** `show_on_page(target)` scrolls and flashes an item; `end_conversation`.
- Session resumption and sliding-window context compression are enabled.
- The `@google/genai` SDK (v3) is lazy-loaded so the first view is light on mobile.
- Test build: `npm run build:test` makes one self-contained `dist-test/index.html` where the
  owner pastes a key on-device (`VITE_TEST_KEY_ENTRY=1`). Never ship that as production.

## Status (updated 8 Nov 2026)
- **Real Gemini Live path verified**: token minting, `gemini-3.8-live`, and a full browser session (auto-start, greeting, captions) all work.
- Voice: **Kore** (Yoosha picked it from samples in `voice-samples/`). `proactivity.proactiveAudio` is on. `enableAffectiveDialog` and `thinkingBudget` are REJECTED by this model; emotion and pacing come from the HOW TO SPEAK prompt.
- Nexus pre-connects a warm session while the visitor reads (`NexusAgent.warm`, closed after 90 s unused) and auto-starts with no tap where the browser allows sound.
- Local testing: `VITE_NEXUS_AUTOSTART=1` in `.env` (dev only) + `npm run dev:auto` (opens a Chrome profile in `.chrome-dev/` with autoplay and mic allowed).
- UI rebuilt within design A: boot sequence, "Ask Nexus" chips (`agent.ask`), stats, Expertise section (`pillars` in content.ts), timeline, bento project cards + filterable archive, Open source card (Sellbird PR #40), research rings, journey.
- **In-site resume viewer** (`src/components/Resume.tsx`): shows ONLY Yoosha's real Drive PDF in a framed box (he rejected a generated web version), plus Ask-Nexus chips. Opening it sends a `[page-event]` (`agent.event`) and Nexus comments once. Nexus can open it via `show_on_page('resume')`.
- Sections are full-width stacked bands (`.band-paper/fog/dark`) with numbered headings and a watermark title; Research and Contact are dark.
- Work: every role is separate (Sync, Octanet, Dabotics split). Neurabit has `stages`: intern Nov 2025 – Apr 2026, full-time May – Sep 2026 (from his PDF). Company names are pills.
- InstaBus and the Dental receptionist are COMPANY work: never show their code links (`company: true`). InstaBus `demo` URL is still empty, waiting for Yoosha.
- Tap detection: only a real tap starts Nexus (not scroll, swipe or scrollbar). `VITE_NEXUS_AUTOSTART=0` also disables the warm pre-connect in dev.
- **Professional pass (Yoosha said it looked cartoonish):** ONE accent colour (cobalt) for every area, no per-area hues, no watermark words, no orbit labels, 16px card radii, neutral chips. Keep it restrained.
- Hero idle headline: "AI engineer building production AI systems." (he does not want to be framed as only a voice-agent builder).
- Open source is its own section (#opensource, 04/07) with a GitHub-style card. 7 sections now.
- Neurabit uses a plain "role progression" table + one summary sentence (`progression` field). Don't use bars or nested timelines; he found them confusing.
- Resume viewer: pdf.js draws the real PDF from `/api/resume` (server/resume.ts proxies Drive), fitted to one screen, tap to zoom, no side panel.
- Opening the resume / tapping a question to START a call skips the standard greeting.
- Company logos (approved by Yoosha) live in `public/logos/`, referenced by `logo` on each job. Sync is now named Syinq.
- Upwork (`person.upwork`) is the hire-me channel; Fiverr is intentionally not shown.
- Hero: two tilted rings of TEXT skill tags orbit the blob in 3D (`OrbitTags.tsx`); he rejected number/metric chips there.
- Theme: light is the default; dark only when chosen (nav toggle with circular reveal, or Nexus `set_theme`).
- Nexus start policy: tap-anywhere only until the first call ends (sessionStorage `nexus-ended`); `VITE_NEXUS_AUTOSTART=0` = only Talk/Ask buttons start it.
- About: 3D portrait (`Portrait.tsx`, cut-out in `public/me/yoosha.webp`) made of SOLID layers only. He rejected depth-displacement because it warped his face; never warp the photo. Education = B.Tech CGPA 9.0 (his number; old PDF says 8.84), Class 12 92.6%, Class 10 93.6% (school names pending).
- Portrait is ONE rigid object tilting in CSS 3D (layers at translateZ depths). No light overlay on his face (he rejected it), no per-layer sliding.
- Work has an experience counter pop-up (`ExperienceCounter.tsx`, `src/experience.ts`) counting UNIQUE calendar months (overlaps not double-counted): 20 months total as of Nov 2026.
- Research cards: status badge, accuracy bar, class grid (57 dots) / class tiles (4). No rings there.
- Open source stars/forks are fetched live from the GitHub API (`useGitHubRepo`, 1 h cache). Lines-added/tests numbers were removed on purpose.
- **Text chat mode** (`src/components/Chat.tsx`, `server/chat.ts`, `/api/nexus-chat` as a Netlify function + Vite dev middleware): same knowledge and tools as voice (exported from liveConfig.ts), streamed NDJSON, Gemini text model with minimal thinking. Model chain 3.5 Flash → 3.7 Flash → 2.5 Flash → 3.1 Flash-Lite (3.8 Flash hung/503'd on 8 Nov 2026), 8 s per model to start, retries busy errors before any text is written. Gemini 3 tool calls must echo the model's original functionCall parts (thought signatures). Opening chat ends a voice call; the blob flies into the chat header (`#blob-chat`). Chat links `[label](item-id)` jump to page items.
- Weya role = "AI Forward Deployed Engineer" (exact title, his wording). IIT Indore = "Machine Learning Research Intern", BIT Sindri = "Deep Learning Research Intern" (exact). Tech + client-facing (requirements → builds voice agents end to end: prompts, flows, tool calls, validations, front end, back end, deployment).
- Section names are back as thin OUTLINED type at the top right of each band (he liked them; keep them subtle).
- Cursor-lit grid (`.lit` layer, desktop only, rAF-throttled) is the light/dark "wow". Theme switch = circular reveal.
- Portrait: option A, the whole card tilts; photo in NATURAL COLOUR fully inside a light card (no pop-out, no B&W). I cannot generate a new photo; a better source photo is the real fix.
- Phones get a one-time tip (`DesktopHint.tsx`) with "Switch to desktop view": sets sessionStorage `nexus-force-desktop`, and an inline script in index.html rewrites the viewport meta to width=1280 with initial-scale = screen/1280 (like "Request desktop site"). A "Mobile view" pill switches back. Headless Chrome can't show the zoom; verify on a real phone.
- Research = each paper is ONE clean journal sheet (`.sheet`, serif Source Serif 4 self-hosted via @fontsource): running header + Published/In press stamp, title, author, short abstract (abstract[0], figure highlighted), Index Terms, Fig. 1 (dots/tiles) + Table I. NO stacked/peeking pages behind it: he said they looked like "a lot of papers". Author list + baseline accuracies still pending from him.
- Neurabit = one promotion line (Intern → converted → AI Engineer). No tables/bars/timelines.
- "Agent console" (`devlog.ts`, `DevLog.tsx`, `ConsoleChip.tsx`): NO icon-only buttons (he said nobody understood `</>`). A live chip above the dock appears only while a call or chat is active and streams the latest event; also "Watch Nexus think" on the Nexus project card and a "view agent console" link in the chat footer. Plain labels: agent, speed, action, context, you, nexus.
- Voice and chat prompts ask for natural fillers (so, umm, you know, haan, achha), sparingly.
- 60-second tour (`src/tour.ts`, `Tour.tsx`): 9 stops, silent captions by default (~54 s); "Narrate with voice" or an active call makes Nexus narrate via `tourNote`, waiting for speech to end. Manual scroll pauses. Nexus tool `start_tour` (voice + chat). Button leads the hero Ask row.
- Usage limits (`server/limits.ts`, Netlify Blobs; memory in dev): per hashed IP per hour + daily caps for chat and voice (env NEXUS_*), 429 with a friendly message; voice calls end at 10 min.
- SEO (`seo.ts` Vite plugin from content.ts): canonical, OG/Twitter, JSON-LD Person, robots.txt, sitemap.xml; share image `public/og.png`. SITE_URL env.
- Languages: voice + chat answer in any Indian language the visitor uses.
- Hero: the "Ask Nexus" chips were removed; a "Take the 60-second tour" launcher replaced them. Tour modes Silent / With voice / In chat (chat mode posts each stop into the chat via `chatBus`). Voice agent → voice mode, chat agent → chat mode.
- Fast scrolling: scroll speed > 2 px/ms adds `.scroll-fast` (0.15 s reveals, no delays) and reveals everything near the view; reveals also start 12% before entering.
- Section titles are soft FILLED gradient lettering again (he disliked the thin outline).
- Jobs have `highlights` (2-4 bullets) from his detailed notes; Nexus knows them.
- GitHub strip (`server/github.ts`, `/api/github`, `GitHubPulse.tsx`): ONLY two big numbers, all-time contributions (incl. private, via `viewer` + his own GITHUB_TOKEN) and repositories (owned incl. private + contributed to). Hidden entirely without a token (public numbers are too small; he asked not to show small stats).
- LinkedIn is linkedin.com/in/the-mirza-yoosha (confirmed). Do NOT show Kaggle or LeetCode on the site.
- Page commentary was made less chatty (dwell 2.2 s, at most one note per ~10 s, prompt prefers silence).
- Still unconfirmed by Yoosha: "usually replies within a day" in Contact, the Dental receptionist description (inferred from repo file names), DocuSense labelled "Internship project, Endee" (from its README badge), whether the public `Instabus-` repo may be linked.
- Backup of the pre-redesign src is not in the repo; there is no git yet.

- Out-of-service fallback (`src/serviceText.ts`): usage caps AND Gemini quota errors show one calm shared message; the dock swaps "Talk again" for "Email Yoosha" and chat shows Email/WhatsApp instead of "Try again".
- 404 (`public/404.html`, Netlify only; Vite dev falls back to the SPA): common guesses redirect (/projects → /#projects, /cv → /?resume, /chat → /?chat, /hire → /#contact); otherwise a typed Nexus line + Home / Ask Nexus / Tour.
- Link shortcuts: `/?chat`, `/?tour`, `/?resume` open those on load (read once at module load, then cleaned from the URL).
- Favicon set: `public/favicon.svg` (cobalt orb) + PNGs (32, 180 apple-touch, 192, 512, maskable) + `site.webmanifest`. Regenerate PNGs from the SVG with headless Chrome if the SVG changes.

- Dark theme = "Midnight blueprint" in `src/night.css` (every rule scoped to `:root[data-theme="dark"]`, loaded after styles.css): ink-blue base, faint blueprint grid, glass cards with glowing edges, cobalt glow buttons. Light theme must not change at all: he said light is the best, don't change a single word there.
- Voice greeting now offers the 60-second tour ("Want the tour?") and calls start_tour on yes. Chat welcome mentions "tour".
- VITE_NEXUS_AUTOSTART is read only by the dev server; production always uses tap-anywhere. Netlify needs only GEMINI_API_KEY and GITHUB_TOKEN (plus SITE_URL / ALLOWED_ORIGINS for a custom domain).

- Chat = "live brief" (approved from a preview): answer words light up as they stream (`.msg.live .w`), visitor lines are teal "You asked", every page item Nexus links ([label](id)) or shows becomes an evidence card (`src/components/evidence.ts`, built from content.ts: logo, kind, meta, accuracy bar) that jumps to it, header shows the live phase (Thinking / Answering / Opening X), follow-up chips after the last answer. On phones Nexus's own show_on_page does NOT close the chat; only a tapped card/link jumps.
- Theme suggestion (`ThemeHint.tsx`): once per visit, 9 s in (22 s on phones, after the desktop tip), worded by local time (night 19:00-06:00) and current theme; never over chat/resume/tour; skipped if the visitor already switched theme.

- Tap-to-start fix (8 Nov 2026): Chrome only unlocks audio on the mouse PRESS (pointerdown), not on release/click, and waking the audio device can take 1-2 s. So App calls `agent.unlock()` on pointerdown, PcmPlayer.resume() reuses a pending resume, and start() waits up to 3 s for audio. Before this, tap-anywhere silently failed on the live site.
- Deploy: GitHub repo YooshaMirza/Nexus-AI-Portfolio-Website- (main) auto-deploys Netlify site `yoosha-portfolio` (id 96561dde-…, live at yoosha-portfolio.netlify.app; yoosha.tech domain expired). The folder is linked with the Netlify CLI. Env vars GEMINI_API_KEY + GITHUB_TOKEN are set as secrets in production. The "Built with Netlify" badge can't be removed on the free plan (site was created via Bolt); a fresh project imported from GitHub would not have it.

## Run
```bash
npm install
npm run dev        # http://localhost:5173  (?demo for the scripted version)
npm run build      # production build to dist/
```
`.env` holds `GEMINI_API_KEY` (git-ignored). On Netlify, set `GEMINI_API_KEY` (and
`ALLOWED_ORIGINS` for a custom domain) as environment variables.

## Security note
The Gemini key was pasted into the original chat. Yoosha was advised to rotate it after
testing and keep the new one only in `.env` / Netlify env vars. Never commit it or put it in
client code.

## Next step
Yoosha will test locally and send a list of changes. Make them in this codebase, keeping the
design decisions above unless he says otherwise.

## Update 8 Nov 2026 (evening)
- **Entry screen** (`Entry.tsx`): "Enter website" welcome once per tab (sessionStorage `nexus-entered`); its tap is the browser gesture for sound, so Nexus greets at once. "Enter without voice" = Nexus stays off (tap-anywhere disabled). ONLY a click gets you in: scrolling and Esc do nothing (he wants every visitor to meet Nexus first). Skipped for /?chat /?tour /?resume and ?demo; `?entry` forces it. The real blob sits in `#blob-entry` while open (Stage), highlights from content.ts orbit it, Nexus's silent caption line lights up, the blob ripples when the cursor is on the button (`entry-hot`).
- **Blob follows the mouse everywhere** (Stage → `VoiceBlob.look`): turns toward the cursor, leans a little, ripples when the cursor comes close. Desktop only.
- **Experience** is computed at runtime from job dates ("Sep 2026 – now"), so it grows by itself every month (page, tour, Nexus voice + chat). Never hardcode it.
- **Visitor counter** (`server/visits.ts`, `/api/visits`, `VisitCount.tsx` in the footer): unique browsers since launch day 2026-11-08 (VISITS_SINCE), deduped per hashed IP per day, Netlify Blobs store `nexus-visits`. Hidden in production until 100 (he doesn't want small numbers shown).
- **Contact**: "usually replies within a day" REMOVED (never confirmed); replaced by his local India time (amber "reply in the morning" 23:00–07:00). Copy-email button. One main action "Email Yoosha", WhatsApp + Upwork secondary, "Ask Nexus" as a small line. Availability line pending his exact wording.
- **Tour runs by itself like a demo**: NO Next button. Manual page scroll only holds it; it carries on ~3 s after scrolling stops (scrolling inside the tour card/chat/dock is ignored). Voice waits for Nexus to start AND finish each line (visitor talking only delays). Chat types each stop word by word with an evidence card.
- **Netlify badge** (iframe `#nl-badge-frame`, 197x64 bottom-right) is added to EVERY free-plan project, not just Bolt ones: tested 8 Nov 2026 by creating a fresh project (badge on, API refuses to disable it), then deleted it and restored the original project. Only a paid Netlify plan removes it. Never hide it with code. Instead App detects it (`nl-badge` class + `--nlb`) and CSS lifts the dock and chat above it where they'd collide.
- **Tour v2** (`src/tour.ts`, 10 stops, his order): intro (full range, NOT only voice) → expertise → Weya → Neurabit → earlier roles in one line (Sarvm, IIT Indore, BIT Sindri, smaller internships) → projects section ("some of his projects", live demos + code) → open source ("one of his contributions", never "his only") → paper 1 (published) → paper 2 (in press) → hire him (Upwork / email / WhatsApp). Each stop has `line` (English, tour card) and `say` (Hinglish, spoken by Nexus). The item being discussed gets a cobalt box (`.tour-focus`) for the whole stop.
- **Nexus speaks Hinglish by default** (English only if the visitor needs it), natural fillers, gender-neutral Hindi about itself (Kore is a female voice). Greeting is Hinglish.
- **Pronunciation** (liveConfig PRONUNCIATION): Yoosha = यूशा "YOO-shaa"; Neurabit = न्यूराबिट "NYOO-ruh-bit"; Sarvm.ai = "Sarvam dot A I".
- **Who he is**: always present him as a full-stack AI engineer (LLMs, RAG, MCP/agents, CV, DL/ML, voice, front end + back end). He was unhappy being framed as only a voice-agent engineer.
