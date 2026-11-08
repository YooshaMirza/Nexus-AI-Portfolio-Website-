import { useEffect, useRef, useState } from 'react';
import { jobs } from '../content';
import { formatMonths, monthsOf } from '../experience';

/** months per role, computed once; overlapping roles share calendar months */
const ROLE_MONTHS = jobs.map((j) => ({ id: j.id, months: monthsOf(j.when) }));
const TOTAL = new Set(ROLE_MONTHS.flatMap((r) => r.months)).size;

/**
 * While the visitor scrolls the Work section, a small pop-up adds up his experience
 * as each role passes the middle of the screen. Counts real calendar months (no double counting).
 */
export default function ExperienceCounter() {
  const [show, setShow] = useState(false);
  const [target, setTarget] = useState(0);
  const [roles, setRoles] = useState(0);
  const [shown, setShown] = useState(0);
  const [bump, setBump] = useState(false);
  const prev = useRef(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const work = document.getElementById('work');
      if (!work) return;
      const r = work.getBoundingClientRect();
      const line = innerHeight * 0.55;
      setShow(r.top < innerHeight * 0.45 && r.bottom > innerHeight * 0.5);
      const passed = ROLE_MONTHS.filter((rm) => {
        const el = document.querySelector(`[data-ctx="${rm.id}"]`);
        return el ? el.getBoundingClientRect().top < line : false;
      });
      setRoles(passed.length);
      setTarget(new Set(passed.flatMap((p) => p.months)).size);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    update();
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);

  // count up (or down) one month at a time, with a little pop when a role adds months
  useEffect(() => {
    if (target > prev.current) { setBump(true); const t = setTimeout(() => setBump(false), 450); prev.current = target; return () => clearTimeout(t); }
    prev.current = target;
  }, [target]);
  useEffect(() => {
    if (shown === target) return;
    const t = setTimeout(() => setShown((s) => s + Math.sign(target - s)), 45);
    return () => clearTimeout(t);
  }, [shown, target]);

  return (
    <div className={`xp${show ? ' on' : ''}${bump ? ' bump' : ''}`} aria-live="polite" aria-hidden={!show}>
      <span className="xp-label">Experience so far</span>
      <b className="xp-value">{formatMonths(shown)}</b>
      <span className="xp-roles">{roles} of {jobs.length} roles</span>
      <span className="xp-bar" aria-hidden="true"><i style={{ transform: `scaleX(${TOTAL ? shown / TOTAL : 0})` }} /></span>
    </div>
  );
}
