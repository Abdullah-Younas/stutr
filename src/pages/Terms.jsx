import { Link } from 'react-router-dom'
import PageShell from './PageShell'
import { SITE } from '../site'

// Starter text. Have it reviewed (governing law, liability limits) before launch.
export default function Terms() {
  return (
    <PageShell path="/terms">
      <h1>Terms of Service</h1>
      <p className="muted">Last updated: {SITE.updated}</p>
      <p>By using Stutr you agree to these terms. If you do not agree, please do not use the service.</p>

      <h2>The service</h2>
      <p>Stutr is a browser-based simulator for digital logic circuits. It is provided for learning, experimenting and hobby projects.</p>

      <h2>Your account</h2>
      <p>You sign in through GitHub or Google. Keep your account secure and give us accurate information. You are responsible for what happens under your account.</p>

      <h2>Your content</h2>
      <p>You keep ownership of the circuits you create. You give us permission to store and display them to you so the service can work. Do not upload anything unlawful or anything you do not have the right to use.</p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not attack, overload or probe the service, or try to access other people’s data.</li>
        <li>Do not use automated tools to create accounts or scrape the service.</li>
        <li>Do not use Stutr to break the law or harm others.</li>
      </ul>

      <h2>No guarantees</h2>
      <p>Stutr is provided “as is”. A simulation is a model and can differ from real hardware. Do not rely on it for safety-critical designs. We may change, pause or remove features, and we do not promise the service will always be available or free of errors. Keep your own backup of anything important (Settings → Export).</p>

      <h2>Liability</h2>
      <p>To the extent the law allows, we are not liable for indirect or consequential losses, or for lost data or profits, arising from your use of Stutr.</p>

      <h2>Ending your use</h2>
      <p>You can stop using Stutr and delete your data at any time. We may suspend accounts that break these terms.</p>

      <h2>Changes and contact</h2>
      <p>We may update these terms and will change the date above when we do. Questions: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. See also the <Link to="/privacy">Privacy Policy</Link>.</p>
    </PageShell>
  )
}
