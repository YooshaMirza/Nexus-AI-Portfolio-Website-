import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { coursework, courseworkMore, courseworkTotal, type Course } from '../content';

const month = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

/**
 * Coursework (About): the 7 Coursera courses closest to his work, grouped by area. Each tile shows the real
 * certificate (thumbnail from public/certs), its date and a Verify link to Coursera; tapping the thumbnail opens
 * the full certificate. Called "Coursework", not "Certifications": they are single-course certificates.
 */
export default function Coursework() {
  const [open, setOpen] = useState<Course | null>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <article className="ab-card ab-course reveal" data-ctx="about-coursework" data-label="Coursework" data-detail={`${courseworkTotal} Coursera courses; the ${coursework.reduce((n, g) => n + g.courses.length, 0)} closest to his work are shown`}>
      <div className="cw-head">
        <p className="ab-label">Coursework</p>
        <p className="cw-sub"><b>{courseworkTotal} courses</b> completed on Coursera · the {coursework.reduce((n, g) => n + g.courses.length, 0)} closest to his work</p>
      </div>
      {coursework.map((g) => (
        <div key={g.area} className="cw-group">
          <h4>{g.area} <span>{g.issuer}</span></h4>
          <ul className="cw-list">
            {g.courses.map((c) => (
              <li key={c.id} className="cw">
                <button type="button" data-ask className="cw-thumb" onClick={() => setOpen(c)} aria-label={`View certificate: ${c.title}`}>
                  <img src={`/certs/${c.id}-thumb.webp`} alt="" width={96} height={74} loading="lazy" />
                </button>
                <div className="cw-body">
                  <p className="cw-issuer">{c.issuer}</p>
                  <p className="cw-title">{c.title}</p>
                  <p className="cw-meta">{month(c.date)} <a href={`https://coursera.org/verify/${c.verify}`} target="_blank" rel="noreferrer">Verify ↗</a></p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="cw-more"><b>+{courseworkTotal - coursework.reduce((n, g) => n + g.courses.length, 0)} more</b> in other areas: {courseworkMore}.</p>

      {/* rendered on <body>: inside the section it would sit under the sticky nav and the dock */}
      {createPortal(<div className={`cw-lb${open ? ' on' : ''}`} role="dialog" aria-modal="true" aria-label="Certificate" aria-hidden={!open} onClick={(e) => { if (!(e.target as Element).closest('a')) setOpen(null); }}>
        {open && (
          <figure>
            <img src={`/certs/${open.id}.webp`} alt={`Certificate: ${open.title}, ${open.issuer}, ${month(open.date)}`} />
            <figcaption><b>{open.title}</b><a href={`https://coursera.org/verify/${open.verify}`} target="_blank" rel="noreferrer">Verify on Coursera ↗</a></figcaption>
          </figure>
        )}
      </div>, document.body)}
    </article>
  );
}
