import { useEffect, useState } from 'react';
import type { GitHubStats } from '../../server/github';
import { CountUp } from './Bits';

const GH_ICON = <svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.22 1.88.87 2.34.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" /></svg>;

/**
 * GitHub, in two numbers: total contributions (all time, incl. private work) and total repositories.
 * Live from /api/github; the whole card stays hidden until the server has a GITHUB_TOKEN.
 */
export default function GitHubPulse() {
  const [g, setG] = useState<GitHubStats | null>(null);
  useEffect(() => { fetch('/api/github').then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && j.contributions) setG(j); }).catch(() => {}); }, []);
  if (!g) return null;
  return (
    <a className="gh-hero reveal in" href={g.url} target="_blank" rel="noreferrer" aria-label={`GitHub: ${g.contributions} contributions and ${g.repos} repositories. Open profile`}>
      <span className="gh-mark">{GH_ICON}</span>
      <span className="gh-num"><b><CountUp value={g.contributions.toLocaleString('en-IN')} /></b><small>contributions on GitHub<em>all time, incl. private client work</em></small></span>
      <span className="gh-sep" aria-hidden="true" />
      <span className="gh-num"><b><CountUp value={String(g.repos)} /></b><small>repositories<em>built and contributed to</em></small></span>
      <span className="gh-go"><span className="live-dot" aria-hidden="true" />live · @{g.login} ↗</span>
    </a>
  );
}
