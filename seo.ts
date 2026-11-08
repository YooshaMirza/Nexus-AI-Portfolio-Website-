/**
 * seo.ts — search and share metadata, generated from content.ts at build time so it can't drift.
 * Injects canonical/Open Graph/Twitter tags and a schema.org Person into index.html,
 * and emits robots.txt + sitemap.xml. Set SITE_URL for a custom domain.
 */
import type { Plugin } from 'vite';
import { about, jobs, person } from './src/content';

export function seo(): Plugin {
  const site = (process.env.SITE_URL || 'https://yoosha-portfolio.netlify.app').replace(/\/$/, '');
  const current = jobs.find((j) => j.current);
  const title = `${person.name} · AI Forward Deployed Engineer`;
  const desc = `${person.name} is an AI forward deployed engineer at Weya.ai, building production voice agents, LLM systems and computer vision. Talk to Nexus, his live voice agent, right on the page.`;
  const btech = about.education.find((e) => e.id === 'edu-btech');
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    alternateName: person.short,
    url: site,
    image: `${site}/og.png`,
    jobTitle: current ? current.role : person.role,
    worksFor: current ? { '@type': 'Organization', name: current.org } : undefined,
    alumniOf: btech ? { '@type': 'CollegeOrUniversity', name: btech.org.split(',')[0] } : undefined,
    email: `mailto:${person.email}`,
    knowsAbout: ['Voice agents', 'Conversational AI', 'LLMs', 'RAG', 'Model Context Protocol', 'Computer vision', 'Deep learning', 'Gemini Live', 'Telephony'],
    sameAs: [...person.links.map((l) => l.href)],
  };
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return {
    name: 'portfolio-seo',
    transformIndexHtml(html) {
      return html
        .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
        .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(desc)}" />`)
        .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}" />`)
        .replace('</head>', `    <link rel="canonical" href="${site}/" />
    <meta property="og:url" content="${site}/" />
    <meta property="og:image" content="${site}/og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="${esc(person.name)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(desc)}" />
    <meta name="twitter:image" content="${site}/og.png" />
    <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
  </head>`);
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n` });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n` });
    },
  };
}
