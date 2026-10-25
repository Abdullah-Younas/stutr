import './index.css'
import {
  LayoutGrid,
  Folder,
  CircleCheck,
  Compass,
  Workflow,
  Wand2,
  Braces,
  CircleAlert,
  Search,
} from 'lucide-react'

import { useRef, useState } from 'react'

const sections = [
  {
    label: 'Workflow',
    items: [
      { name: 'Workspace', icon: LayoutGrid, active: true },
      { name: 'Projects', icon: Folder },
      { name: 'Collaborators', icon: CircleCheck },
      { name: 'Insights', icon: Compass },
      { name: 'Workflows', icon: Workflow },
      { name: 'Repos', icon: Wand2 },
    ],
  },
  {
    label: 'Support',
    items: [
      { name: 'Documentation', icon: Braces },
      { name: 'Help center', icon: CircleAlert },
    ],
  },
  {
    label: 'Extensions',
    items: [
      { name: 'Claude', dot: '#d97757' },
      { name: 'Perplexity', dot: '#1f2a2e' },
      { name: 'Cursor', dot: '#2a2a2a' },
    ],
  },
]

const tabs = ['Code', 'Editor']

function CodeEditor() {
  const [code, setCode] = useState('')
  const gutterRef = useRef(null)
  const areaRef = useRef(null)

  const lineCount = code.split('\n').length

  // keep the line numbers scrolled together with the text
  const syncScroll = (e) => {
    gutterRef.current.scrollTop = e.target.scrollTop
  }

  // Tab inserts two spaces instead of moving focus
  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const { selectionStart: start, selectionEnd: end } = e.target
    setCode(code.slice(0, start) + '  ' + code.slice(end))
    requestAnimationFrame(() => {
      areaRef.current.selectionStart = areaRef.current.selectionEnd = start + 2
    })
  }

  return (
    <div className="CodeEditor">
      <div className="gutter" ref={gutterRef} aria-hidden="true">
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={areaRef}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={handleKeyDown}
        placeholder="Write code here…"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        wrap="off"
        aria-label="Code editor"
      />
    </div>
  )
}

function Dashboard() {
  const [tab, setTab] = useState('Code')

  return (
    <div className="DashBG">
      <aside className="Tree">
        <button className="brand" type="button">
          <span className="brand-logo">S</span>
          <span className="brand-name">Stutr</span>
        </button>

        <label className="search">
          <Search size={18} />
          <input type="text" placeholder="search" />
          <kbd>⌘ K</kbd>
        </label>

        {sections.map((section) => (
          <nav className="group" key={section.label}>
            <p className="group-label">{section.label}</p>
            {section.items.map(({ name, icon: Icon, active, dot }) => (
              <a
                href="#"
                key={name}
                className={`nav-item${active ? ' active' : ''}`}
              >
                {Icon ? (
                  <Icon size={20} strokeWidth={1.5} />
                ) : (
                  <span className="ext-dot" style={{ background: dot }} />
                )}
                <span>{name}</span>
              </a>
            ))}
          </nav>
        ))}
      </aside>

      <main className="Main">
        <div className="SelectionBar" role="tablist">
          {tabs.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              className={tab === name ? 'active' : ''}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </div>

        {tab === 'Code' && <CodeEditor />}
        {tab === 'Editor' && (
          <div className="Grid" role="tabpanel">
            {/* place grid items here */}
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard