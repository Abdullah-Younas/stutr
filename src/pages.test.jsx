import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Entry from './Entry'
import Landing from './Landing'
import Pricing from './pages/Pricing'
import Faq from './pages/Faq'
import NotFound from './pages/NotFound'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'

const html = (C) => renderToString(<MemoryRouter><C /></MemoryRouter>)

describe('public pages', () => {
  for (const [name, C] of [['Home', Landing], ['Start', Entry], ['Pricing', Pricing], ['FAQ', Faq], ['Privacy', Privacy], ['Terms', Terms], ['404', NotFound]]) {
    it(`${name}: one h1, a main landmark, no images without alt text`, () => {
      const out = html(C)
      expect((out.match(/<h1[ >]/g) || []).length).toBe(1)
      expect(out).toMatch(/<main[^>]*id="main"/)
      for (const img of out.match(/<img[^>]*>/g) || []) expect(img).toMatch(/alt="/)
    })
  }
  it('home page has a clear call to action and links to the legal pages', () => {
    const out = html(Landing)
    expect(out).toContain('Start Building')
    expect(out).toContain('href="/start"')
    expect(out).toContain('href="/privacy"')
    expect(out).toContain('href="/terms"')
    expect(out).toContain('href="/faq"')
  })
})
