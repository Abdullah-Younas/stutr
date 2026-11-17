import { useEffect, useMemo, useRef, useState } from 'react'
import { SMAX, SW, SH, W, blank, clamp, screenCell } from './engine'
import {
  DEPTHS, PATTERNS, SIZES, draw, fromImage, hexOk, inkOf, lutFor, pattern, rebit, resized, stroke,
} from './screen'

/* The small picture of the screen that sits inside the circuit. Drawn to a tiny canvas, shown as an SVG image. */
export function ScreenView({ c, w, h, onOpen }) {
  const sw = SW(c), sh = SH(c), bits = W(c), hex = hexOk(c.text), s = c.s
  const url = useMemo(() => {
    try {
      const cv = document.createElement('canvas')
      draw(cv, s?.px && s.w === sw && s.h === sh ? s.px : new Uint16Array(sw * sh), sw, sh, lutFor(bits, hex), 256)
      return cv.toDataURL() || ''
    } catch { return '' }
  }, [sw, sh, bits, hex, s])
  const k = screenCell(sw, sh), pw = Math.round(sw * k), ph = Math.round(sh * k)
  return (
    <>
      <rect className="scr-bezel" width={w} height={h} rx="10" />
      <image className="scr-img" href={url} x={28 + (w - 40 - pw) / 2} y={(h - ph) / 2} width={pw} height={ph} preserveAspectRatio="none" pointerEvents="none" />
      <text className="scr-size" x="8" y={h - 5}>{sw}×{sh}</text>
      <g className="scr-open" role="button" aria-label="Open screen" onPointerDown={(e) => { e.stopPropagation(); onOpen() }}>
        <rect x={w - 26} y="4" width="22" height="20" rx="6" />
        <path d={`M${w - 20} 15V10H${w - 15}M${w - 10} 13V18H${w - 15}`} />
      </g>
    </>
  )
}

/* The big view: paint with the mouse, fill, patterns, import a picture, change size and colors. */
export function ScreenStudio({ c, onChange }) {
  const w = SW(c), h = SH(c), bits = W(c), hex = hexOk(c.text), lut = lutFor(bits, hex)
  const cv = useRef(null)
  const live = useRef(null) // the buffer we are painting into, so a fast stroke never loses a dab
  const last = useRef(null)
  const file = useRef(null)
  const [zoom, setZoom] = useState(0) // 0 = fit the window
  const [brush, setBrush] = useState(1)
  const [ink, setInk] = useState(hex)
  const [erase, setErase] = useState(false)
  const [hover, setHover] = useState(null)
  const [draft, setDraft] = useState(null) // typed size, until Apply
  const [msg, setMsg] = useState('')
  const dw = draft?.w ?? w, dh = draft?.h ?? h
  const props = c.s?.px && c.s.w === w && c.s.h === h ? c.s : null

  const state = () => {
    const l = live.current
    if (l && l.w === w && l.h === h && (!props || l.px === props.px)) return l
    live.current = props || blank(w, h)
    return live.current
  }
  const emit = (st, extra) => { const next = { px: st.px, w, h, v: st.v + 1 }; live.current = next; onChange({ s: next, ...extra }) }
  const val = () => (erase ? 0 : inkOf(bits, ink))

  useEffect(() => { if (cv.current) draw(cv.current, props ? props.px : new Uint16Array(w * h), w, h, lut) }, [props, w, h, lut])

  const at = (e) => {
    const r = cv.current.getBoundingClientRect()
    return [clamp(Math.floor(((e.clientX - r.left) / r.width) * w), 0, w - 1), clamp(Math.floor(((e.clientY - r.top) / r.height) * h), 0, h - 1)]
  }
  const down = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const [x, y] = at(e), st = state()
    last.current = [x, y]
    stroke(st.px, w, h, x, y, x, y, brush, val())
    emit(st)
  }
  const move = (e) => {
    const [x, y] = at(e)
    setHover((o) => (o && o[0] === x && o[1] === y ? o : [x, y]))
    if (!last.current) return
    const st = state()
    stroke(st.px, w, h, last.current[0], last.current[1], x, y, brush, val())
    last.current = [x, y]
    emit(st)
  }
  const up = () => { last.current = null }

  const act = (fn) => () => { const st = state(); fn(st); emit(st) }
  const setSize = (nw, nh) => {
    nw = clamp(Math.round(nw) || 1, 1, SMAX); nh = clamp(Math.round(nh) || 1, 1, SMAX)
    const st = resized(state(), nw, nh)
    live.current = st
    setDraft(null)
    onChange({ n: nw, n2: nh, s: st })
  }
  const setDepth = (b) => { const st = state(); rebit(st, b); live.current = { px: st.px, w, h, v: st.v + 1 }; onChange({ bits: b, s: live.current }) }
  const pick = (v) => { if (bits <= 2) onChange({ text: v }); else setInk(v); setErase(false) }
  const load = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const img = await createImageBitmap(f)
      const st = state()
      fromImage(img, st.px, w, h, bits)
      emit(st)
      setMsg(`Loaded ${f.name}`)
    } catch { setMsg('Could not read that picture.') }
  }
  const save = () => cv.current?.toBlob((b) => {
    if (!b) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(b)
    a.download = `led-screen-${w}x${h}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  })

  const style = zoom ? { width: w * zoom } : { width: `min(100%, calc(56vh * ${w / h}))` }
  const px = hover && props ? props.px[hover[1] * w + hover[0]] : 0

  return (
    <div className="scr">
      <div className="scr-row">
        <span className="scr-lab">Size</span>
        {SIZES.filter((n) => n <= SMAX).map((n) => (
          <button key={n} type="button" className={`chip${w === n && h === n ? ' on' : ''}`} onClick={() => setSize(n, n)}>{n}</button>
        ))}
      </div>
      <div className="scr-row">
        <label className="scr-lab" htmlFor="scr-w">Custom</label>
        <input id="scr-w" type="number" min="1" max={SMAX} value={dw} aria-label="Width" onChange={(e) => setDraft({ w: e.target.value, h: dh })} />
        <span>×</span>
        <input type="number" min="1" max={SMAX} value={dh} aria-label="Height" onChange={(e) => setDraft({ w: dw, h: e.target.value })} />
        <button type="button" className="btn" disabled={!draft} onClick={() => setSize(+dw, +dh)}>Apply</button>
        <select value={bits} aria-label="Colors" onChange={(e) => setDepth(+e.target.value)}>
          {DEPTHS.map(([b, name]) => <option key={b} value={b}>{name}</option>)}
        </select>
        <select value={zoom} aria-label="Zoom" onChange={(e) => setZoom(+e.target.value)}>
          <option value={0}>Fit</option>
          {[1, 2, 4, 8, 16].map((z) => <option key={z} value={z}>{z}×</option>)}
        </select>
      </div>
      <div className="scr-row">
        <span className="scr-lab">Paint</span>
        <input type="color" value={bits <= 2 ? hex : ink} aria-label={bits <= 2 ? 'LED color' : 'Paint color'} onChange={(e) => pick(e.target.value)} />
        <button type="button" className={`chip${erase ? ' on' : ''}`} onClick={() => setErase(!erase)}>Eraser</button>
        <label className="scr-brush">Brush {brush}
          <input type="range" min="1" max={Math.min(64, Math.max(w, h))} value={brush} onChange={(e) => setBrush(+e.target.value)} />
        </label>
        <button type="button" className="btn" onClick={act((st) => st.px.fill(0))}>Clear</button>
        <button type="button" className="btn" onClick={act((st) => st.px.fill(val()))}>Fill</button>
      </div>
      <div className="scr-row">
        <span className="scr-lab">Make</span>
        {PATTERNS.map(([k, name]) => <button key={k} type="button" className="btn" onClick={act((st) => pattern(st.px, w, h, k, bits))}>{name}</button>)}
        <button type="button" className="btn" onClick={() => file.current?.click()}>Import picture</button>
        <input ref={file} type="file" accept="image/*" hidden onChange={load} />
        <button type="button" className="btn" onClick={save}>Save PNG</button>
      </div>

      <div className="scr-stage">
        <canvas ref={cv} className="scr-canvas px" style={style} aria-label={`LED screen, ${w} by ${h}. Click and drag to paint.`}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={() => { up(); setHover(null) }} />
      </div>
      <p className="scr-foot">
        {hover ? `x ${hover[0]}  y ${hover[1]}  value ${px.toString(16)}` : `${w} × ${h} = ${(w * h).toLocaleString()} LEDs`}
        {msg && <span> · {msg}</span>}
      </p>
    </div>
  )
}
