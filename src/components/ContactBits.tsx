import { useEffect, useState } from 'react';

/** Yoosha's local time (India), so a visitor knows when to expect a reply without us promising one. */
export function ContactTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  const time = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
  const h = Number(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false })) % 24;
  const night = h >= 23 || h < 7;
  return (
    <p className="contact-time reveal">
      <span className={`ct-dot${night ? ' night' : ''}`} aria-hidden="true" />
      It's {time} in India for Yoosha{night ? ', so expect a reply in the morning.' : '.'}
    </p>
  );
}

/** Copies the email address (handy on phones, where mailto opens an app people may not use). */
export function CopyEmail({ email }: { email: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(email); }
    catch {
      const t = Object.assign(document.createElement('textarea'), { value: email });
      document.body.append(t); t.select(); document.execCommand('copy'); t.remove();
    }
    setDone(true); setTimeout(() => setDone(false), 1800);
  };
  return (
    <button type="button" data-ask className={`copy-mail${done ? ' done' : ''}`} onClick={copy} aria-live="polite">
      {done ? (
        <><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7" /></svg>Copied</>
      ) : (
        <><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>Copy</>
      )}
    </button>
  );
}
