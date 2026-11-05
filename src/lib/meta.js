import { useEffect } from 'react'
import { SITE, routeMeta } from '../site'

const put = (tag, attr, key, props) => {
  let el = document.head.querySelector(`${tag}[${attr}="${key}"]`)
  if (!el) { el = document.createElement(tag); el.setAttribute(attr, key); document.head.appendChild(el) }
  Object.entries(props).forEach(([k, v]) => el.setAttribute(k, v))
}

// Title, description, canonical URL, social-share tags and robots rule for the current page.
export function usePageMeta(path) {
  useEffect(() => {
    const r = routeMeta(path) || { title: 'Page not found - Stutr', description: 'This page does not exist.', index: false }
    const url = SITE.url + path
    document.title = r.title
    put('meta', 'name', 'description', { content: r.description })
    put('meta', 'name', 'robots', { content: r.index ? 'index,follow' : 'noindex,nofollow' })
    put('link', 'rel', 'canonical', { href: url })
    for (const [k, v] of [['og:title', r.title], ['og:description', r.description], ['og:url', url]]) put('meta', 'property', k, { content: v })
    for (const [k, v] of [['twitter:title', r.title], ['twitter:description', r.description]]) put('meta', 'name', k, { content: v })
  }, [path])
}
