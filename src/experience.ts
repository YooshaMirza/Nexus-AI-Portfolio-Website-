/**
 * experience.ts — turns the human date ranges in content.ts ("Nov 2025 – Sep 2026",
 * "Jun – Aug 2024", "Dec 2024", "Sep 2026 – now") into calendar months, so the page can
 * count experience honestly: overlapping roles share months instead of being added twice.
 */
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** month index since year 0, e.g. Jan 2025 → 2025*12 + 0 */
const idx = (m: string, y: number) => y * 12 + MONTHS.indexOf(m.slice(0, 3).toLowerCase());

export function monthsOf(when: string, now = new Date()): number[] {
  const parts = when.split(/\s*[–-]\s*/).map((p) => p.trim());
  const nowIdx = now.getFullYear() * 12 + now.getMonth();
  const parse = (p: string, fallbackYear?: number) => {
    if (/now|present/i.test(p)) return nowIdx;
    const [m, y] = p.split(/\s+/);
    return idx(m, y ? Number(y) : (fallbackYear as number));
  };
  const endYear = Number((parts[1] ?? parts[0]).match(/\d{4}/)?.[0] ?? now.getFullYear());
  const start = parse(parts[0], endYear);
  const end = parts[1] ? parse(parts[1], endYear) : start;
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

/** "1 yr 8 mos", "11 months" */
export function formatMonths(n: number): string {
  const y = Math.floor(n / 12), m = n % 12;
  if (!y) return `${m} month${m === 1 ? '' : 's'}`;
  return `${y} yr${y > 1 ? 's' : ''}${m ? ` ${m} mo${m > 1 ? 's' : ''}` : ''}`;
}

type Role = { id: string; when: string; type: string; stages?: { when: string; type: string }[] };
export type Split = { fullTime: number[]; internship: number[] };

/**
 * Calendar months of one role, by kind. A role that became full-time (type "Intern → Full-time", i.e. Neurabit)
 * counts as full-time for its whole span: Yoosha's call (11 Nov 2026).
 */
export function roleSplit(j: Role, now = new Date()): Split {
  const months = monthsOf(j.when, now);
  return /full-time/i.test(j.type) ? { fullTime: months, internship: [] } : { fullTime: [], internship: months };
}

/**
 * Full-time months (unique, grows by itself every month: "Sep 2026 – now") and internship months (each internship
 * counted in full, parallel ones included; fixed).
 */
export function experienceSplit(roles: Role[], now = new Date()) {
  const ft = new Set<number>();
  let internship = 0;
  // full-time: unique calendar months. Internships: each one's months are added up, so two internships done
  // in parallel both count (Yoosha's call, 11 Nov 2026). The page says "some in parallel" next to it.
  for (const j of roles) { const s = roleSplit(j, now); s.fullTime.forEach((m) => ft.add(m)); internship += s.internship.length; }
  return { fullTime: ft.size, internship, total: ft.size + internship };
}
