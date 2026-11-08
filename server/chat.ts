/**
 * chat.ts — Nexus in TEXT mode. Streams a Gemini reply as NDJSON lines:
 *   {"t":"text","d":"..."}            a chunk of the answer
 *   {"t":"tool","name":"show_on_page","args":{...}}   something the page should do
 *   {"t":"done"} | {"t":"error","d":"..."}
 * Same knowledge and tools as voice Nexus (liveConfig.ts), so the two can never disagree.
 * The API key stays on the server.
 */
import { SERVICE_MESSAGE, isQuotaError } from '../src/serviceText';
import { GoogleGenAI, type Content, type FunctionDeclaration } from '@google/genai';
import { knowledge, tools } from '../src/agent/liveConfig';
import { person } from '../src/content';

// 3.5 Flash answered reliably in testing (8 Nov 2026) while 3.8 Flash was overloaded; override with GEMINI_CHAT_MODEL
export const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-3.5-flash';
/** if the main model is busy (503/429), try these in order before giving up */
const FALLBACKS = [CHAT_MODEL, 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'].filter((m, i, a) => a.indexOf(m) === i);
/** a model that hasn't started answering by now is treated as busy */
const FIRST_CHUNK_MS = 8_000;
const busy = (e: unknown) => /(503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand)/i.test(String((e as Error)?.message ?? e));

const CHAT_INSTRUCTION = `You are Nexus, the assistant on ${person.name}'s portfolio website, in TEXT CHAT mode (the visitor chose to type instead of talk). You answer on his behalf for recruiters, founders, engineers and clients.

IDENTITY
- You are not Yoosha. Refer to him in the third person (Yoosha, he, his).
- You are one of the things he built: the voice agent on this site, here in text mode. Visitors can switch to a live voice call any time with the Talk button.

HOW TO WRITE
- Friendly, sharp and human, like a capable colleague texting back. No corporate phrasing, no "As an AI", no "Great question!".
- Sound like a person typing, not a brochure: contractions, short sentences, and now and then a natural chat opener or filler such as "So,", "Honestly,", "Oh nice,", "Hmm,", "Haan," or "Achha," (at most one per reply, and not every reply).
- Keep it short: usually 1 to 4 sentences. Use a short bullet list only when listing several things. You may use **bold** for a key number or name. No headings, no tables.
- Links: to point at something on this page, write [label](item-id) using an id from KNOWLEDGE (e.g. [InstaBus](proj-instabus), [his research](research)); the visitor can click it to jump there. External links only if they appear in KNOWLEDGE.
- Reply in the visitor's language and script, matching how they write: English, Hindi (Devanagari), Hinglish (Latin script), or any other language such as Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi or Urdu. Keep names, numbers and tech terms as they are.
- Only state facts from KNOWLEDGE. If something isn't there, say you're not sure and suggest emailing Yoosha.
- When it helps, end with one short follow-up question or a next step, but not every time.

PAGE
- Each visitor message starts with a [page: ...] note saying what they are looking at on the site. Use it to understand "this" or "here", but never mention the note.
- show_on_page: when they ask to see something ("show me his research", "open his CV", "where is InstaBus?"), call it with the matching id, and also answer in text. Use target "resume" to open the resume viewer.
- set_theme: if they ask for dark or light mode, call it and confirm briefly.
- start_tour: if they ask for a quick tour, an overview or the short version, call it and reply with one short line.

GOAL
- Help them understand what Yoosha is great at and make it easy to reach him: Upwork for freelance or contract work, email or WhatsApp for hiring (all in the Contact section).

KNOWLEDGE
${knowledge()}`;

/** chat-safe copies of the voice tools (no Live-only fields, no end_conversation) */
const chatTools: FunctionDeclaration[] = tools
  .filter((t) => t.name !== 'end_conversation')
  .map(({ behavior: _b, ...t }) => t);

export type ChatMessage = { role: 'user' | 'model'; text: string };

export function validate(body: unknown): { messages: ChatMessage[]; page: string } {
  const b = body as { messages?: ChatMessage[]; page?: string };
  if (!Array.isArray(b?.messages) || !b.messages.length) throw new Error('No messages');
  const messages = b.messages.slice(-20).map((m) => ({
    role: m.role === 'model' ? 'model' : 'user',
    text: String(m.text ?? '').slice(0, 2000),
  })) as ChatMessage[];
  if (messages[messages.length - 1].role !== 'user') throw new Error('Last message must be from the visitor');
  return { messages, page: String(b.page ?? 'Intro').slice(0, 200) };
}

export function streamChat(messages: ChatMessage[], page: string): ReadableStream<Uint8Array> {
  const apiKey = process.env.GEMINI_API_KEY;
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(ctrl) {
      const send = (o: unknown) => ctrl.enqueue(enc.encode(JSON.stringify(o) + '\n'));
      try {
        if (!apiKey) throw new Error('GEMINI_API_KEY is not set on the server.');
        const ai = new GoogleGenAI({ apiKey });
        const contents: Content[] = messages.map((m, i) => ({
          role: m.role,
          parts: [{ text: m.role === 'user' && i === messages.length - 1 ? `[page: ${page}] ${m.text}` : m.text }],
        }));
        // up to 2 rounds: if the model only calls a tool, tell it "done" and let it write the reply
        const sentTools = new Set<string>();          // don't repeat a page action if a retry repeats the call
        const withTimeout = <T,>(p: Promise<T>) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('503 timed out waiting for the model')), FIRST_CHUNK_MS))]);
        // up to 2 rounds: if the model only calls a tool, tell it "done" and let it write the reply
        for (let round = 0; round < 2; round++) {
          let wrote = false;
          let calls: { name: string; args: unknown; id?: string }[] = [];
          // keep the model's own function-call parts: Gemini 3 needs their thought signatures echoed back
          let callParts: import('@google/genai').Part[] = [];
          let done = false, lastErr: unknown;
          // try each model; a busy error before any text was written moves on to the next one
          for (const model of FALLBACKS) {
            calls = []; callParts = [];
            try {
              const stream = await withTimeout(ai.models.generateContentStream({
                model,
                contents,
                // minimal thinking: a chat reply needs speed (about 2 s instead of 5 s in testing)
                config: { systemInstruction: CHAT_INSTRUCTION, tools: [{ functionDeclarations: chatTools }], temperature: 0.7, maxOutputTokens: 700, ...(model.startsWith('gemini-2') ? {} : { thinkingConfig: { thinkingLevel: 'minimal' as import('@google/genai').ThinkingLevel } }) },
              }));
              const it = stream[Symbol.asyncIterator]();
              for (let first = true; ; first = false) {
                const r = first ? await withTimeout(it.next()) : await it.next();
                if (first) send({ t: 'meta', model });
                if (r.done) break;
                const chunk = r.value;
                const parts = chunk.candidates?.[0]?.content?.parts ?? [];
                const text = parts.filter((p) => p.text && !p.thought).map((p) => p.text).join('');
                if (text) { wrote = true; send({ t: 'text', d: text }); }
                for (const p of parts) if (p.functionCall) callParts.push(p);
                for (const fc of chunk.functionCalls ?? []) {
                  calls.push({ name: fc.name ?? '', args: fc.args ?? {}, id: fc.id });
                  const key = `${fc.name}:${JSON.stringify(fc.args ?? {})}`;
                  if (!sentTools.has(key)) { sentTools.add(key); send({ t: 'tool', name: fc.name, args: fc.args ?? {} }); }
                }
              }
              done = true;
              break;
            } catch (e) {
              lastErr = e;
              if (wrote || !busy(e)) throw e;
              console.warn(`[nexus-chat] ${model} busy, trying the next model`);
            }
          }
          if (!done) throw lastErr;
          if (wrote || !calls.length) break;
          contents.push({ role: 'model', parts: callParts });
          contents.push({ role: 'user', parts: calls.map((c) => ({ functionResponse: { name: c.name, id: c.id, response: { result: 'done' } } })) });
        }
        send({ t: 'done' });
      } catch (e) {
        console.error('[nexus-chat]', (e as Error).message);
        send({ t: 'error', d: isQuotaError(e) ? SERVICE_MESSAGE.quota : 'Nexus could not answer just now. Please try again in a moment.' });
      }
      ctrl.close();
    },
  });
}
