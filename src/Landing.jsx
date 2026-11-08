import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { FooterLinks } from './pages/PageShell'
import { usePageMeta } from './lib/meta'
import { Decrypt, Magnet, Squares, reduced } from './landing/bits'
import LiveDemo from './landing/LiveDemo'
import HalfAdder from './landing/HalfAdder'
import LabArt from './landing/LabArt'
import Nav from './landing/Nav'
import './landing.css'

gsap.registerPlugin(ScrollTrigger)

const HEAD = ['Write', 'logic,', 'not', 'wires.']
const HA_CODE = ['A = input(1)', 'B = input(1)', 's = xor(A, B)', 'c = and(A, B)', 'Sum = output(s)', 'Carry = output(c)']

const FEATURES = [
  { t: 'Code and canvas stay in sync', p: 'Edit the text and the circuit redraws. Drag a part and the code follows. Undo and redo cover both.',
    code: 'A = input(1)\nn = not(A)\nY = output(n)' },
  { t: 'Buses of any width', p: 'Add <4> to a part to make it a 4-bit bus. Adders, muxes, registers and shifters all take a width.',
    code: 'A = input<4>(5)\nB = input<4>(3)\ns = add<4>(A, B)\nSum = output<4>(s.sum)' },
  { t: 'A clock you control', p: 'Press Run to start the clock, choose how fast it ticks, or poke it by hand. Flip-flops, counters and RAM all follow it.',
    code: 'ck = clock()\nf = dff(f.nq, ck)\nQ = output(f)' },
  { t: 'A whole CPU, from the same lines', p: 'Open the Mini CPU from Examples: a 4-bit accumulator machine with a program in ROM. It uses the same few parts as everything else.',
    code: 'pc  = register<4>(npc, ck)\ninc = add<4>(pc, one)\nnpc = mux<4>(inc, imm, take)' },
  { t: 'Your work stays yours', p: 'Projects save in this browser, or sync to your account when you sign in. Export any circuit as a plain text file.',
    code: '# circuit.stutr.txt\nA = input(1)\nY = output(A)' },
]

export default function Landing() {
  usePageMeta('/')
  const h1 = useRef(null)
  const probe = useRef(null)

  useEffect(() => {
    const still = reduced()
    const lenis = new Lenis({ anchors: true, smoothWheel: !still, duration: 1.2 })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    document.fonts?.ready.then(() => ScrollTrigger.refresh())

    const fine = window.matchMedia('(pointer: fine)').matches
    const cleanups = []

    const ctx = gsap.context(() => {
      if (still) return

      // The one orchestrated entrance: headline letters rise, then the copy and demo follow.
      gsap.from('.ch', { yPercent: 115, rotate: 7, duration: 1.1, ease: 'expo.out', stagger: 0.035, delay: 0.1 })
      gsap.from('.hero-copy > *, .demo', { autoAlpha: 0, y: 28, duration: 0.9, ease: 'power3.out', stagger: 0.12, delay: 0.75 })

      // Pinned scene: code lines type in, parts appear, wires draw, signals run.
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: '.scene', start: 'top top', end: '+=2400', pin: true, scrub: 0.6 },
      })
      gsap.set('.cl', { autoAlpha: 0, x: -14 })
      gsap.set('.hp', { autoAlpha: 0, scale: 0.6, transformOrigin: '50% 50%' })
      gsap.set('.hw', { strokeDashoffset: 1 })
      gsap.set('.hdot, .hpulse, .hglow', { autoAlpha: 0 })
      gsap.set('.steps p', { autoAlpha: 0 })
      gsap.set('.steps p:nth-child(1)', { autoAlpha: 1 })
      tl.to('.cl', { autoAlpha: 1, x: 0, stagger: 0.5, duration: 0.5 }, 0)
        .to('.hp', { autoAlpha: 1, scale: 1, stagger: 0.5, duration: 0.5 }, 0.15)
        .to('.steps p:nth-child(1)', { autoAlpha: 0, duration: 0.4 }, 3.5)
        .to('.steps p:nth-child(2)', { autoAlpha: 1, duration: 0.4 }, 3.7)
        .to('.hw', { strokeDashoffset: 0, stagger: 0.35, duration: 0.8 }, 3.7)
        .to('.hdot', { autoAlpha: 1, duration: 0.3 }, 4.9)
        .to('.steps p:nth-child(2)', { autoAlpha: 0, duration: 0.4 }, 6.8)
        .to('.steps p:nth-child(3)', { autoAlpha: 1, duration: 0.4 }, 7)
        .to('.hpulse', { autoAlpha: 1, duration: 0.5 }, 7)
        .to('.hglow', { autoAlpha: 1, duration: 0.5 }, 7.6)
        .to({}, { duration: 1.6 })

      // Feature chips drop onto the board as they arrive.
      gsap.utils.toArray('.chip').forEach((el) => {
        gsap.from(el, {
          autoAlpha: 0, y: 80, rotateX: -22, transformOrigin: '50% 100%', duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        })
      })

      // Hardware lab: parts drift at their own speed, jumper wires draw as you scroll.
      gsap.utils.toArray('[data-speed]').forEach((el) => {
        gsap.to(el, { y: -parseFloat(el.dataset.speed) * 12, ease: 'none',
          scrollTrigger: { trigger: '.lab', start: 'top bottom', end: 'bottom top', scrub: true } })
      })
      gsap.fromTo('.jw', { strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: 0.25, ease: 'none',
        scrollTrigger: { trigger: '.lab-art', start: 'top 75%', end: 'bottom 55%', scrub: true } })

      if (fine) {
        // Headline letters pinch under the pointer.
        const chars = h1.current.querySelectorAll('.ch')
        let queued = false
        const pinch = (e) => {
          if (queued) return
          queued = true
          requestAnimationFrame(() => {
            queued = false
            chars.forEach((c) => {
              const r = c.getBoundingClientRect()
              const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2))
              const k = Math.max(0, 1 - d / 260)
              c.style.fontVariationSettings = `"wdth" ${100 - 25 * k}, "wght" ${700 + 100 * k}`
            })
          })
        }
        window.addEventListener('pointermove', pinch)
        cleanups.push(() => window.removeEventListener('pointermove', pinch))

        // A small probe ring follows the pointer and grows over anything clickable.
        const qx = gsap.quickTo(probe.current, 'x', { duration: 0.25, ease: 'power3.out' })
        const qy = gsap.quickTo(probe.current, 'y', { duration: 0.25, ease: 'power3.out' })
        const move = (e) => { qx(e.clientX); qy(e.clientY) }
        const over = (e) => gsap.to(probe.current, { scale: e.target.closest?.('a,button,[role="switch"]') ? 2.2 : 1, duration: 0.2 })
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerover', over)
        cleanups.push(() => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerover', over) })
      }
    })

    return () => {
      cleanups.forEach((f) => f())
      ctx.revert()
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [])

  return (
    <div className="lp">
      <div className="probe" ref={probe} aria-hidden="true" />
      <Nav home />

      <main id="main" tabIndex={-1}>
        <section className="hero">
          <Squares />
          <h1 ref={h1} aria-label="Write logic, not wires.">
            {HEAD.map((w) => (
              <span className="word" key={w} aria-hidden="true">
                {[...w].map((c, i) => <span className="ch" key={i}>{c}</span>)}
              </span>
            ))}
          </h1>
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="slogan"><Decrypt text="Where circuits come alive." delay={900} /></p>
              <p>Stutr is a code-based alternative to Logisim. Type one line per part, or drag parts onto the canvas. Both stay in sync, and everything runs in your browser.</p>
              <div className="cta-row">
                <Magnet><Link to="/start" className="cta">Start Building</Link></Magnet>
                <a href="#how" className="ghost-link">See how it works</a>
              </div>
            </div>
            <LiveDemo />
          </div>
        </section>

        <section className="scene" id="how" aria-labelledby="how-h">
          <div className="scene-copy">
            <h2 id="how-h">One line per part. The wiring draws itself.</h2>
            <div className="steps">
              <p>Type a line for each part: two inputs, two gates, two outputs.</p>
              <p>Wires route themselves from the names you used.</p>
              <p>Press Run. Signals travel, and the Carry light comes on because 1 + 1 carries.</p>
            </div>
            <pre className="scene-code" aria-label="Half adder code">
              {HA_CODE.map((l) => <span className="cl" key={l}>{l}</span>)}
            </pre>
          </div>
          <HalfAdder />
        </section>

        <section className="feat" aria-labelledby="feat-h">
          <div className="feat-head">
            <h2 id="feat-h">Made for how you think about logic</h2>
            <p>Start with a single gate. Keep going until it is a computer.</p>
          </div>
          <div className="feat-list">
            {FEATURES.map((f, i) => (
              <article className="chip" key={f.t} style={{ marginLeft: i % 2 ? 'clamp(0px, 4vw, 64px)' : 0 }}>
                <span className="notch" aria-hidden="true" />
                <h3>{f.t}</h3>
                <p>{f.p}</p>
                <pre>{f.code}</pre>
              </article>
            ))}
          </div>
        </section>

        <section className="lab" id="lab" aria-labelledby="lab-h">
          <div className="lab-grid">
            <div>
              <h2 id="lab-h">Skip the shopping list.</h2>
              <p>Soon you will design for real hardware without buying any. Wire up an Arduino, a breadboard and a bag of LEDs on screen, write the sketch and watch it run. Nothing burns out and no jumper wire goes missing.</p>
              <ul className="soon-list">
                <li>Arduino boards <span className="tag">Coming soon</span></li>
                <li>Breadboards <span className="tag">Coming soon</span></li>
                <li>LEDs, resistors and jumper wires <span className="tag">Coming soon</span></li>
              </ul>
            </div>
            <div className="lab-art"><LabArt /></div>
          </div>
        </section>

        <section className="final" aria-labelledby="final-h">
          <h2 id="final-h">Build your first gate in a minute.</h2>
          <Magnet strength={0.4}><Link to="/start" className="cta big">Start Building</Link></Magnet>
          <p><Link to="/pricing" className="ghost-link">See pricing</Link></p>
        </section>
      </main>

      <footer className="lp-foot">
        <span className="mono">Stutr, code to circuit</span>
        <FooterLinks className="entry-links" />
      </footer>
    </div>
  )
}
