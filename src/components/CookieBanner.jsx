import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { OPEN_EVENT, getConsent, setConsent } from '../lib/consent'

export default function CookieBanner() {
  const [open, setOpen] = useState(() => getConsent() === null)
  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener(OPEN_EVENT, show)
    return () => window.removeEventListener(OPEN_EVENT, show)
  }, [])
  if (!open) return null
  const choose = (v) => { setConsent(v); setOpen(false) }
  return (
    <div className="consent" role="dialog" aria-label="Cookie preferences">
      <p>
        Stutr keeps essential data in your browser (sign-in, settings, your circuits). With your OK it also loads
        privacy-friendly analytics to see which pages get used. <Link to="/privacy">Read the privacy policy</Link>.
      </p>
      <div>
        <button type="button" onClick={() => choose('essential')}>Essential only</button>
        <button type="button" className="primary" onClick={() => choose('all')}>Allow analytics</button>
      </div>
    </div>
  )
}
