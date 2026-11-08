// A hand-built board, breadboard, LED, resistor and jumper wires. Each group floats at its own speed.
export default function LabArt() {
  return (
    <svg className="lab-svg" viewBox="0 0 580 520" role="img"
      aria-label="An Arduino-style board wired to a breadboard with an LED and a resistor">
      <defs>
        <pattern id="lab-holes" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="2.2" fill="#8d8470" /></pattern>
        <pattern id="lab-pins" width="12" height="12" patternUnits="userSpaceOnUse"><rect x="3" y="2" width="6" height="8" fill="#e8b04a" /></pattern>
      </defs>

      <g data-speed="6">
        <rect x="30" y="30" width="330" height="200" rx="16" fill="#0e6f73" stroke="#0a4a4d" strokeWidth="3" />
        <rect x="6" y="84" width="76" height="64" rx="4" fill="#c9c6d6" stroke="#8f8ba3" strokeWidth="2" />
        <rect x="72" y="44" width="264" height="14" fill="#0a2f31" />
        <rect x="72" y="44" width="264" height="14" fill="url(#lab-pins)" />
        <rect x="72" y="202" width="264" height="14" fill="#0a2f31" />
        <rect x="72" y="202" width="264" height="14" fill="url(#lab-pins)" />
        <rect x="160" y="100" width="120" height="58" rx="5" fill="#111" />
        <text x="220" y="135" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="15" fill="#8d8aa3">MCU</text>
        <text x="300" y="150" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#bff3f0">S-UNO</text>
        <circle cx="104" cy="170" r="5" fill="#ff5470" />
      </g>

      <g data-speed="-5">
        <rect x="160" y="290" width="390" height="210" rx="12" fill="#eee6d3" stroke="#cfc6ae" strokeWidth="2" />
        <line x1="176" y1="306" x2="534" y2="306" stroke="#d94a4a" strokeWidth="3" />
        <line x1="176" y1="484" x2="534" y2="484" stroke="#4a7bd9" strokeWidth="3" />
        <rect x="176" y="318" width="358" height="70" fill="url(#lab-holes)" />
        <rect x="176" y="402" width="358" height="70" fill="url(#lab-holes)" />
        <rect x="160" y="390" width="390" height="10" fill="#d6cdb7" />
      </g>

      <g data-speed="11">
        <line x1="308" y1="352" x2="308" y2="394" stroke="#c9c6d6" strokeWidth="3" />
        <line x1="324" y1="352" x2="324" y2="394" stroke="#c9c6d6" strokeWidth="3" />
        <path d="M300 352 V326 A16 16 0 0 1 332 326 V352 Z" fill="#ff5470" className="lab-led" />
      </g>

      <g data-speed="-9">
        <line x1="400" y1="420" x2="418" y2="420" stroke="#c9c6d6" strokeWidth="3" />
        <line x1="488" y1="420" x2="506" y2="420" stroke="#c9c6d6" strokeWidth="3" />
        <rect x="418" y="408" width="70" height="24" rx="12" fill="#d9b98a" />
        <rect x="434" y="408" width="6" height="24" fill="#6b3b1d" />
        <rect x="447" y="408" width="6" height="24" fill="#111" />
        <rect x="460" y="408" width="6" height="24" fill="#c0392b" />
      </g>

      <g fill="none" strokeWidth="7" strokeLinecap="round">
        <path className="jw" d="M130 216 C130 300 200 270 240 346" stroke="#ff7a59" pathLength="1" strokeDasharray="1 2" />
        <path className="jw" d="M210 216 C210 330 330 270 350 414" stroke="#5ee7ff" pathLength="1" strokeDasharray="1 2" />
        <path className="jw" d="M290 216 C300 260 460 250 520 330" stroke="#ffc857" pathLength="1" strokeDasharray="1 2" />
      </g>
    </svg>
  )
}
