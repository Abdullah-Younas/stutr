import './index.css'
import './dashboard.css'
import { Hand, MousePointer2, Cable, Eraser, Search, Wrench, FilePlus, Folder, GitBranch, Download, BookOpen, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

/* ================= circuit model ================= */
const GATES = {
  AND: { ins: 2, sym: '&', f: (a) => a[0] && a[1] },
  OR: { ins: 2, sym: '≥1', f: (a) => a[0] || a[1] },
  NOT: { ins: 1, sym: '1', neg: true, f: (a) => !a[0] },
  NAND: { ins: 2, sym: '&', neg: true, f: (a) => !(a[0] && a[1]) },
  NOR: { ins: 2, sym: '≥1', neg: true, f: (a) => !(a[0] || a[1]) },
  XOR: { ins: 2, sym: '=1', f: (a) => a[0] !== a[1] },
}
const PINS = { IN: { ins: 0 }, OUT: { ins: 1 } }
const spec = (t) => GATES[t] || PINS[t]
const size = (c) => (GATES[c.type] ? [60, 60] : [40, 40])
const snap = (v) => Math.round(v / 20) * 20
const pinIn = (c, i) => [c.x, c.y + (size(c)[1] / (spec(c.type).ins + 1)) * (i + 1)]
const pinOut = (c) => [c.x + size(c)[0] + (spec(c.type).neg ? 10 : 0), c.y + size(c)[1] / 2]
const NAME = /^[A-Za-z_]\w*$/

// a part's id IS its name, so wires and code refer to the same thing
const START = {
  parts: [
    { id: 'A', type: 'IN', x: 60, y: 60, on: true },
    { id: 'B', type: 'IN', x: 60, y: 140, on: false },
    { id: 'C', type: 'IN', x: 60, y: 200, on: true },
    { id: 'g1', type: 'OR', x: 200, y: 160 },
    { id: 'g2', type: 'AND', x: 340, y: 100 },
    { id: 'Y', type: 'OUT', x: 500, y: 110 },
  ],
  wires: [
    { from: 'B', to: 'g1', pin: 0 }, { from: 'C', to: 'g1', pin: 1 },
    { from: 'A', to: 'g2', pin: 0 }, { from: 'g1', to: 'g2', pin: 1 },
    { from: 'g2', to: 'Y', pin: 0 },
  ],
}

/* ================= circuit -> code ================= */
const gen = ({ parts, wires }) =>
  parts.map((c) => {
    const at = ` @${c.x},${c.y}`
    const src = (i) => wires.find((w) => w.to === c.id && w.pin === i)?.from ?? '_'
    if (c.type === 'IN') return `in ${c.id} = ${c.on ? 1 : 0}${at}`
    if (c.type === 'OUT') return `out ${c.id} = ${src(0)}${at}`
    const args = Array.from({ length: GATES[c.type].ins }, (_, i) => src(i)).join(', ')
    return `${c.type.toLowerCase()} ${c.id}(${args})${at}`
  }).join('\n')

/* ================= code -> circuit ================= */
const parse = (text) => {
  const parts = [], wires = [], errs = [], refs = []
  const add = (p, n) => {
    if (parts.some((x) => x.id === p.id)) errs.push(`Line ${n}: name "${p.id}" is used twice`)
    else parts.push(p)
  }
  text.split('\n').forEach((raw, i) => {
    const n = i + 1
    const line = raw.replace(/\/\/.*/, '').trim()
    if (!line) return
    const at = line.match(/@\s*(-?\d+)\s*,\s*(-?\d+)\s*$/)
    const body = at ? line.slice(0, at.index).trim() : line
    const pos = at ? { x: +at[1], y: +at[2] } : {}
    let m
    if ((m = body.match(/^in\s+(\w+)\s*=\s*([01])$/i))) {
      add({ id: m[1], type: 'IN', on: m[2] === '1', ...pos }, n)
    } else if ((m = body.match(/^out\s+(\w+)\s*=\s*(\w+)$/i))) {
      add({ id: m[1], type: 'OUT', ...pos }, n)
      refs.push({ from: m[2], to: m[1], pin: 0, n })
    } else if ((m = body.match(/^(\w+)\s+(\w+)\s*\(([^)]*)\)$/)) && GATES[m[1].toUpperCase()]) {
      const type = m[1].toUpperCase()
      const args = m[3].split(',').map((s) => s.trim()).filter(Boolean)
      if (args.length !== GATES[type].ins) errs.push(`Line ${n}: ${type} needs ${GATES[type].ins} input(s)`)
      add({ id: m[2], type, ...pos }, n)
      args.forEach((a, pin) => refs.push({ from: a, to: m[2], pin, n }))
    } else errs.push(`Line ${n}: can't read "${body}"`)
  })
  refs.forEach(({ from, to, pin, n }) => {
    if (from === '_') return
    const s = parts.find((p) => p.id === from)
    if (!s || s.type === 'OUT') errs.push(`Line ${n}: "${from}" is not a part that has an output`)
    else wires.push({ from, to, pin })
  })
  // parts written without @x,y get placed in columns by logic depth
  const lvl = {}
  const depth = (id, seen = new Set()) => {
    if (lvl[id] != null) return lvl[id]
    const p = parts.find((x) => x.id === id)
    if (!p || p.type === 'IN' || seen.has(id)) return 0
    const s = new Set(seen).add(id)
    return (lvl[id] = 1 + Math.max(0, ...wires.filter((w) => w.to === id).map((w) => depth(w.from, s))))
  }
  const rows = {}
  parts.forEach((p) => {
    if (p.x != null) return
    const l = depth(p.id)
    rows[l] = rows[l] || 0
    p.x = 60 + l * 140
    p.y = 60 + rows[l]++ * 80
  })
  return { parts, wires, errs }
}

/* ================= Code tab ================= */
function CodeEditor({ code, onChange, err }) {
  const gutter = useRef(null)
  const area = useRef(null)
  const lines = code.split('\n').length

  const onKeyDown = (e) => {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const { selectionStart: s, selectionEnd: en } = e.target
    onChange(code.slice(0, s) + '  ' + code.slice(en))
    requestAnimationFrame(() => (area.current.selectionStart = area.current.selectionEnd = s + 2))
  }

  return (
    <div className="CodeEditor">
      <div className="gutter" ref={gutter} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}
      </div>
      <textarea
        ref={area} value={code} wrap="off" spellCheck={false} aria-label="Circuit code"
        onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
        onScroll={(e) => (gutter.current.scrollTop = e.target.scrollTop)}
        placeholder={'in A = 1\nin B = 0\nand g1(A, B)\nout Y = g1'}
      />
      <div className={`codebar${err ? ' err' : ''}`}>
        {err || 'Synced · in A = 1  ·  and g(A, B)  ·  out Y = g  ·  _ = empty pin  ·  @x,y optional'}
      </div>
    </div>
  )
}

/* ================= Editor tab ================= */
const HINTS = {
  poke: 'Poke: click an input to flip it',
  select: 'Select: drag parts, Delete removes the selection',
  wire: 'Wire: click an output pin, then an input pin',
  erase: 'Erase: click a part or a wire',
}

function Circuit({ circuit, update, tool, setTool }) {
  const { parts, wires } = circuit
  const [sel, setSel] = useState(null)
  const [pending, setPending] = useState(null)
  const drag = useRef(null)
  const svg = useRef(null)
  const byId = useMemo(() => Object.fromEntries(parts.map((p) => [p.id, p])), [parts])

  const val = (id, seen = new Set()) => {
    const c = byId[id]
    if (!c || seen.has(id)) return false
    if (c.type === 'IN') return c.on
    const s = new Set(seen).add(id)
    const ins = Array.from({ length: spec(c.type).ins }, (_, i) => {
      const w = wires.find((w) => w.to === id && w.pin === i)
      return w ? val(w.from, s) : false
    })
    return c.type === 'OUT' ? ins[0] : GATES[c.type].f(ins)
  }

  const point = (e) => {
    const r = svg.current.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }
  const patch = (id, o) => update((c) => ({ ...c, parts: c.parts.map((p) => (p.id === id ? { ...p, ...o } : p)) }))
  const remove = (id) => {
    update((c) => ({ parts: c.parts.filter((p) => p.id !== id), wires: c.wires.filter((w) => w.from !== id && w.to !== id) }))
    setSel(null)
  }
  const rename = (id, name) => {
    if (!NAME.test(name) || (name !== id && byId[name])) return
    update((c) => ({
      parts: c.parts.map((p) => (p.id === id ? { ...p, id: name } : p)),
      wires: c.wires.map((w) => ({ ...w, from: w.from === id ? name : w.from, to: w.to === id ? name : w.to })),
    }))
    setSel(name)
  }
  const fresh = (type) => {
    const base = type === 'IN' ? 'in' : type === 'OUT' ? 'out' : type.toLowerCase()
    let i = 1
    while (byId[base + i]) i++
    return base + i
  }

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (e.key === 'Delete' && sel) remove(sel)
      if (e.key === 'Escape') { setPending(null); setTool('poke') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const onCanvasDown = (e) => {
    setSel(null); setPending(null)
    if (!spec(tool)) return
    const [x, y] = point(e), [w, h] = size({ type: tool })
    const id = fresh(tool)
    update((c) => ({ ...c, parts: [...c.parts, { id, type: tool, x: snap(x - w / 2), y: snap(y - h / 2), on: false }] }))
    setSel(id)
  }
  const onPartDown = (e, c) => {
    e.stopPropagation()
    if (tool === 'erase') return remove(c.id)
    if (tool === 'poke' && c.type === 'IN') return patch(c.id, { on: !c.on })
    setSel(c.id)
    if (tool === 'select' || tool === 'poke') {
      const [x, y] = point(e)
      drag.current = { id: c.id, ox: x - c.x, oy: y - c.y }
    }
  }
  const onMove = (e) => {
    if (!drag.current) return
    const [x, y] = point(e)
    patch(drag.current.id, { x: snap(x - drag.current.ox), y: snap(y - drag.current.oy) })
  }
  const onPin = (e, c, i) => {
    e.stopPropagation()
    if (tool !== 'wire') return
    if (i === 'out') return setPending(c.id)
    if (pending == null || pending === c.id) return
    update((k) => ({ ...k, wires: [...k.wires.filter((w) => !(w.to === c.id && w.pin === i)), { from: pending, to: c.id, pin: i }] }))
    setPending(null)
  }

  const cur = byId[sel]

  return (
    <div className={`circuit tool-${tool}`}>
      <svg ref={svg} onPointerDown={onCanvasDown} onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)}>
        <defs>
          <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.14)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />

        {wires.map((w, i) => {
          const a = byId[w.from], b = byId[w.to]
          if (!a || !b) return null
          const [x1, y1] = pinOut(a), [x2, y2] = pinIn(b, w.pin), mx = (x1 + x2) / 2
          return (
            <path key={i} d={`M${x1} ${y1}H${mx}V${y2}H${x2}`} className={`wire ${val(w.from) ? 'hi' : ''}`}
              onPointerDown={(e) => { e.stopPropagation(); if (tool === 'erase') update((k) => ({ ...k, wires: k.wires.filter((_, j) => j !== i) })) }} />
          )
        })}

        {parts.map((c) => {
          const [w, h] = size(c), g = GATES[c.type], on = val(c.id)
          return (
            <g key={c.id} transform={`translate(${c.x} ${c.y})`} onPointerDown={(e) => onPartDown(e, c)}
              className={`part ${sel === c.id ? 'sel' : ''}`}>
              <rect width={w} height={h} rx={c.type === 'OUT' ? 20 : 6} className={on && !g ? 'on' : ''} />
              <text x={w / 2} y={h / 2 + 5} textAnchor="middle">{g ? g.sym : on ? '1' : '0'}</text>
              {g?.neg && <circle cx={w + 5} cy={h / 2} r="5" />}
              <text x={w / 2} y={-8} textAnchor="middle" className="lbl">{c.id}</text>
            </g>
          )
        })}

        {parts.map((c) => (
          <g key={'p' + c.id}>
            {Array.from({ length: spec(c.type).ins }, (_, i) => (
              <circle key={i} cx={pinIn(c, i)[0]} cy={pinIn(c, i)[1]} r="5" className="pin" onPointerDown={(e) => onPin(e, c, i)} />
            ))}
            {c.type !== 'OUT' && (
              <circle cx={pinOut(c)[0]} cy={pinOut(c)[1]} r="5" className={`pin ${pending === c.id ? 'pending' : ''}`}
                onPointerDown={(e) => onPin(e, c, 'out')} />
            )}
          </g>
        ))}
      </svg>

      <div className="hint">{HINTS[tool] || `Click the canvas to place ${tool}`}</div>

      {cur && (
        <aside className="inspector">
          <h4>{cur.type}</h4>
          <label>Name
            <input value={cur.id} onChange={(e) => rename(cur.id, e.target.value)} />
          </label>
          <p>Position <span>{cur.x}, {cur.y}</span></p>
          <p>Output <span>{val(cur.id) ? 1 : 0}</span></p>
          <button type="button" onClick={() => remove(cur.id)}>Delete</button>
        </aside>
      )}
    </div>
  )
}

/* ================= Modal + its contents ================= */
function Modal({ title, onClose, children }) {
  useEffect(() => {
    // capture phase, so Esc closes the modal without also resetting the tool
    const k = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  }, [onClose])
  return (
    <div className="overlay" onPointerDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onPointerDown={(e) => e.stopPropagation()}>
        <header>
          <h3>{title}</h3>
          <button type="button" className="x" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

const PARTS = [
  { label: 'Tools', items: [
    { name: 'Poke', icon: Hand, tool: 'poke' },
    { name: 'Select', icon: MousePointer2, tool: 'select' },
    { name: 'Wire', icon: Cable, tool: 'wire' },
    { name: 'Erase', icon: Eraser, tool: 'erase' },
  ] },
  { label: 'Gates', items: ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR'].map((n) => ({ name: n, glyph: GATES[n].sym, tool: n })) },
  { label: 'Pins', items: [
    { name: 'Input', glyph: 'in', tool: 'IN' },
    { name: 'Output', glyph: 'out', tool: 'OUT' },
  ] },
]

function ToolPicker({ tool, onPick }) {
  const [q, setQ] = useState('')
  return (
    <>
      <input className="modal-search" autoFocus placeholder="Search tools and parts" value={q} onChange={(e) => setQ(e.target.value)} />
      {PARTS.map((s) => {
        const items = s.items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()))
        if (!items.length) return null
        return (
          <section key={s.label}>
            <h4>{s.label}</h4>
            <div className="tiles">
              {items.map(({ name, icon: Icon, glyph, tool: t }) => (
                <button key={name} type="button" className={`tile${tool === t ? ' active' : ''}`} onClick={() => onPick(t)}>
                  {Icon ? <Icon size={22} strokeWidth={1.5} /> : <span className="glyph">{glyph}</span>}
                  <span>{name}</span>
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </>
  )
}

const KEY = 'stutr-projects'
const readProjects = () => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } }

function Projects({ code, onOpen }) {
  const [list, setList] = useState(readProjects)
  const [name, setName] = useState('')
  const store = (next) => {
    setList(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage blocked or full */ }
  }
  const save = () => {
    const n = name.trim() || `Circuit ${list.length + 1}`
    store([{ name: n, code, saved: Date.now() }, ...list.filter((p) => p.name !== n)])
    setName('')
  }
  return (
    <>
      <div className="row">
        <input className="modal-search" value={name} placeholder="Name this circuit" onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()} />
        <button type="button" className="btn" onClick={save}>Save current</button>
      </div>
      {!list.length && <p className="empty">Nothing saved yet. Name the circuit above and save it.</p>}
      {list.map((p) => (
        <div className="item" key={p.name}>
          <div><strong>{p.name}</strong><small>{new Date(p.saved).toLocaleString()}</small></div>
          <button type="button" className="btn" onClick={() => onOpen(p.code)}>Open</button>
          <button type="button" className="btn ghost" onClick={() => store(list.filter((x) => x !== p))}>Delete</button>
        </div>
      ))}
    </>
  )
}

const EXAMPLES = [
  { name: 'Half adder', note: 'Adds two bits: XOR is the sum, AND is the carry.',
    code: ['in A = 1', 'in B = 1', 'xor sum(A, B)', 'and carry(A, B)', 'out S = sum', 'out C = carry'].join('\n') },
  { name: 'Full adder', note: 'Adds two bits plus a carry-in.',
    code: ['in A = 1', 'in B = 0', 'in Cin = 1', 'xor x(A, B)', 'xor s(x, Cin)', 'and a1(A, B)', 'and a2(x, Cin)', 'or co(a1, a2)', 'out Sum = s', 'out Cout = co'].join('\n') },
  { name: 'XOR from NANDs', note: 'Four NAND gates behave like one XOR.',
    code: ['in A = 1', 'in B = 0', 'nand n1(A, B)', 'nand n2(A, n1)', 'nand n3(B, n1)', 'nand n4(n2, n3)', 'out Y = n4'].join('\n') },
  { name: 'Majority vote', note: 'Output is 1 when at least two inputs are 1.',
    code: ['in A = 1', 'in B = 1', 'in C = 0', 'and ab(A, B)', 'and bc(B, C)', 'and ac(A, C)', 'or t(ab, bc)', 'or m(t, ac)', 'out Y = m'].join('\n') },
]

const DOCS = [
  'in A = 1            input, 0 or 1',
  'and g1(A, B)        gates: and or not nand nor xor',
  'out Y = g1          output fed by any part',
  '_                   leave a pin empty',
  '@x,y                optional position (the editor adds it)',
  '// text             comment',
].join('\n')

/* ================= Dashboard ================= */
const NAV = [
  { label: 'Build', items: [
    { id: 'tools', name: 'Parts & tools', icon: Wrench },
    { id: 'create', name: 'Create', icon: FilePlus },
  ] },
  { label: 'Library', items: [
    { id: 'projects', name: 'Projects', icon: Folder },
    { id: 'repo', name: 'Repository', icon: GitBranch },
  ] },
  { label: 'Circuit', items: [{ id: 'export', name: 'Export code', icon: Download }] },
  { label: 'Support', items: [{ id: 'docs', name: 'Documentation', icon: BookOpen }] },
]
const tabs = ['Code', 'Editor']

export default function Dashboard() {
  const [tab, setTab] = useState('Editor')
  const [tool, setTool] = useState('poke')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null)
  const [circuit, setCircuit] = useState(START)
  const [code, setCode] = useState(() => gen(START))
  const [err, setErr] = useState('')
  const close = () => setModal(null)

  // editor -> code: every canvas change rewrites the text
  const update = (fn) => {
    const next = fn(circuit)
    setCircuit(next)
    setCode(gen(next))
    setErr('')
  }
  // code -> editor: valid text rebuilds the canvas, invalid text keeps the last good circuit
  const onCode = (text) => {
    setCode(text)
    const r = parse(text)
    if (r.errs.length) return setErr(r.errs[0])
    setErr('')
    setCircuit({ parts: r.parts, wires: r.wires })
  }
  const load = (text) => { onCode(text); close(); setTab('Editor') }

  const exportCode = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }))
    a.download = 'circuit.stutr.txt'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const run = (id) => {
    if (id === 'create') {
      if (circuit.parts.length && !window.confirm('Start a new circuit? Unsaved changes will be lost.')) return
      return load('')
    }
    if (id === 'export') return exportCode()
    setModal(id)
  }

  return (
    <div className="DashBG">
      <aside className="Tree">
        <button className="brand" type="button">
          <span className="brand-logo">S</span>
          <span className="brand-name">Stutr</span>
        </button>

        <label className="search">
          <Search size={18} />
          <input type="text" placeholder="search" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>

        {NAV.map((s) => {
          const items = s.items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()))
          if (!items.length) return null
          return (
            <nav className="group" key={s.label}>
              <p className="group-label">{s.label}</p>
              {items.map(({ id, name, icon: Icon }) => (
                <button key={id} type="button" className={`nav-item${modal === id ? ' active' : ''}`} onClick={() => run(id)}>
                  <Icon size={20} strokeWidth={1.5} />
                  <span>{name}</span>
                  {id === 'tools' && <em className="badge">{tool}</em>}
                </button>
              ))}
            </nav>
          )
        })}
      </aside>

      <main className="Main">
        <div className="SelectionBar" role="tablist">
          {tabs.map((n) => (
            <button key={n} type="button" role="tab" aria-selected={tab === n}
              className={tab === n ? 'active' : ''} onClick={() => setTab(n)}>{n}</button>
          ))}
        </div>
        <div style={{ display: tab === 'Code' ? 'contents' : 'none' }}>
          <CodeEditor code={code} onChange={onCode} err={err} />
        </div>
        <div style={{ display: tab === 'Editor' ? 'contents' : 'none' }}>
          <Circuit circuit={circuit} update={update} tool={tool} setTool={setTool} />
        </div>
      </main>

      {modal === 'tools' && (
        <Modal title="Parts & tools" onClose={close}>
          <ToolPicker tool={tool} onPick={(t) => { setTool(t); close(); setTab('Editor') }} />
        </Modal>
      )}
      {modal === 'projects' && <Modal title="Projects" onClose={close}><Projects code={code} onOpen={load} /></Modal>}
      {modal === 'repo' && (
        <Modal title="Repository" onClose={close}>
          {EXAMPLES.map((x) => (
            <div className="item" key={x.name}>
              <div><strong>{x.name}</strong><small>{x.note}</small></div>
              <button type="button" className="btn" onClick={() => load(x.code)}>Open</button>
            </div>
          ))}
        </Modal>
      )}
      {modal === 'docs' && (
        <Modal title="Documentation" onClose={close}>
          <p className="empty">One line per part. Parts can refer to ones defined further down.</p>
          <pre className="docs">{DOCS}</pre>
        </Modal>
      )}
    </div>
  )
}