import { useCallback, useEffect, useRef, useState } from 'react';
import { person } from '../content';

const driveId = person.cv.match(/\/d\/([^/]+)/)?.[1] ?? '';
export const cvDownload = `https://drive.google.com/uc?export=download&id=${driveId}`;
/** Same PDF, served through our own origin so pdf.js can draw it (see server/resume.ts). */
const PDF_URL = '/api/resume';


type Doc = import('pdfjs-dist').PDFDocumentProxy;
type LinkBox = { href: string; left: number; top: number; width: number; height: number };

let docP: Promise<Doc> | undefined;
/** pdf.js is loaded only when the resume is first opened. */
export function loadDoc() {
  docP ??= (async () => {
    // the LEGACY build: the modern one needs very new browsers, and many phones fell back to "Open on Google Drive"
    const [pdfjs, worker] = await Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')]);
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs.getDocument({ url: PDF_URL }).promise;
  })();
  docP.catch(() => { docP = undefined; });
  return docP;
}

/** In-site resume viewer: Yoosha's real resume, drawn so the whole page fits on screen. Tap the page to zoom. */
export default function Resume({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [doc, setDoc] = useState<Doc>();
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(false);
  const [links, setLinks] = useState<LinkBox[]>([]);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const task = useRef<import('pdfjs-dist').RenderTask | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus({ preventScroll: true });
    if (!doc) loadDoc().then(setDoc, (e) => { console.error('[resume] could not load PDF', e); setFailed(true); });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open, onClose, doc]);

  // Draw the page: "fit page" shows the whole page with no scrolling; zoom fits the width.
  const draw = useCallback(async () => {
    const box = stage.current, cv = canvas.current;
    if (!doc || !box || !cv || !open) return;
    // resizes fire draw() repeatedly: only the newest call may paint, and pdf.js can't share a canvas between two renders
    const my = ++seq.current;
    if (task.current) { task.current.cancel(); await task.current.promise.catch(() => {}); task.current = null; }
    const pg = await doc.getPage(page);
    if (my !== seq.current) return;
    const base = pg.getViewport({ scale: 1 });
    const cs = getComputedStyle(box);
    const w = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const fitPage = Math.min(w / base.width, h / base.height);
    const scale = zoom ? Math.max(fitPage * 1.6, w / base.width) : fitPage;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const vp = pg.getViewport({ scale });
    cv.width = Math.floor(vp.width * dpr);
    cv.height = Math.floor(vp.height * dpr);
    cv.style.width = `${Math.floor(vp.width)}px`;
    cv.style.height = `${Math.floor(vp.height)}px`;
    const t = pg.render({ canvas: cv, viewport: pg.getViewport({ scale: scale * dpr }) });
    task.current = t;
    try { await t.promise; } catch { return; } // cancelled by a newer draw
    if (task.current === t) task.current = null;
    // keep the resume's own links (LinkedIn, GitHub, project links) clickable
    const ann = await pg.getAnnotations();
    if (my !== seq.current) return;
    setLinks(ann.filter((a) => a.subtype === 'Link' && a.url).map((a) => {
      const [x1, y1] = vp.convertToViewportPoint(a.rect[0], a.rect[1]);
      const [x2, y2] = vp.convertToViewportPoint(a.rect[2], a.rect[3]);
      return { href: a.url, left: Math.min(x1, x2), top: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
    }));
  }, [doc, page, zoom, open]);

  useEffect(() => {
    if (!open) return;
    draw();
    const ro = new ResizeObserver(() => draw());
    if (stage.current) ro.observe(stage.current);
    return () => ro.disconnect();
  }, [draw, open]);

  useEffect(() => { if (!open) setZoom(false); }, [open]);
  const pages = doc?.numPages ?? 1;

  return (
    <div className={`resume${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Resume" aria-hidden={!open} inert={!open}>
      <div className="resume-scrim" onClick={onClose} />
      <div className="resume-panel">
        <header className="resume-bar">
          <div className="resume-title">
            <span className="resume-file" aria-hidden="true">PDF</span>
            <div><strong>Resume</strong><span>{person.name}</span></div>
          </div>
          <div className="resume-actions">
            <button className="btn small ghost zoom-btn" onClick={() => setZoom((z) => !z)} aria-pressed={zoom}>{zoom ? 'Fit page' : 'Zoom in'}</button>
            <a className="btn small" href={cvDownload} target="_blank" rel="noreferrer">Download</a>
            <button ref={closeBtn} className="resume-close" onClick={onClose} aria-label="Close resume">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </header>

        <div className="resume-body">
          <div ref={stage} className={`resume-stage${zoom ? ' zoomed' : ''}`}>
            {!doc && !failed && <div className="resume-loading"><span className="spinner" aria-hidden="true" />Loading resume…</div>}
            {failed && (
              <div className="resume-loading">
                Couldn't load the resume here.
                <a className="btn small" href={person.cv} target="_blank" rel="noreferrer">Open it on Google Drive</a>
              </div>
            )}
            <div className={`resume-paper${doc ? ' ready' : ''}`} onClick={(e) => { if (!(e.target as HTMLElement).closest('a')) setZoom((z) => !z); }} title={zoom ? 'Tap to fit the page' : 'Tap to zoom in'}>
              <canvas ref={canvas} role="img" aria-label={`${person.name}'s resume, page ${page} of ${pages}`} />
              {links.map((l, i) => <a key={i} className="pdf-link" href={l.href} target="_blank" rel="noreferrer" style={{ left: l.left, top: l.top, width: l.width, height: l.height }} aria-label={l.href} />)}
            </div>
            {pages > 1 && (
              <div className="resume-pages">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page">‹</button>
                <span>{page} / {pages}</span>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} aria-label="Next page">›</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
