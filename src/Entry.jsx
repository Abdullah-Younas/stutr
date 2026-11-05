import './index.css'
import { useNavigate } from 'react-router-dom'
import { FooterLinks } from './pages/PageShell'
import { usePageMeta } from './lib/meta'

function Entry() {
  const navigate = useNavigate()
  usePageMeta('/')

  return (
    <div className="Background">
      <div className="Modal">
        <main id="main" tabIndex={-1} className="Right">
          <p id="title">Stutr</p>
          <h1 id="Slogan">Where Circuits Come Alive</h1>
          <p id="des">A code based Logisim alternative. <br /> Write logic, not wires.</p>
          <button id="entrybtn" type="button" onClick={() => navigate('/app')}>Start Building</button>
          <p id="entryftr">Stutr - Code to Circuit</p>
          <FooterLinks className="entry-links" />
        </main>
      </div>
    </div>
  )
}

export default Entry
