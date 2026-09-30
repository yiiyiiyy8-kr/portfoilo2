import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './PaperOverlay.css'

// ---------------------------------------------------------------------------
// A paper sheet that rises over the intro (which blurs behind it). It can be
// grabbed with mouse or finger and dragged around; let go and it springs back
// to the middle. Close it with the X, the backdrop, Esc, or by tossing it down.
// ---------------------------------------------------------------------------

const PAPER = 573.618 // Figma paper size
const PAPER_COLOR = '#D1ECF4'
const X_COLOR = '#1AC9FF'
const X_PATH =
  'M534.139 36.1465L524.092 26.4613L525.307 25.2016L535.352 34.8886L545.039 24.8412L546.297 26.0558L536.61 36.1014L546.657 45.7867L545.445 47.0446L535.397 37.3611L525.712 47.4084L524.452 46.1939L534.139 36.1465Z'
const TILT = -6.3 // degrees, from the Figma frame
const EXIT_MS = 620

function frameSize() {
  const w = window.innerWidth
  const h = window.innerHeight
  const portrait = w / h < 0.85
  if (portrait) {
    const p = Math.min(w * 0.86, h * 0.62)
    return { p, ox: 0, oy: 0 }
  }
  const s = Math.min(w / 1440, h / 1024)
  // Figma: paper centre sits at (757, 476) in the 1440 x 1024 frame
  return { p: PAPER * s, ox: (757 - 720) * s, oy: (476 - 512) * s }
}

function PaperOverlay({ onClose }) {
  const backdropRef = useRef(null)
  const paperRef = useRef(null)
  const [layout, setLayout] = useState(frameSize)
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const [entered, setEntered] = useState(false)
  const startY = useRef(window.innerHeight * 0.7 + frameSize().p)
  const initialTransform = useRef(`translate3d(0px, ${startY.current}px, 0) rotate(${TILT}deg)`)
  const S = useRef({
    x: 0, y: 0, vx: 0, vy: 0,
    dragging: false, gx: 0, gy: 0, tx: 0, ty: 0, sx: 0, sy: 0, downOnX: false,
    closing: false, exitAt: 0, exitX: 0, exitY: 0,
    raf: 0, last: 0,
  })

  const requestClose = useCallback(() => {
    const s = S.current
    if (s.closing) return
    s.closing = true
    s.dragging = false
    s.exitAt = performance.now()
    s.exitX = s.x
    s.exitY = s.y
    setEntered(false)
    window.setTimeout(onClose, EXIT_MS)
  }, [onClose])

  useEffect(() => {
    const onResize = () => setLayout(frameSize())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // lock the page in place without touching the scrollbar (no layout shift)
  useEffect(() => {
    const el = backdropRef.current
    const stop = (e) => e.preventDefault()
    const onKey = (e) => {
      if (e.key === 'Escape') {
        requestClose()
      } else if ([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault()
      }
    }
    el.addEventListener('wheel', stop, { passive: false })
    el.addEventListener('touchmove', stop, { passive: false })
    document.addEventListener('keydown', onKey)
    const t = window.setTimeout(() => setEntered(true), 30) // lets the blur transition run from 0
    return () => {
      el.removeEventListener('wheel', stop)
      el.removeEventListener('touchmove', stop)
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(t)
    }
  }, [requestClose])

  // motion loop: spring up on entry, follow the pointer while dragged, spring back after
  useEffect(() => {
    const s = S.current
    s.y = startY.current
    s.last = performance.now()

    const step = (now) => {
      const dt = Math.min((now - s.last) / 1000, 0.034)
      s.last = now

      if (s.closing) {
        // ease down and away
        const t = Math.min((now - s.exitAt) / EXIT_MS, 1)
        const ease = t * t * (3 - 2 * t)
        s.y = s.exitY + ease * (window.innerHeight * 0.75 + layoutRef.current.p - s.exitY)
        s.x = s.exitX * (1 - ease)
      } else if (s.dragging) {
        // follow the finger, slightly smoothed
        const k = 1 - Math.pow(0.0009, dt)
        const px = s.x
        const py = s.y
        s.x += (s.tx - s.x) * k
        s.y += (s.ty - s.y) * k
        s.vx = (s.x - px) / Math.max(dt, 0.001)
        s.vy = (s.y - py) / Math.max(dt, 0.001)
      } else {
        // spring to rest: lively enough to feel alive, not bouncy
        const kS = 130
        const cS = 17
        s.vx += (-kS * s.x - cS * s.vx) * dt
        s.vy += (-kS * s.y - cS * s.vy) * dt
        s.x += s.vx * dt
        s.y += s.vy * dt
      }

      const el = paperRef.current
      if (el) {
        const lean = Math.max(-5, Math.min(5, s.vx * 0.0016))
        el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) rotate(${TILT + lean}deg)`
      }
      s.raf = requestAnimationFrame(step)
    }
    s.raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(s.raf)
  }, [])

  // ---- dragging (mouse and touch share pointer events) ----
  const onPointerDown = (e) => {
    const s = S.current
    if (s.closing) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    s.dragging = true
    s.downOnX = Boolean(e.target.closest?.('.paper__x'))
    s.sx = e.clientX
    s.sy = e.clientY
    s.gx = e.clientX - s.x
    s.gy = e.clientY - s.y
    s.tx = s.x
    s.ty = s.y
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* pointer already gone */
    }
    e.currentTarget.classList.add('is-grabbed')
  }

  const onPointerMove = (e) => {
    const s = S.current
    if (!s.dragging) return
    s.tx = e.clientX - s.gx
    s.ty = e.clientY - s.gy
  }

  const onPointerUp = (e) => {
    const s = S.current
    if (!s.dragging) return
    s.dragging = false
    e.currentTarget.classList.remove('is-grabbed')
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    // a tap on the X closes; pulling the sheet well below and letting go fast does too
    const travelled = Math.hypot(e.clientX - s.sx, e.clientY - s.sy)
    if (s.downOnX && travelled < 8) {
      requestClose()
    } else if (s.y > layoutRef.current.p * 0.55 && s.vy > 500) {
      requestClose()
    }
  }

  const { p, ox, oy } = layout

  return createPortal(
    <div
      className={`paper-overlay${entered ? ' is-in' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="종이"
    >
      <div
        className="paper-overlay__backdrop"
        ref={backdropRef}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) requestClose()
        }}
      />

      <div
        className="paper-overlay__anchor"
        style={{ width: p, height: p, marginLeft: -p / 2 + ox, marginTop: -p / 2 + oy }}
      >
        <div
          className="paper"
          ref={paperRef}
          style={{ width: p, height: p, background: PAPER_COLOR, transform: initialTransform.current }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <svg
            className="paper__mark"
            viewBox={`0 0 ${PAPER} ${PAPER}`}
            aria-hidden="true"
          >
            <path d={X_PATH} fill={X_COLOR} fillRule="evenodd" />
          </svg>
          {/* keyboard / screen-reader close, sitting over the X */}
          <button
            type="button"
            className="paper__x"
            aria-label="닫기"
            onClick={requestClose}
            style={{ left: `${(535.4 / PAPER) * 100}%`, top: `${(36.1 / PAPER) * 100}%` }}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default PaperOverlay
