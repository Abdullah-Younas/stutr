import { Link } from 'react-router-dom'
import PageShell from './PageShell'
import { openConsent } from '../lib/consent'
import { SITE } from '../site'

// Starter text written from how this app actually works. Have it reviewed for your country before launch.
export default function Privacy() {
  return (
    <PageShell path="/privacy">
      <h1>Privacy Policy</h1>
      <p className="muted">Last updated: {SITE.updated}</p>
      <p>This explains what Stutr stores about you, why, and how you stay in control. Questions: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details</strong> - if you sign in with GitHub or Google we receive your name, email address, profile picture and a provider ID. We never see your GitHub or Google password.</li>
        <li><strong>Your content</strong> - the circuits you save (as text), their names, your settings and an automatic draft of your latest circuit.</li>
        <li><strong>Technical data</strong> - our hosting and database providers process IP addresses and request logs to deliver the site and keep it secure.</li>
        <li><strong>Analytics (only if you allow it)</strong> - anonymous page-view statistics from a privacy-friendly analytics service. It is not loaded unless you choose “Allow analytics”.</li>
      </ul>

      <h2>Why we use it</h2>
      <p>To sign you in, save and show your work, keep the service running and secure, and, with your consent, understand which pages are used. We do not sell your data and we do not show ads.</p>

      <h2>Where it is stored</h2>
      <p>Account and saved data live in a Supabase database. Row-level security means each account can only read and write its own rows. The site is delivered by our hosting provider. These providers act on our behalf and may process data outside your country.</p>

      <h2>Cookies and browser storage</h2>
      <table>
        <thead><tr><th>Name</th><th>Purpose</th><th>Type</th></tr></thead>
        <tbody>
          <tr><td>Sign-in session</td><td>Keeps you signed in</td><td>Essential</td></tr>
          <tr><td>stutr-settings, stutr-projects, stutr-draft</td><td>Your settings and, when not signed in, your circuits</td><td>Essential</td></tr>
          <tr><td>stutr-consent</td><td>Remembers your cookie choice</td><td>Essential</td></tr>
          <tr><td>Analytics</td><td>Anonymous page views</td><td>Only with your consent</td></tr>
        </tbody>
      </table>
      <p><button type="button" className="btn" onClick={openConsent}>Change cookie choice</button></p>

      <h2>How long we keep it</h2>
      <p>Until you delete it. In the editor, Settings → Export downloads your data and Settings → Delete my data removes your saved projects and settings. To delete your account itself, email us.</p>

      <h2>Your rights</h2>
      <p>Depending on where you live you can ask to access, correct, export or delete your data, object to processing, and withdraw consent at any time. Most of this is self-service in Settings; for the rest, email <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>

      <h2>Children</h2>
      <p>Stutr is not directed at children under 13 (or the minimum age in your country). Do not create an account if you are below it.</p>

      <h2>Changes</h2>
      <p>If we change this policy we will update the date above. See also the <Link to="/terms">Terms of Service</Link>.</p>
    </PageShell>
  )
}
