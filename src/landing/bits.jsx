// Small animated building blocks in the style of React Bits (Squares, DecryptedText, Magnet, ScrollVelocity).
// They are self-contained so the project builds without extra installs. To use the official versions
// instead, copy them from reactbits.dev and swap the imports.
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* A drifting grid. The square under the pointer lights up. */
export function Squares({ size = 46, line = 'rgba(79,124,255,0.16)', hover = 'rgba(59,224,255,0.22)', speed = 0.2, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0, h = 0, off = 0, hx = -1, hy = -1, raf = 0
    const still = reduced()
    const fit = () => {
      const r = c.getBoundingClientRect()
      w = r.width; h = r.height
      c.width = w * dpr; c.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw()
    }
    function draw() {
      ctx.clearRect(0, 0, w, h)
      const s = ((off % size) + size) % size
      const cx = hx < 0 ? -9 : Math.floor((hx + s) / size)
      const cy = hy < 0 ? -9 : Math.floor((hy + s) / size)
      ctx.strokeStyle = line
      ctx.lineWidth = 1
      for (let i = 0, x = -s; x < w; i++, x += size) {
        for (let j = 0, y = -s; y < h; j++, y += size) {
          if (i === cx && j === cy) { ctx.fillStyle = hover; ctx.fillRect(x, y, size, size) }
          ctx.strokeRect(x + 0.5, y + 0.5, size, size)
        }
      }
    }
    const loop = () => { off += speed; draw(); raf = requestAnimationFrame(loop) }
    const move = (e) => {
      const r = c.getBoundingClientRect()
      hx = e.clientX - r.left; hy = e.clientY - r.top
      if (hx < 0 || hy < 0 || hx > r.width || hy > r.height) { hx = -1; hy = -1 }
      if (still) draw()
    }
    const ro = new ResizeObserver(fit)
    ro.observe(c)
    window.addEventListener('pointermove', move)
    fit()
    if (!still) loop()
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('pointermove', move) }
  }, [size, line, hover, speed])
  return <canvas ref={ref} className={`sq ${className}`} aria-hidden="true" />
}

/* Text that scrambles into place. Screen readers get the real text straight away. */
const NOISE = '01#@%&<>/|{}[]=+*'
export function Decrypt({ text, delay = 0, className = '' }) {
  const [out, setOut] = useState(text)
  useEffect(() => {
    if (reduced()) return
    let f = 0, id
    const t = setTimeout(() => {
      id = setInterval(() => {
        f++
        setOut([...text].map((ch, i) => (ch === ' ' || i < f / 1.3 ? ch : NOISE[Math.floor(Math.random() * NOISE.length)])).join(''))
        if (f > text.length * 1.3 + 1) { clearInterval(id); setOut(text) }
      }, 30)
    }, delay)
    return () => { clearTimeout(t); clearInterval(id) }
  }, [text, delay])
  return (
    <span className={className}>
      <span className="sr">{text}</span>
      <span aria-hidden="true">{out}</span>
    </span>
  )
}

/* Pulls its child toward the pointer when it gets close. */
export function Magnet({ children, strength = 0.35, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || reduced() || !window.matchMedia('(pointer: fine)').matches) return
    const qx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' })
    const qy = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' })
    const move = (e) => {
      const r = el.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      if (Math.hypot(dx, dy) < Math.max(r.width, r.height)) { qx(dx * strength); qy(dy * strength) } else { qx(0); qy(0) }
    }
    window.addEventListener('pointermove', move)
    return () => { window.removeEventListener('pointermove', move); gsap.set(el, { x: 0, y: 0 }) }
  }, [strength])
  return <span ref={ref} className={`magnet ${className}`}>{children}</span>
}

/* An endless strip that speeds up, and turns around, with your scroll. */
export function Marquee({ items }) {
  const track = useRef(null)
  useEffect(() => {
    if (reduced()) return
    const tween = gsap.to(track.current, { xPercent: -50, ease: 'none', duration: 34, repeat: -1 })
    let dir = 1
    const st = ScrollTrigger.create({
      onUpdate: (self) => {
        const v = self.getVelocity()
        if (v) dir = Math.sign(v)
        tween.timeScale(dir * (1 + Math.min(Math.abs(v) / 350, 7)))
        gsap.to(tween, { timeScale: dir, duration: 0.9, overwrite: true })
      },
    })
    return () => { st.kill(); tween.kill() }
  }, [])
  const row = (k) => items.map((t) => (
    <span className="mq-unit" key={`${k}${t}`} aria-hidden={k === 'b' ? 'true' : undefined}>
      <span className="mq-item">{t}</span><i className="mq-wire" />
    </span>
  ))
  return (
    <div className="mq" role="img" aria-label={`Parts you can use: ${items.join(', ')}`}>
      <div className="mq-track" ref={track}>{row('a')}{row('b')}</div>
    </div>
  )
}
