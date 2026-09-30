import { useCallback, useEffect, useRef, useState } from 'react'
import vialSprite from '../assets/aboutme/vials.png'
import trayImg from '../assets/aboutme/tray.png'
import './VialCarousel.css'

// ---------------------------------------------------------------------------
// About Me: a vertical stack of vials that the page scroll turns like a wheel.
// The vial in the middle is large and sharp; the previous / next ones sit
// around it, smaller and blurred. Scrolling glides every vial along the path
// (position, rotation, scale, blur and opacity all follow the scroll), and
// clicking the centred vial opens its detail view.
// ---------------------------------------------------------------------------

// Every vial shares the label copy from the Figma frames until real copy exists.
const YEAR = '2018.03 - 2022.06'
const PROJECT = '푸른 곰팡이 / SALON DE MAD /  '

const VIALS = ['THEATER', 'VIDEO', 'MBC', 'METLIFE', 'FELICITY', 'UX/UI'].map((name) => ({
  name,
  year: YEAR,
  project: PROJECT,
}))

// vials.png is one sprite sheet: 6 vials stacked, cap side alternating.
const SPRITE = { w: 1064, h: 1478, cw: 379, ch: 166 }
const VIAL_W = 454.8
const VIAL_H = 199.2

const spritePos = (i) => {
  const x0 = i % 2 === 0 ? 289 : 370
  const y0 = 198 + 189.4 * i
  return {
    backgroundSize: `${(SPRITE.w / SPRITE.cw) * 100}% ${(SPRITE.h / SPRITE.ch) * 100}%`,
    backgroundPosition: `${(x0 / (SPRITE.w - SPRITE.cw)) * 100}% ${(y0 / (SPRITE.h - SPRITE.ch)) * 100}%`,
  }
}

// Poses along the path for u = itemIndex - scrollPosition = -2 .. 2.
// Desktop numbers come straight from the Figma frames (1440 x 1024).
const LAYOUTS = {
  desk: {
    w: 1440,
    h: 1024,
    x: [67, 444, 821, 1198, 1575],
    y: [141, 351, 561, 771, 981],
    rot: [362.7, 221.8, 80.91, -60, -200.8],
    scale: [0.5, 0.7245, 1, 0.7245, 0.5],
    blur: [10, 6.8, 0, 6.8, 10],
    opacity: [0, 0.85, 1, 0.85, 0],
    detail: { x: 246, y: 268, rot: 0, scale: 0.65 },
  },
  port: {
    w: 720,
    h: 1280,
    x: [60, 210, 360, 510, 660],
    y: [140, 390, 640, 890, 1140],
    rot: [362.7, 221.8, 80.91, -60, -200.8],
    scale: [0.45, 0.62, 0.9, 0.62, 0.45],
    blur: [10, 6.8, 0, 6.8, 10],
    opacity: [0, 0.85, 1, 0.85, 0],
    detail: { x: 360, y: 250, rot: 0, scale: 0.62 },
  },
}

const smooth = (t) => t * t * (3 - 2 * t)
const lerp = (a, b, t) => a + (b - a) * t

function poseFor(u, L) {
  const c = Math.max(-2, Math.min(2, u)) + 2
  const i = Math.min(3, Math.floor(c))
  const t = smooth(c - i)
  return {
    x: lerp(L.x[i], L.x[i + 1], t),
    y: lerp(L.y[i], L.y[i + 1], t),
    rot: lerp(L.rot[i], L.rot[i + 1], t),
    scale: lerp(L.scale[i], L.scale[i + 1], t),
    blur: lerp(L.blur[i], L.blur[i + 1], t),
    opacity: lerp(L.opacity[i], L.opacity[i + 1], t),
  }
}

const STEP_VH = 0.9 // scroll distance (in viewport heights) between two vials
const N = VIALS.length

function VialCarousel() {
  const sectionRef = useRef(null)
  const stickyRef = useRef(null)
  const vialRefs = useRef([])
  const st = useRef({ s: 0, open: false, sel: 0, openAt: 0, portrait: false, timer: 0, tween: 0 })
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(0)
  const [size, setSize] = useState({ w: 0, h: 0 })

  const portrait = size.w > 0 && size.w / size.h < 0.85
  const L = portrait ? LAYOUTS.port : LAYOUTS.desk
  const scale = size.w && size.h ? Math.min(size.w / L.w, size.h / L.h) : 1

  // write every vial's transform straight to the DOM (no re-render per scroll tick)
  const render = useCallback(() => {
    const S = st.current
    const layout = S.portrait ? LAYOUTS.port : LAYOUTS.desk
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const frac = S.s - Math.floor(S.s)
    const motion = reduce ? 0 : 5 * Math.sin(Math.PI * frac)

    vialRefs.current.forEach((el, i) => {
      if (!el) return
      let p
      if (S.open) {
        p =
          i === S.sel
            ? { ...layout.detail, blur: 0, opacity: 1 }
            : { ...poseFor(i - S.sel, layout), opacity: 0 }
      } else {
        const u = i - S.s
        p = poseFor(u, layout)
        if (Math.abs(u) < 1.5) p.blur += motion * (1 - Math.abs(u) / 1.5)
      }
      el.style.transform =
        `translate3d(${p.x - VIAL_W / 2}px, ${p.y - VIAL_H / 2}px, 0) ` +
        `rotate(${p.rot}deg) scale(${p.scale})`
      el.style.filter = p.blur > 0.05 ? `blur(${p.blur.toFixed(2)}px)` : 'none'
      el.style.opacity = String(p.opacity)
      el.style.zIndex = String(10 - Math.round(Math.abs(i - S.s) * 2))
      el.style.pointerEvents = p.opacity < 0.2 ? 'none' : 'auto'
    })
  }, [])

  // ease vials into / out of the detail pose, then hand back to scroll-linked updates
  const tween = useCallback(() => {
    const S = st.current
    const list = stickyRef.current
    // a data attribute (not a class) so React re-renders can't wipe it
    list.dataset.tween = '1'
    window.clearTimeout(S.tween)
    S.tween = window.setTimeout(() => {
      delete list.dataset.tween
    }, 1100)
  }, [])

  const setOpenState = useCallback(
    (next, index) => {
      const S = st.current
      if (next === S.open && (index === undefined || index === S.sel)) return
      tween()
      S.open = next
      if (index !== undefined) S.sel = index
      S.openAt = window.scrollY
      setOpen(next)
      setSel(S.sel)
      render()
    },
    [render, tween],
  )

  const scrollTarget = useCallback((i) => {
    const sec = sectionRef.current
    return sec.offsetTop + i * window.innerHeight * STEP_VH
  }, [])

  const goTo = useCallback(
    (i) => {
      window.scrollTo({ top: scrollTarget(i), behavior: 'smooth' })
    },
    [scrollTarget],
  )

  // scroll -> position along the path
  useEffect(() => {
    const sec = sectionRef.current
    const S = st.current

    const onScroll = () => {
      const step = window.innerHeight * STEP_VH
      const raw = (window.scrollY - sec.offsetTop) / step
      S.s = Math.max(0, Math.min(N - 1, raw))

      // scrolling on while a detail is open closes it
      if (S.open && Math.abs(window.scrollY - S.openAt) > 40) {
        S.open = false
        tween()
        setOpen(false)
      }
      render()

      // once the wheel stops, settle so exactly one vial is centred
      window.clearTimeout(S.timer)
      S.timer = window.setTimeout(() => {
        if (S.open) return
        const range = (N - 1) * step
        const y = window.scrollY - sec.offsetTop
        if (y < 0 || y > range) return
        const target = sec.offsetTop + Math.round(y / step) * step
        if (Math.abs(target - window.scrollY) > 2) {
          window.scrollTo({ top: target, behavior: 'smooth' })
        }
      }, 170)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.clearTimeout(S.timer)
      window.clearTimeout(S.tween)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [render, tween])

  // fit size / orientation
  useEffect(() => {
    const el = stickyRef.current
    const measure = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      st.current.portrait = w / h < 0.85
      setSize({ w, h })
      render()
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [render])

  // Esc closes the detail
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && st.current.open) setOpenState(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [setOpenState])

  const onVialClick = (i) => {
    const S = st.current
    if (S.open) {
      setOpenState(false)
      return
    }
    if (Math.abs(i - S.s) < 0.25) setOpenState(true, i)
    else goTo(i)
  }

  const item = VIALS[sel]

  return (
    <section
      className="vc"
      ref={sectionRef}
      style={{ height: `calc(${(N - 1) * STEP_VH * 100}vh + 100vh)` }}
      aria-label="About Me"
    >
      <div
        className={`vc__sticky${open ? ' is-open' : ''}${portrait ? ' is-portrait' : ''}`}
        ref={stickyRef}
        onClick={(e) => {
          if (e.target === e.currentTarget || e.target.classList.contains('vc__stage')) {
            if (st.current.open) setOpenState(false)
          }
        }}
      >
        <h2 className="vc__title">About Me</h2>

        <div
          className="vc__stage"
          style={{
            width: L.w,
            height: L.h,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          {/* detail layer: tray + image slots on the right, Year / Project on the left */}
          <div className="vc__detail" aria-hidden={!open}>
            <div className="vc__group">
              <div className="vc__pop vc__pop--tray" style={{ '--d': '0.15s' }}>
                <img src={trayImg} alt="" draggable="false" className="vc__tray" />
              </div>
              <div className="vc__pop vc__pop--box vc__pop--b1" style={{ '--d': '0.35s' }}>
                <div className="vc__box" style={{ transform: 'rotate(-6.3deg)' }} />
              </div>
              <div className="vc__pop vc__pop--box vc__pop--b2" style={{ '--d': '0.5s' }}>
                <div className="vc__box" />
              </div>
              <div className="vc__pop vc__pop--box vc__pop--b3" style={{ '--d': '0.65s' }}>
                <div className="vc__box" style={{ transform: 'rotate(15deg)' }} />
              </div>
            </div>

            <div className="vc__info" style={{ '--d': '0.55s' }}>
              <span className="vc__label vc__label--year">Year</span>
              <span className="vc__value vc__value--year">{item.year}</span>
              <span className="vc__label vc__label--project">Project</span>
              <span className="vc__value vc__value--project">{item.project}</span>
            </div>
          </div>

          {VIALS.map((v, i) => (
            <button
              key={v.name}
              type="button"
              className="vc__vial"
              ref={(el) => {
                vialRefs.current[i] = el
              }}
              style={{ width: VIAL_W, height: VIAL_H, backgroundImage: `url(${vialSprite})`, ...spritePos(i) }}
              onClick={() => onVialClick(i)}
              aria-label={`${v.name} ${open && sel === i ? '상세 닫기' : '보기'}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default VialCarousel
