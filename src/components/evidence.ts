/**
 * evidence.ts — turns a page item id (the ids Nexus links in chat, e.g. proj-instabus)
 * into a small card: kind, title, one meta line, optional logo / accuracy.
 * Built from content.ts, so a card can never disagree with the page.
 */
import { areaLabels, jobs, openSource, papers, projects, sections } from '../content';

export type Evidence = {
  id: string;
  kind: string;          // "Role · Now", "Project · Company work", "Paper · Published"…
  title: string;
  meta: string;
  logo?: string;         // company logo
  badge?: string;        // short text in the icon square when there is no logo
  pct?: number;          // accuracy bar (papers)
  href?: string;         // external "Read" link (papers)
  follow: string[];      // good next questions about this item
};

const all = new Map<string, Evidence>();

for (const j of jobs) all.set(j.id, {
  id: j.id, kind: `Role · ${j.current ? 'Now' : j.type}`, title: `${j.role}, ${j.org.replace(/\s*\(.*\)$/, '')}`, meta: j.when, logo: j.logo,
  follow: [`What did he do at ${j.org.replace(/\s*\(.*\)$/, '')}?`],
});
for (const p of projects) all.set(p.id, {
  id: p.id, kind: `Project · ${p.company ? 'Company work' : areaLabels[p.area]}`, title: p.title, meta: [p.metric ? `${p.metric.value} ${p.metric.label ?? ''}`.trim() : '', p.stack.slice(0, 3).join(' · ')].filter(Boolean).join(' · '),
  badge: p.title.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase(),
  follow: [`How did he build ${p.title}?`],
});
for (const p of papers) all.set(p.id, {
  id: p.id, kind: `Paper · ${p.status}`, title: p.title.charAt(0).toUpperCase() + p.title.slice(1), meta: `${p.figure} ${p.figureLabel}`,
  badge: p.venue.startsWith('IEEE') ? 'IEEE' : 'SPR', pct: parseFloat(p.figure), href: p.href,
  follow: ['Which models did he beat?'],
});
for (const o of openSource) all.set(o.id, {
  id: o.id, kind: `Open source · ${o.merged}`, title: `${o.repo}: ${o.title}`, meta: o.pr, badge: 'PR',
  follow: ['What did his pull request add?'],
});
all.set('resume', { id: 'resume', kind: 'Resume', title: 'Yoosha\'s resume (PDF)', meta: 'Opens in the page viewer', badge: 'CV', follow: [] });

export const evidenceFor = (id: string) => all.get(id);

/** a readable name for any id, for the status line ("Opening Research…") */
export const labelFor = (id: string) => all.get(id)?.title ?? sections.find((s) => s.id === id)?.label ?? id;

/** item ids linked in a reply, in order, without duplicates: [label](id) */
export function linkedIds(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\]\(([a-z][a-z0-9-]*)\)/g)) if (all.has(m[1]) && !out.includes(m[1])) out.push(m[1]);
  return out;
}
