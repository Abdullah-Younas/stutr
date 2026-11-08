// The half adder from the Examples list, drawn so a scroll timeline can build it piece by piece.
const WIRES = [
  { d: 'M92 95 H260', live: true },
  { d: 'M170 95 V235 H260', live: true },
  { d: 'M92 265 H260', live: true },
  { d: 'M215 265 V125 H260', live: true },
  { d: 'M325 110 H470', live: false }, // Sum is 0 for 1 + 1
  { d: 'M325 250 H470', live: true },
]

function Input({ cls, y, name }) {
  return (
    <g className={`hp ${cls}`}>
      <text x="30" y={y - 10} className="ld-lbl">{name}</text>
      <rect x="30" y={y} width="62" height="40" rx="8" className="ld-track on" />
      <text x="61" y={y + 27} textAnchor="middle" className="ha-val">1</text>
    </g>
  )
}

export default function HalfAdder() {
  return (
    <svg className="scene-board" viewBox="0 0 600 340" role="img"
      aria-label="A half adder: inputs A and B feed an XOR gate for the sum and an AND gate for the carry">
      <defs>
        <pattern id="ha-dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="#ffffff22" /></pattern>
      </defs>
      <rect width="600" height="340" rx="20" fill="url(#ha-dots)" />

      {WIRES.map((w, i) => (
        <g key={i}>
          <path d={w.d} pathLength="1" strokeDasharray="1 2" className="ld-base hw on" />
          {w.live && <path d={w.d} className="ld-pulse on hpulse" />}
        </g>
      ))}
      <circle cx="170" cy="95" r="5" className="hdot" />
      <circle cx="215" cy="265" r="5" className="hdot" />

      <Input cls="hp-A" y={75} name="A" />
      <Input cls="hp-B" y={245} name="B" />

      <g className="hp hp-s">
        <path d="M260 80 H295 A30 30 0 0 1 295 140 H260 Z" className="ld-gate" />
        <path d="M252 80 Q268 110 252 140" className="ld-mark" />
        <text x="292" y="168" textAnchor="middle" className="ld-name">xor</text>
      </g>
      <g className="hp hp-c">
        <path d="M260 220 H295 A30 30 0 0 1 295 280 H260 Z" className="ld-gate" />
        <text x="292" y="308" textAnchor="middle" className="ld-name">and</text>
      </g>

      <g className="hp hp-Sum">
        <circle cx="500" cy="110" r="22" className="ld-led" />
        <text x="500" y="152" textAnchor="middle" className="ld-lbl">Sum 0</text>
      </g>
      <g className="hp hp-Carry">
        <circle cx="500" cy="250" r="40" className="ld-glow on hglow" />
        <circle cx="500" cy="250" r="22" className="ld-led on" />
        <text x="500" y="292" textAnchor="middle" className="ld-lbl">Carry 1</text>
      </g>
    </svg>
  )
}
