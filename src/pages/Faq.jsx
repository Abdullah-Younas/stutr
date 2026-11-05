import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import PageShell from './PageShell'
import { SITE } from '../site'

const QA = [
  ['What is Stutr?', 'Stutr is a code-based alternative to Logisim. You build digital logic circuits in your browser, either by typing code or by dragging parts onto a canvas, and you can run them live: gates, buses, flip-flops, RAM and ROM, and even a small CPU.'],
  ['How is it different from Logisim?', 'Every circuit in Stutr is also plain text. The canvas and the code are two views of the same circuit, so you can write a circuit in a few lines, or draw it and read the code it produces. It runs in the browser, so there is nothing to install.'],
  ['How do I write a circuit in code?', 'One line per part: name = part<bits>(inputs, setting=value). For example, A = input(1), B = input(0), g = and(A, B), Y = output(g). Open the Documentation panel in the editor for the full list of parts. The Repository panel has ready-made examples, including a 4-bit CPU.'],
  ['Do the canvas and the code stay in sync?', 'Yes. Change one and the other updates straight away. If the code has a mistake, the editor shows the line and keeps the last working circuit on the canvas until you fix it.'],
  ['How do I run a clock or the CPU example?', 'Add a clock part and press Run above the canvas. Pick the speed (1 to 20 Hz) next to it. You can also click the clock with the Poke tool to step one edge at a time.'],
  ['Do I need an account?', 'No. You can try the editor as a guest and your work stays in your browser. Sign in with GitHub or Google to save projects and settings online and open them on any device.'],
  ['Where is my data stored, and can I delete it?', 'Signed-in data is stored in a Supabase database and is only readable by you. Settings → Export downloads everything as a file, and Settings → Delete my data removes your saved projects and settings. Details are in the privacy policy.'],
  ['What are the keyboard shortcuts?', 'P Poke, E Edit, S Select, X Erase tool, T Text, M Menu, L Label. Hold D and click a part or wire to erase it. Delete removes the selection, Esc returns to Poke, Ctrl+Z undoes and Ctrl+Y (or Ctrl+Shift+Z) redoes. Mouse wheel zooms and dragging empty space pans.'],
  ['Which browsers and devices work?', 'Current versions of Chrome, Edge, Firefox and Safari. The editor works with touch on phones and tablets, but a larger screen is much more comfortable for bigger circuits.'],
  ['Is Stutr accessible?', 'The drag-and-drop canvas needs a mouse or touch. The Code tab is the keyboard- and screen-reader-friendly way to build the same circuit as text. The rest of the site supports keyboard navigation and visible focus. If something blocks you, tell us and we will fix it.'],
  ['How do I report a bug or ask something else?', `Email ${SITE.email}.`],
]

export default function Faq() {
  useEffect(() => {
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: QA.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) })
    document.head.appendChild(el)
    return () => el.remove()
  }, [])
  return (
    <PageShell path="/faq">
      <h1>Frequently asked questions</h1>
      {QA.map(([q, a]) => (
        <details key={q}><summary>{q}</summary><p>{a}</p></details>
      ))}
      <p className="actions"><Link className="btn primary" to="/app">Start building</Link></p>
    </PageShell>
  )
}
