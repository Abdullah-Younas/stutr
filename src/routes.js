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
  { path: '/login', title: 'Sign in - Stutr', index: false,
    description: 'Sign in to Stutr with GitHub or Google to save your circuits.' },
  { path: '/app', title: 'Editor - Stutr', index: false,
    description: 'Build and simulate digital logic circuits.' },
]
export const FOOTER_LINKS = [['FAQ', '/faq'], ['Privacy', '/privacy'], ['Terms', '/terms']]

const trim = (u) => u.replace(/\/$/, '')
export const sitemapXml = (base, date = new Date().toISOString().slice(0, 10)) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  ROUTES.filter((r) => r.index).map((r) => `  <url><loc>${trim(base)}${r.path === '/' ? '/' : r.path}</loc><lastmod>${date}</lastmod></url>`).join('\n') +
  `\n</urlset>\n`
export const robotsTxt = (base) =>
  `User-agent: *\nAllow: /\n${ROUTES.filter((r) => !r.index).map((r) => `Disallow: ${r.path}`).join('\n')}\n\nSitemap: ${trim(base)}/sitemap.xml\n`
