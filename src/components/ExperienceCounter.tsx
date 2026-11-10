import { useEffect, useRef, useState } from 'react';
import { jobs } from '../content';
import { experienceSplit, formatMonths } from '../experience';

/** computed at page load from the job dates, so full-time grows by itself every month; internships are fixed */
const TOTAL = experienceSplit(jobs).total;

/**
 * While the visitor scrolls the Work section, a small pop-up adds up his experience
 * as each role passes the middle of the screen. Counts real calendar months (no double counting).
 */
export default function ExperienceCounter() {
  const [show, setShow] = useState(false);
  const [target, setTarget] = useState(0);
  const [roles, setRoles] = useState(0);
  const [shown, setShown] = useState(0);
  const [split, setSplit] = useState({ fullTime: 0, internship: 0 });
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
      const passed = jobs.filter((j) => {
        const el = document.querySelector(`[data-ctx="${j.id}"]`);
        return el ? el.getBoundingClientRect().top < line : false;
      });
      const s = experienceSplit(passed);
      setRoles(passed.length);
      setTarget(s.total);
      setSplit({ fullTime: s.fullTime, internship: s.internship });
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
      <span className="xp-split">
        <span><i className="ft" aria-hidden="true" />Full-time <b>{split.fullTime ? formatMonths(split.fullTime) : '–'}</b></span>
        <span><i aria-hidden="true" />Internships <b>{split.internship ? formatMonths(split.internship) : '–'}</b></span>
      </span>
      <span className="xp-bar" aria-hidden="true"><i style={{ transform: `scaleX(${TOTAL ? shown / TOTAL : 0})` }} /></span>
    </div>
  );
}
