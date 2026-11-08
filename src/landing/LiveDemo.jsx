import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { reduced } from './bits'

const FN = {
  xor: (a, b) => a ^ b,
  and: (a, b) => a & b,
  or: (a, b) => a | b,
  nand: (a, b) => +!(a & b),
  nor: (a, b) => +!(a | b),
}

function Switch({ x, y, on, label, onFlip }) {
  const key = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFlip() } }
  return (
    <g className="ld-sw" role="switch" aria-checked={!!on} aria-label={`Input ${label}`} tabIndex={0} onClick={onFlip} onKeyDown={key}>
      <text x={x} y={y - 14} className="ld-lbl">{label}</text>
      <rect x={x} y={y} width="64" height="40" rx="20" className={`ld-track${on ? ' on' : ''}`} />
      <g style={{ transform: `translateX(${on ? 24 : 0}px)`, transition: 'transform .2s' }}>
        <circle cx={x + 20} cy={y + 20} r="14" className="ld-knob" />
      </g>
    </g>
  )
}

export default function LiveDemo() {
  const [a, setA] = useState(1)
  const [b, setB] = useState(0)
  const [g, setG] = useState('xor')
  const root = useRef(null)
  const y = FN[g](a, b)
  const inv = g === 'nand' || g === 'nor'
  const ox = inv ? 305 : 295

  useEffect(() => {
    if (reduced()) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.ld-base', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.2, stagger: 0.18, ease: 'power2.inOut', delay: 1 })
    }, root)
    return () => ctx.revert()
  }, [])

  const wires = [
    { d: 'M94 70 H160 V115 H230', on: a },
    { d: 'M94 190 H160 V145 H230', on: b },
    { d: `M${ox} 130 H400`, on: y },
  ]

  return (
    <div className="demo" ref={root}>
      <div className="demo-code">
        <pre aria-label="Circuit code">
          <span className="ln"><i>A</i> = input(<b key={`a${a}`}>{a}</b>)</span>
          <span className="ln"><i>B</i> = input(<b key={`b${b}`}>{b}</b>)</span>
          <span className="ln"><i>G</i> = <b key={g}>{g}</b>(A, B)</span>
          <span className="ln"><i>Y</i> = output(G)</span>
        </pre>
        <div className="tabs" role="group" aria-label="Choose a gate">
          {Object.keys(FN).map((n) => (
            <button key={n} type="button" aria-pressed={g === n} onClick={() => setG(n)}>{n}</button>
          ))}
        </div>
        <p className="demo-hint">Click a switch. Change the gate. The code keeps up.</p>
      </div>

      <svg className="demo-svg" viewBox="0 0 520 260" role="group" aria-label="Live circuit">
        {wires.map((w, i) => (
          <g key={i}>
            <path d={w.d} pathLength="1" strokeDasharray="1 2" className={`ld-base${w.on ? ' on' : ''}`} />
            <path d={w.d} className={`ld-pulse${w.on ? ' on' : ''}`} />
          </g>
        ))}
        <Switch x={30} y={50} on={a} label="A" onFlip={() => setA((v) => 1 - v)} />
        <Switch x={30} y={170} on={b} label="B" onFlip={() => setB((v) => 1 - v)} />

        <path d="M230 100 H265 A30 30 0 0 1 265 160 H230 Z" className="ld-gate" />
        {g === 'xor' && <path d="M222 100 Q238 130 222 160" className="ld-mark" />}
        {inv && <circle cx="300" cy="130" r="5" className="ld-gate" />}
        <text x="262" y="188" textAnchor="middle" className="ld-name">{g}</text>

        <circle cx="440" cy="130" r="34" className={`ld-glow${y ? ' on' : ''}`} />
        <circle cx="440" cy="130" r="22" className={`ld-led${y ? ' on' : ''}`} />
        <text x="440" y="186" textAnchor="middle" className="ld-lbl">Y = {y}</text>
      </svg>
    </div>
  )
}
