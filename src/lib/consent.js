// Essential storage (sign-in, settings, your own circuits) needs no consent. Analytics only loads after "all".
const KEY = 'stutr-consent'
export const OPEN_EVENT = 'stutr-open-consent'

export const getConsent = () => {
  try { return localStorage.getItem(KEY) } catch { return null }
}
export const loadAnalytics = () => {
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN
  if (!domain || document.getElementById('plausible')) return
  const s = document.createElement('script')
  s.id = 'plausible'
  s.defer = true
  s.dataset.domain = domain
  s.src = 'https://plausible.io/js/script.js'
  document.head.appendChild(s)
}
export const setConsent = (value) => {
  try { localStorage.setItem(KEY, value) } catch { /* storage blocked */ }
  if (value === 'all') loadAnalytics()
  else document.getElementById('plausible')?.remove()
}
export const openConsent = () => window.dispatchEvent(new Event(OPEN_EVENT))
export const track = (name, props) => { if (getConsent() === 'all') window.plausible?.(name, { props }) }
