import { useEffect } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import PageShell from './PageShell'
import NotFound from './NotFound'
import { PAGES, pageBySlug } from '../docs/content'
import { pageHtml } from '../docs/render'
import { pageUrl } from '../docs/pages-meta'
import '../docs.css'

export default function Docs() {
  const { slug = '' } = useParams()
  const { hash } = useLocation()
  const navigate = useNavigate()
  const page = pageBySlug(slug)

  // jump to #section links (also when arriving from another page)
  useEffect(() => { if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView() }, [slug, hash])

  if (!page) return <NotFound />
  const at = PAGES.indexOf(page), prev = PAGES[at - 1], next = PAGES[at + 1]
  // links inside the text move around the site without a full page load
  const onClick = (e) => {
    const a = e.target.closest?.('a')
    const href = a?.getAttribute('href')
    if (!href || !href.startsWith('/') || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return
    e.preventDefault()
    navigate(href)
  }
  return (
    <PageShell path={pageUrl(slug)} narrow={false}>
      <div className="doc-layout">
        <nav className="doc-side" aria-label="Documentation">
          <p className="doc-side-title">Documentation</p>
          {PAGES.map((p) => (
            <Link key={p.slug} to={pageUrl(p.slug)} aria-current={p === page ? 'page' : undefined}>{p.title.replace(/^Stutr documentation$/, 'Overview')}</Link>
          ))}
          <p className="doc-side-title">For AI tools</p>
          <a href="/llms.txt">llms.txt</a>
          <a href={`/docs/${slug || 'index'}.md`}>This page as markdown</a>
        </nav>
        <div>
          {/* eslint-disable-next-line react/no-danger -- static text written by us in src/docs, escaped by render.js */}
          <article className="doc-body" onClick={onClick} dangerouslySetInnerHTML={{ __html: pageHtml(page) }} />
          <nav className="doc-pager" aria-label="Previous and next">
            {prev ? <Link to={pageUrl(prev.slug)}>← {prev.title}</Link> : <span />}
            {next ? <Link to={pageUrl(next.slug)}>{next.title} →</Link> : <span />}
          </nav>
        </div>
      </div>
    </PageShell>
  )
}
