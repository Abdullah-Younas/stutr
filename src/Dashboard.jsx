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
  ChevronsUpDown,
  Search,
} from 'lucide-react'

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

function Dashboard() {
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
        <header className="main-head">
          <LayoutGrid size={20} strokeWidth={1.5} />
          <span>Workspace</span>
        </header>
      </main>
    </div>
  )
}

export default Dashboard