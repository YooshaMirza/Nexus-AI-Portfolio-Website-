/**
 * tour.ts — the 60-second guided tour: 9 stops, each a page item + one line.
 * Numbers come from content.ts so the tour can never disagree with the page.
 */
import { about, jobs, openSource, papers, person } from './content';
import { formatMonths, monthsOf } from './experience';

export type TourStop = { target: string; label: string; line: string };

const months = new Set(jobs.flatMap((j) => monthsOf(j.when))).size;
const btech = about.education.find((e) => e.id === 'edu-btech');

export const TOUR: TourStop[] = [
  { target: 'intro', label: 'Meet Yoosha', line: `This is ${person.short}, an AI forward deployed engineer at Weya.ai. Here's the one-minute version.` },
  { target: 'pillar-voice', label: 'Core skill', line: 'His core skill: voice agents that take real phone calls, from telephony and speech models to prompts and tool calling.' },
  { target: 'job-weya', label: 'Now at Weya.ai', line: 'At Weya he owns client agents end to end: requirements, flows, prompts and tool calls, plus the front end, back end and deployment.' },
  { target: 'job-neurabit', label: 'Neurabit Solutions', line: 'Before that he architected InstaBus at Neurabit, joining as an intern and converting to full-time.' },
  { target: 'proj-instabus', label: 'InstaBus', line: 'InstaBus is a production voice platform: phone agents that book and reschedule intercity bus trips.' },
  { target: openSource[0].id, label: 'Open source', line: `He contributes to open source too, with a merged pull request in ${openSource[0].repo}, an AI outreach agent with thousands of GitHub stars.` },
  { target: 'research', label: 'Research', line: `Two medical-imaging papers: ${papers[0].figure} accuracy on ${papers[0].classes} skin conditions in IEEE Xplore, and ${papers[1].figure} on brain MRI.` },
  { target: 'about', label: 'Background', line: `He studied AI and ML at Bennett University${btech ? ` with a ${btech.score} CGPA` : ''}, has ${formatMonths(months)} of roles, and has freelanced since 2021.` },
  { target: 'contact', label: 'Work with him', line: 'That\'s the tour. Hire him on Upwork, or reach him by email or WhatsApp right here.' },
];
