import { PAGE_META, pageUrl } from './docs/pages-meta.js'

// One list drives the sitemap, the page titles/descriptions, the 404 logic and the link tests.
export const ROUTES = [
  { path: '/', title: 'Stutr - Write Logic, Not Wires | Code-Based Circuit Simulator', index: true,
    description: 'Stutr is a code-based Logisim alternative. Build digital logic circuits by typing code or dragging parts, and run them live in your browser.' },
  { path: '/faq', title: 'FAQ - Stutr', index: true,
    description: 'Answers about Stutr: what it is, how the circuit language works, saving your work, keyboard shortcuts and browser support.' },
  { path: '/privacy', title: 'Privacy Policy - Stutr', index: true,
    description: 'What data Stutr collects, why, where it is stored and how you can export or delete it.' },
  { path: '/terms', title: 'Terms of Service - Stutr', index: true,
    description: 'The terms for using Stutr, the code-based circuit simulator.' },
  ...PAGE_META.map((m) => ({
    path: pageUrl(m.slug), index: true, description: m.description,
    title: m.slug ? `${m.title} - Stutr Docs` : 'Stutr Documentation - Learn the Code-Based Circuit Simulator',
  })),
  { path: '/start', title: 'Get started - Stutr', index: false,
    description: 'Open the Stutr editor and start building a digital circuit from code.' },
  { path: '/pricing', title: 'Pricing - Stutr', index: false,
    description: 'Stutr plans: Free, Pro, Student, Classroom and a one-time Founder offer. Free is enough to learn and build circuits.' }, // set index: true once paid plans can be bought
  { path: '/login', title: 'Sign in - Stutr', index: false,
    description: 'Sign in to Stutr with GitHub or Google to save your circuits.' },
  { path: '/app', title: 'Editor - Stutr', index: false,
    description: 'Build and simulate digital logic circuits.' },
]
export const FOOTER_LINKS = [['Docs', '/docs'], ['FAQ', '/faq'], ['Pricing', '/pricing'], ['Privacy', '/privacy'], ['Terms', '/terms']]

const trim = (u) => u.replace(/\/$/, '')
export const sitemapXml = (base, date = new Date().toISOString().slice(0, 10)) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  ROUTES.filter((r) => r.index).map((r) => `  <url><loc>${trim(base)}${r.path === '/' ? '/' : r.path}</loc><lastmod>${date}</lastmod></url>`).join('\n') +
  `\n</urlset>\n`
// AI assistants and AI search are welcome to read the public pages and the docs (see /llms.txt). They share the same blocked paths as everyone.
export const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended', 'CCBot', 'cohere-ai', 'Meta-ExternalAgent', 'Amazonbot', 'DuckAssistBot']
export const robotsTxt = (base) => {
  const dis = ROUTES.filter((r) => !r.index).map((r) => `Disallow: ${r.path}`).join('\n')
  return `User-agent: *\nAllow: /\n${dis}\n\n# AI assistants and AI search: the docs are public. Start at /llms.txt\n${AI_BOTS.map((b) => `User-agent: ${b}`).join('\n')}\nAllow: /\n${dis}\n\nSitemap: ${trim(base)}/sitemap.xml\n`
}
