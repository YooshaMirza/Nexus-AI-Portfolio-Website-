import { useEffect, useState } from 'react';

const KEY = 'nexus-desktop-hint';
/** set when a phone visitor chose the desktop layout; read by the inline script in index.html */
export const FORCE_KEY = 'nexus-force-desktop';

const isPhone = () => matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
const forced = () => { try { return sessionStorage.getItem(FORCE_KEY) === '1'; } catch { return false; } };

/**
 * Phones only. A one-time tip that the site is best on a laptop, with a button that switches
 * this phone to the desktop layout (the page is laid out at 1280 px and scaled to fit, like
 * "Request desktop site"). While in desktop view, a small pill switches back to the mobile view.
 */
export default function DesktopHint() {
  const [show, setShow] = useState(false);
  const inDesktop = forced() && isPhone();

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(KEY) === '1'; } catch { /* private mode */ }
    if (!isPhone() || seen || forced()) return;
    const t1 = setTimeout(() => setShow(true), 5000);
    const t2 = setTimeout(() => close(), 17000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const close = () => { setShow(false); try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ } };
  const switchTo = (desktop: boolean) => {
    try {
      if (desktop) sessionStorage.setItem(FORCE_KEY, '1'); else sessionStorage.removeItem(FORCE_KEY);
      sessionStorage.setItem(KEY, '1');
    } catch { /* ignore */ }
    location.reload();
  };

  if (inDesktop) {
    return (
      <button type="button" data-ask className="mobile-pill" onClick={() => switchTo(false)}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></svg>
        Mobile view
      </button>
    );
  }

  return (
    <div className={`hint${show ? ' on' : ''}`} role="status" aria-hidden={!show}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M2 20h20" /></svg>
      <p><b>Even better on a bigger screen</b><span>See the full desktop layout right here, or keep the phone view. You can switch back any time.</span></p>
      <div className="hint-ctl">
        <button type="button" data-ask className="hint-go" onClick={() => switchTo(true)}>Switch to desktop view</button>
        <button type="button" data-ask onClick={close}>Keep mobile</button>
      </div>
    </div>
  );
}
