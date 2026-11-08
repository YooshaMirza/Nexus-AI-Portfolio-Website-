/**
 * resume.ts — serves Yoosha's resume PDF from Google Drive through our own origin,
 * so the page can draw it with pdf.js (browsers can't fetch Drive files cross-origin).
 * Drive stays the source of truth: replace the file there and the site updates.
 */
import { person } from '../src/content';

const id = person.cv.match(/\/d\/([^/]+)/)?.[1] ?? '';
let cache: { at: number; bytes: ArrayBuffer } | undefined;

export async function fetchResume(): Promise<ArrayBuffer> {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.bytes;
  const r = await fetch(`https://drive.google.com/uc?export=download&id=${id}`, { redirect: 'follow' });
  if (!r.ok) throw new Error(`Drive returned ${r.status}`);
  const bytes = await r.arrayBuffer();
  const head = new TextDecoder().decode(bytes.slice(0, 5));
  if (head !== '%PDF-') throw new Error('Drive did not return a PDF (is the file shared as "Anyone with the link"?)');
  cache = { at: Date.now(), bytes };
  return bytes;
}
