/**
 * tour.ts — the guided tour, in the order Yoosha asked for (8 Nov 2026):
 * who he is (full-stack AI, not only voice) → what he does → top 2 roles → the earlier roles in one line
 * → "here are some projects" (live demos + code) → open source (one of several) → paper 1 → paper 2 → hire him.
 * `line` is shown in the tour card (English). `say` is what Nexus speaks in a voice tour (Hinglish).
 * Numbers come from content.ts so the tour can never disagree with the page.
 */
import { openSource, papers, person } from './content';

export type TourStop = { target: string; label: string; line: string; say: string };

const [p1, p2] = papers;
const oss = openSource[0];

export const TOUR: TourStop[] = [
  {
    target: 'intro', label: 'Meet Yoosha',
    line: `This is ${person.short}, an AI forward deployed engineer at Weya.ai. He builds complete AI products: LLMs and RAG, MCP and agents, computer vision, voice agents, and the front end and back end around them.`,
    say: `So, yeh hai ${person.short}, AI forward deployed engineer at Weya.ai. Aur woh sirf voice agents nahi banata: LLMs, RAG, MCP, computer vision, plus front end aur back end, poora product end to end.`,
  },
  {
    target: 'expertise', label: 'What he does',
    line: 'His range: LLM apps and RAG, agentic AI with MCP, computer vision, deep learning and ML, voice agents, and the full-stack work to ship them.',
    say: 'Yahan dekho, his range: LLM apps aur RAG, agentic AI with MCP, computer vision, deep learning, ML, aur voice agents. Matlab, idea se production tak.',
  },
  {
    target: 'job-weya', label: 'Now at Weya.ai',
    line: 'At Weya.ai he takes client requirements and ships AI agents end to end: prompts, flows, tool calls, validations, front end, back end and deployment.',
    say: 'Abhi Weya.ai pe, woh clients se requirements leta hai aur agents end to end ship karta hai: prompts, flows, tool calls, front end, back end, deployment, sab kuch.',
  },
  {
    target: 'job-neurabit', label: 'Neurabit Solutions',
    line: 'Before that, at Neurabit Solutions he architected InstaBus, a production voice agent platform, joining as an intern and converting to full-time.',
    say: 'Usse pehle, Neurabit Solutions mein, he architected InstaBus, ek production voice agent platform. Intern join kiya tha, phir full-time convert ho gaya.',
  },
  {
    target: 'job-sarvm', label: 'Earlier roles',
    line: 'Earlier: LLM fine-tuning and RAG at Sarvm.ai, machine learning research at IIT Indore, deep learning research at BIT Sindri, plus a few smaller internships.',
    say: 'Aur pehle, umm, Sarvm.ai mein LLM fine-tuning aur RAG, IIT Indore mein machine learning research, BIT Sindri mein deep learning research, plus kuch chhoti internships bhi.',
  },
  {
    target: 'projects', label: 'Projects',
    line: 'Here are some of his projects. Most have a live demo and the code, so you can try them yourself.',
    say: 'Achha, yeh rahe his projects. Zyada tar mein live demo aur code dono hain, toh aap khud try kar sakte ho.',
  },
  {
    target: oss.id, label: 'Open source',
    line: `He contributes to open source too. This merged pull request in ${oss.repo} is one of them.`,
    say: `He contributes to open source bhi, aur yeh ${oss.repo} mein merged pull request, unmein se ek hai.`,
  },
  {
    target: p1.id, label: 'Paper 1 · Published',
    line: `His first paper is published in IEEE Xplore: a CNN that recognises ${p1.classes} skin conditions with ${p1.figure} accuracy.`,
    say: `Ab research. Pehla paper IEEE Xplore mein published hai: ek CNN jo ${p1.classes} skin conditions pehchanta hai, ${p1.figure} accuracy ke saath.`,
  },
  {
    target: p2.id, label: 'Paper 2 · In press',
    line: `The second, in press with Springer, detects brain tumours on MRI with ${p2.figure} accuracy.`,
    say: `Aur doosra, Springer ke saath in press hai: brain tumour detection on MRI, ${p2.figure} accuracy.`,
  },
  {
    target: 'leadership', label: 'Leadership',
    line: 'Beyond code: batch representative for all four years, placement committee member in his third year, CodeChef BU core team, and a YouTube educator since 2022 with over 2 lakh views.',
    say: 'Aur sirf code nahi: chaar saal batch representative, third year mein placement committee, CodeChef BU core team, aur 2022 se YouTube pe padhata bhi hai, 2 lakh se zyada views ke saath.',
  },
  {
    target: 'contact', label: 'Work with him',
    line: "That's the tour. Hire him on Upwork, or reach him by email or WhatsApp right here.",
    say: 'Toh yeh tha tour! Agar aap hire karna chahte ho, toh Upwork pe hire kar sakte ho, ya email aur WhatsApp yahin pe hai.',
  },
];
