import { useEffect, useRef, useState } from 'react'
import ContactPanel from './ContactPanel'
import { scrollToSection } from '../sections'
import './Footer.css'

// ---------------------------------------------------------------------------
// Footer: a huge two-line name made of one element per letter.
//
//   .letter          - MOVE layer. Only its translate3d changes: letters dodge the
//                      cursor (pointer proximity, not hover) on springs. It is a
//                      window onto its letter, so the rise below is masked by it
//                      and dodging never cuts anything off.
//   canvas (inside)  - RISE + PARTICLE layer. Its translateY is scroll-linked
//                      (each letter starts a beat later and travels a slightly
//                      different distance). The canvas paints the glyph and the
//                      fine speckle inside it; near the cursor the speckle is
//                      nudged, independently of the letter's own movement.
//
// Letters are absolutely positioned, so moving one never shifts another.
// ---------------------------------------------------------------------------

const CYAN = '#83e2ff'
const LINES = ['JAEYOUNG', 'CHO']
const MENU = [
  { label: 'INTRO', to: 'intro' },
  { label: 'PROJECTS', to: 'projects' },
  { label: 'TOOL', to: 'tool' },
  { label: 'ABOUT ME', to: 'about' },
  { label: 'CONTECT', to: 'contact' },
]

// Figma frame is 1440 x 1024; the name scales with the window.
const FRAME = { w: 1440, blockH: 500, font: 240, spacing: 2.4, padR: 1416 }
const LINE_BOX = 250 // 240px line + 5px padding top and bottom
const BASELINE_IN_BOX = 5 + 0.864 * 240 // measured against the Figma frame

const AVOID_RADIUS = 165 // px around a letter in which the cursor starts to push it
const SPRING_K = 150
const SPRING_C = 17

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))

function Footer() {
  const [contactOpen, setContactOpen] = useState(false)
  const sectionRef = useRef(null)
  const blockRef = useRef(null)

  useEffect(() => {
    const section = sectionRef.current
    const block = blockRef.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const S = {
      W: 0, H: 0, sc: 1, dpr: 1, font: 240, ls: 2.4, pad: 34,
      letters: [], dots: null, p: reduce ? 1 : 0,
      // pointer proximity
      px: 0, py: 0, active: false, inView: false, fine: false,
      // particle nudge strength, eased 0..1
      s: 0, sTarget: 0,
      rect: { left: 0, top: 0 },
      raf: 0, last: 0,
    }

    // fixed fine dust over the whole block (global coordinates, so the texture is
    // continuous from letter to letter)
    const makeDots = () => {
      const sp = Math.max(4.2, 6 * S.sc)
      const cols = Math.ceil(S.W / sp)
      const rows = Math.ceil(S.H / sp)
      const n = cols * rows
      const xs = new Float32Array(n)
      const ys = new Float32Array(n)
      const bucket = new Uint8Array(n)
      let seed = 1234567
      const rnd = () => {
        seed = (seed * 16807) % 2147483647
        return seed / 2147483647
      }
      let k = 0
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          xs[k] = c * sp + (rnd() - 0.5) * sp * 0.7
          ys[k] = r * sp + (rnd() - 0.5) * sp * 0.7
          bucket[k] = Math.floor(rnd() * 3)
          k++
        }
      }
      S.dots = { xs, ys, bucket, n, size: Math.max(1.5, 1.9 * S.sc) }
    }

    // ---- one letter's canvas: glyph + speckle (speckle only where the glyph is) ----
    const alphas = [0.16, 0.26, 0.38]
    const drawLetter = (l, nudge) => {
      const { ctx, w, h } = l
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'source-over'
      ctx.font = `900 ${S.font}px Inter, "Helvetica Neue", Arial, sans-serif`
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = CYAN
      ctx.fillText(l.ch, S.pad, l.base)
      return // flat letters: no speckle texture

      const d = S.dots
      const R = 88 * S.sc + 26
      const push = 8 * Math.max(S.sc, 0.6)
      ctx.globalCompositeOperation = 'source-atop'
      for (let b = 0; b < 3; b++) {
        ctx.fillStyle = `rgba(36, 36, 36, ${alphas[b]})`
        ctx.beginPath()
        for (let k = 0; k < l.dotIdx.length; k++) {
          const i = l.dotIdx[k]
          if (d.bucket[i] !== b) continue
          let x = d.xs[i] - l.boxX
          let y = d.ys[i] - l.boxY
          if (nudge) {
            const dx = x - nudge.x
            const dy = y - nudge.y
            const d2 = dx * dx + dy * dy
            if (d2 < R * R) {
              const dist = Math.sqrt(d2) || 1
              const f = (1 - dist / R) ** 2 * push * nudge.s
              x += (dx / dist) * f
              y += (dy / dist) * f
            }
          }
          ctx.rect(x, y, d.size, d.size)
        }
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    // ---- build / rebuild the letter elements for the current size ----
    const layout = () => {
      S.W = block.clientWidth
      // fit the 1440 x 1024 composition inside the window: width or height, whichever runs out first
      S.sc = Math.min(S.W / FRAME.w, Math.max(window.innerHeight, 640) / 1024)
      S.H = FRAME.blockH * S.sc
      S.dpr = Math.min(window.devicePixelRatio || 1, 2)
      S.font = FRAME.font * S.sc
      S.ls = FRAME.spacing * S.sc
      S.pad = 0.14 * S.font
      block.style.marginBottom = `${50 * S.sc}px`
      block.style.height = `${S.H}px`
      block.querySelectorAll('.site-footer__letter').forEach((el) => el.remove())
      S.letters = []

      const measure = document.createElement('canvas').getContext('2d')
      measure.font = `900 ${S.font}px Inter, "Helvetica Neue", Arial, sans-serif`
      // grow the type a touch so the long line runs from 24px to 24px like the Figma frame
      const wantW = (FRAME.padR - 24) * S.sc
      const haveW = measure.measureText(LINES[0]).width + (LINES[0].length - 1) * S.ls
      const fit = clamp(wantW / haveW, 1, 1.12)
      if (fit > 1.001) {
        S.font *= fit
        S.pad = 0.14 * S.font
        measure.font = `900 ${S.font}px Inter, "Helvetica Neue", Arial, sans-serif`
      }
      S.baseline = (5 + 0.864 * 240 * (S.font / (FRAME.font * S.sc))) * S.sc
      makeDots()

      let gi = 0
      LINES.forEach((text, li) => {
        const width = measure.measureText(text).width + (text.length - 1) * S.ls
        // right edge: 24px (14 + 10 padding in the Figma frame) in from the window edge
        const xr = S.W - (FRAME.w - FRAME.padR) * S.sc - S.ls
        const left = xr - width
        const top = li * LINE_BOX * S.sc
        const boxH = LINE_BOX * S.sc
        ;[...text].forEach((ch, i) => {
          const x = left + measure.measureText(text.slice(0, i)).width + i * S.ls
          const adv = measure.measureText(ch).width + S.ls
          const boxX = x - S.pad
          const boxW = adv + S.pad * 2

          const el = document.createElement('span')
          el.className = 'site-footer__letter'
          el.setAttribute('aria-hidden', 'true')
          el.style.cssText = `left:${boxX}px;top:${top}px;width:${boxW}px;height:${boxH}px;`
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(boxW * S.dpr)
          canvas.height = Math.round(boxH * S.dpr)
          canvas.style.width = `${boxW}px`
          canvas.style.height = `${boxH}px`
          el.appendChild(canvas)
          block.appendChild(el)
          const ctx = canvas.getContext('2d')
          ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0)

          // which speckles fall inside this letter's box
          const d = S.dots
          const idx = []
          for (let k = 0; k < d.n; k++) {
            if (d.xs[k] >= boxX - 12 && d.xs[k] <= boxX + boxW + 12 && d.ys[k] >= top - 12 && d.ys[k] <= top + boxH + 12) {
              idx.push(k)
            }
          }

          const letter = {
            ch, el, canvas, ctx, w: boxW, h: boxH, boxX, boxY: top,
            base: S.baseline,
            cx: boxX + boxW / 2, // rest centre, block coordinates
            cy: top + boxH / 2,
            half: 0.5 * (adv - S.ls) * 0.9, // roughly half the glyph's width
            line: li, gi: gi++, lineDelay: li * 0.06,
            dotIdx: Int32Array.from(idx),
            x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, nudged: false,
          }
          drawLetter(letter, null)
          S.letters.push(letter)
        })
      })

      S.fine = window.matchMedia('(pointer: fine)').matches && S.W > 700
      applyReveal()
    }

    // ---- scroll-linked rise: each letter starts a beat later and travels a slightly different distance ----
    const letterOffset = (l) => {
      if (reduce) return 0
      const delay = l.gi * 0.04 + l.lineDelay
      const local = clamp((S.p - delay) / 0.5)
      const e = 1 - Math.pow(1 - local, 3)
      const travel = S.font * 1.12 * (1 + 0.09 * Math.sin(l.gi * 2.1))
      return (1 - e) * travel
    }
    const applyReveal = () => {
      S.letters.forEach((l) => {
        l.canvas.style.transform = `translate3d(0, ${letterOffset(l).toFixed(2)}px, 0)`
      })
    }
    const onScroll = () => {
      const { top, bottom } = section.getBoundingClientRect()
      const vh = window.innerHeight
      // 0 when the footer's top is 80% of the way down the window, 1 the moment it is pinned:
      // every letter has finished rising by then, so a footer at rest is never half-revealed
      if (!reduce) S.p = clamp((0.8 * vh - top) / (0.8 * vh))
      // how much of the window the rising footer already covers, for the section underneath
      const about = document.querySelector('.vc')
      if (about) about.style.setProperty('--cover', clamp((vh - top) / vh).toFixed(3))
      applyReveal()

      // pointer maths only runs while the footer is actually on screen
      const visible = top < vh && bottom > 0
      if (visible && !S.inView) {
        S.inView = true
        attach()
      } else if (!visible && S.inView) {
        S.inView = false
        detach()
      }
    }

    // ---- pointer proximity: springs move the letters, the loop runs only while needed ----
    const step = (now) => {
      const dt = Math.min((now - S.last) / 1000, 0.034)
      S.last = now
      const r = block.getBoundingClientRect()
      S.rect.left = r.left
      S.rect.top = r.top
      const R = AVOID_RADIUS * Math.max(S.sc, 0.85)
      const maxPush = 0.26 * S.font

      // 1) where does the cursor want each letter to go?
      const want = S.letters.map((l) => {
        if (!S.active) return { x: 0, y: 0 }
        const cx = S.rect.left + l.cx
        const cy = S.rect.top + l.cy
        const dx = cx - S.px
        const dy = cy - S.py
        const dc = Math.hypot(dx, dy) || 1
        // distance from the cursor to the letter's edge, so it starts dodging before contact
        const de = Math.max(0, dc - l.half)
        const k = de < R ? (1 - de / R) ** 2 : 0
        return { x: (dx / dc) * maxPush * k, y: (dy / dc) * maxPush * k }
      })
      // 2) neighbours on the same line follow a little, so the word moves as one body
      S.letters.forEach((l, i) => {
        let ax = want[i].x
        let ay = want[i].y
        const prev = S.letters[i - 1]
        const next = S.letters[i + 1]
        if (prev && prev.line === l.line) {
          ax += want[i - 1].x * 0.18
          ay += want[i - 1].y * 0.18
        }
        if (next && next.line === l.line) {
          ax += want[i + 1].x * 0.18
          ay += want[i + 1].y * 0.18
        }
        l.tx = ax
        l.ty = ay
      })

      // 3) springs (position only: no rotation, no flipping)
      let moving = false
      S.letters.forEach((l) => {
        l.vx += (SPRING_K * (l.tx - l.x) - SPRING_C * l.vx) * dt
        l.vy += (SPRING_K * (l.ty - l.y) - SPRING_C * l.vy) * dt
        l.x += l.vx * dt
        l.y += l.vy * dt
        if (Math.abs(l.vx) + Math.abs(l.vy) > 0.02 || Math.abs(l.tx - l.x) + Math.abs(l.ty - l.y) > 0.02) moving = true
        l.el.style.transform = `translate3d(${l.x.toFixed(2)}px, ${l.y.toFixed(2)}px, 0)`
      })

      // 4) particle layer: speckle nudge, eased in and out separately from the letters
      S.sTarget = S.active ? 1 : 0
      S.s += (S.sTarget - S.s) * (1 - Math.pow(0.88, dt * 60))
      const nudging = S.s > 0.004
      const nr = 88 * S.sc + 26
      S.letters.forEach((l) => {
        if (nudging && S.active) {
          const lx = S.px - (S.rect.left + l.boxX + l.x)
          const ly = S.py - (S.rect.top + l.boxY + l.y)
          const near = lx > -nr && lx < l.w + nr && ly > -nr && ly < l.h + nr
          if (near) {
            drawLetter(l, { x: lx, y: ly, s: S.s })
            l.nudged = true
          } else if (l.nudged) {
            drawLetter(l, null)
            l.nudged = false
          }
        } else if (l.nudged) {
          // pointer gone: let the speckle settle back as the strength fades
          if (nudging) drawLetter(l, { x: -1e4, y: -1e4, s: 0 })
          else {
            drawLetter(l, null)
            l.nudged = false
          }
        }
      })

      S.raf = S.active || moving || nudging ? requestAnimationFrame(step) : 0
    }
    const wake = () => {
      if (!S.raf) {
        S.last = performance.now()
        S.raf = requestAnimationFrame(step)
      }
    }

    // pointer events are only listened to while the footer is on screen
    const onMove = (e) => {
      if (!S.fine || reduce || e.pointerType === 'touch') return
      S.px = e.clientX
      S.py = e.clientY
      S.active = true
      wake()
    }
    const onOut = () => {
      S.active = false
      wake()
    }
    const attach = () => {
      window.addEventListener('pointermove', onMove, { passive: true })
      document.documentElement.addEventListener('pointerleave', onOut)
      window.addEventListener('blur', onOut)
    }
    const detach = () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onOut)
      window.removeEventListener('blur', onOut)
      onOut()
    }
    layout()
    onScroll()
    // Inter must be loaded before the first real measurement
    let dead = false
    document.fonts?.load('900 100px Inter').then(() => {
      if (dead) return
      layout()
      onScroll()
    })

    const ro = new ResizeObserver(() => {
      layout()
      onScroll()
    })
    ro.observe(block)
    const onResize = () => {
      layout()
      onScroll()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)

    return () => {
      dead = true
      cancelAnimationFrame(S.raf)
      ro.disconnect()
      if (S.inView) detach()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <footer className="site-footer" ref={sectionRef} aria-label="푸터">
      <div className="site-footer__pin">
        <button
          type="button"
          className="site-footer__tab"
          onClick={() => setContactOpen(true)}
          aria-haspopup="dialog"
          aria-label="contect"
        >
          <span className="site-footer__tab-text" aria-hidden="true">contect</span>
        </button>
        {contactOpen && <ContactPanel onClose={() => setContactOpen(false)} />}

        <div className="site-footer__name" ref={blockRef}>
          <h2 className="site-footer__sr">JAEYOUNG CHO</h2>
        </div>

        <div className="site-footer__rule" aria-hidden="true" />

        <nav className="site-footer__bar" aria-label="푸터 메뉴">
          <ul className="site-footer__menu">
            {MENU.map((item) => (
              <li key={item.label}>
                <button type="button" onClick={() => (item.to === 'contact' ? setContactOpen(true) : scrollToSection(item.to))}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          <span className="site-footer__year">2026</span>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
