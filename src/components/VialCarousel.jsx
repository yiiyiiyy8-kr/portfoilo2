import { useCallback, useEffect, useRef, useState } from 'react'
import vialSprite from '../assets/aboutme/vials.png'
import trayImg from '../assets/aboutme/tray.png'
import { toggleSectionMenu } from '../sections'
import DotField from './DotField'
import './VialCarousel.css'

// ---------------------------------------------------------------------------
// About Me: a vertical stack of vials that the page scroll turns like a wheel.
// The vial in the middle is large and sharp; the previous / next ones sit
// around it, smaller and blurred. Scrolling glides every vial along the path
// (position, rotation, scale, blur and opacity all follow the scroll), and
// clicking the centred vial opens its detail view.
// ---------------------------------------------------------------------------

const VIALS = [
  { name: 'THEATER', year: '2018.03 - 2022.06', project: ['푸른 곰팡이', '어차피 겪어야 할 사랑이야기', '살롱드 매드', '경성인사이드'].join('\n') },
  { name: 'VIDEO', year: '2022.06 - 2022.11', project: ['(산대특)_영상을 활용한', '광고디자인 출판 전문가 과정'].join('\n') },
  { name: 'MBC', year: '2023.04 - 2023.06', project: '물건너 온 아빠들' },
  { name: 'METLIFE', year: '2024.04 - 2025.04', project: '메트라이프 L&D팀' },
  { name: 'FELICITY', year: '2025.05 - 2026.02', project: '펠리시티 영상팀' },
  { name: 'UX/UI', year: '2026.04 - 2026.10', project: ['AI 활용 UXUI디자인&웹기획', '프론트 엔드 부트캠프'].join('\n') },
]

// the glass colour of each vial (THEATER, VIDEO, MBC, METLIFE, FELICITY, UX/UI): its halo takes this tint
const VIAL_GLOW = ['79, 208, 220', '150, 214, 70', '240, 216, 74', '244, 152, 92', '232, 100, 106', '182, 110, 226']

const VIAL_RGB = VIAL_GLOW.map((c) => c.split(',').map(Number))

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

// the shine is only painted where the vial itself is: the sprite's alpha, cropped like the vial, is its mask
const shineMask = (i) => {
  const { backgroundSize, backgroundPosition } = spritePos(i)
  return {
    WebkitMaskImage: `url(${vialSprite})`,
    maskImage: `url(${vialSprite})`,
    WebkitMaskSize: backgroundSize,
    maskSize: backgroundSize,
    WebkitMaskPosition: backgroundPosition,
    maskPosition: backgroundPosition,
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

// The three white cards can be picked up and moved, but only across the tray photo.
// Positions are in the 1440 x 1024 design frame (centres of the cards at rest).
const BOXES = [
  { id: 'b1', rest: [1218.7, 400.7], rot: -6.3, delay: 0.35 },
  { id: 'b2', rest: [1156.7, 829.7], rot: 0, delay: 0.5 },
  { id: 'b3', rest: [850, 608], rot: 15, delay: 0.65 },
]
const TRAY = { cx: 1111, cy: 807, hw: 497 - 90, hh: 691 - 90, rot: 165 } // tray photo, inset 90px
// The vial and the Year / Project text sit on the left; a dragged card may never reach them.
// A card is kept so that its left-most corner stays right of this line (design-frame px).
const LEFT_LIMIT = 500

// ...and it may not be pushed against the top or right edge of the screen: a card's top edge
// stays under the "About Me" heading, its right edge stays close to the design's own overhang.
const TOP_LIMIT = 90
const RIGHT_EDGE_LIMIT = 1500
// ...nor sink past the bottom of the section: a card's lower edge stops at the bottom of the frame.
// (The design lets the lowest card hang ~56px over; that card keeps exactly its own overhang and
// no more, so nothing is ever dragged out of the section.)
const BOTTOM_EDGE_LIMIT = 1024 // desktop frame height
const BOTTOM_EDGE_LIMIT_PORTRAIT = 1240 // phone layout: the card cluster is scaled and offset inside a 1280-tall frame

// half the width of a card's rotated outline, so the corner (not the centre) is what we hold back
const cardHalfWidth = (rotDeg) => {
  const a = (rotDeg * Math.PI) / 180
  return 250.7 * (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a)))
}

const ELASTIC = 0.35 // how far past the tray edge a card follows the pointer before it snaps back

// nearest point of the tray for a card centre (tray is rotated, so work in its own frame)
function clampToTray(x, y) {
  const a = (TRAY.rot * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const vx = x - TRAY.cx
  const vy = y - TRAY.cy
  let lx = vx * cos + vy * sin
  let ly = -vx * sin + vy * cos
  lx = Math.max(-TRAY.hw, Math.min(TRAY.hw, lx))
  ly = Math.max(-TRAY.hh, Math.min(TRAY.hh, ly))
  return [TRAY.cx + lx * cos - ly * sin, TRAY.cy + lx * sin + ly * cos]
}

// where card i's centre may be: on the tray, clear of the left-hand objects, and (on wide screens)
// not against the top / right edge
function clampCard(i, x, y, desktop) {
  const hw = cardHalfWidth(BOXES[i].rot)
  // every layout keeps the card from sinking out of the bottom of the section
  // (desktop: a card stops at the bottom edge of the frame, or at the overhang the design already gives it)
  const maxY = desktop
    ? Math.max(BOTTOM_EDGE_LIMIT, BOXES[i].rest[1] + hw) - hw
    : BOTTOM_EDGE_LIMIT_PORTRAIT - hw
  // on phones the cluster sits low in its own frame, so only the bottom needs guarding there
  const minX = desktop ? LEFT_LIMIT + hw : -Infinity
  const maxX = desktop ? RIGHT_EDGE_LIMIT - hw : Infinity
  const minY = desktop ? TOP_LIMIT + hw : -Infinity
  let p = [x, y]
  // all the limits overlap in one convex region: a few alternating pushes land inside every one
  for (let k = 0; k < 6; k++) {
    p = clampToTray(p[0], p[1])
    p = [Math.min(maxX, Math.max(minX, p[0])), Math.min(maxY, Math.max(minY, p[1]))]
  }
  return p
}

const STEP_VH = 0.9 // scroll distance (in viewport heights) between two vials
const N = VIALS.length

function VialCarousel() {
  const sectionRef = useRef(null)
  const stickyRef = useRef(null)
  const vialRefs = useRef([])
  const dotColor = useRef([...VIAL_RGB[0]]) // what the dot field should become
  const dotWake = useRef(null)
  const dotCanvas = useRef(null)
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

    // background dots follow the glass colour of the vial in the middle (blended while scrolling between two)
    const at = S.open ? S.sel : S.s
    const i0 = Math.max(0, Math.min(VIAL_RGB.length - 1, Math.floor(at)))
    const i1 = Math.min(VIAL_RGB.length - 1, i0 + 1)
    const mix = S.open ? 0 : smooth(at - i0)
    const target = VIAL_RGB[i0].map((v, k) => lerp(v, VIAL_RGB[i1][k], mix))
    const prev = dotColor.current
    if (target.some((v, k) => Math.abs(v - prev[k]) > 0.05)) {
      dotColor.current = target
      dotWake.current?.()
    }

    vialRefs.current.forEach((el, i) => {
      if (!el) return
      let p
      let shine = 0
      if (S.open) {
        p =
          i === S.sel
            ? { ...layout.detail, blur: 0, opacity: 1 }
            : { ...poseFor(i - S.sel, layout), opacity: 0 }
        shine = i === S.sel ? 1 : 0
      } else {
        const u = i - S.s
        p = poseFor(u, layout)
        shine = Math.max(0, Math.min(1, 1 - Math.abs(u) * 2.2)) // gone as soon as it drifts off-centre
        if (Math.abs(u) < 1.5) p.blur += motion * (1 - Math.abs(u) / 1.5)
      }
      el.style.transform =
        `translate3d(${p.x - VIAL_W / 2}px, ${p.y - VIAL_H / 2}px, 0) ` +
        `rotate(${p.rot}deg) scale(${p.scale})`
      el.style.filter = p.blur > 0.05 ? `blur(${p.blur.toFixed(2)}px)` : 'none'
      el.style.opacity = String(p.opacity)
      el.style.setProperty('--shine', shine.toFixed(3))
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
      // heading interaction: on once the section is about halfway in, off again after it has left
      const { top, bottom } = sec.getBoundingClientRect()
      const vh = window.innerHeight
      const isIn = sec.hasAttribute('data-in')
      if (!isIn && top < vh * 0.4 && bottom > vh * 0.5) sec.setAttribute('data-in', '')
      else if (isIn && (top > vh * 0.8 || bottom < vh * 0.2)) sec.removeAttribute('data-in')

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

  // ---- draggable cards on the tray ----
  const groupRef = useRef(null)
  const boxRefs = useRef([])
  const zTop = useRef(BOXES.length)
  const cards = useRef(
    BOXES.map(() => ({ x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, dragging: false, sx: 0, sy: 0, ox: 0, oy: 0 })),
  )
  const cardRaf = useRef(0)
  const cardLast = useRef(0)

  const cardLoop = useCallback((now) => {
    const dt = Math.min((now - cardLast.current) / 1000, 0.034)
    cardLast.current = now
    let busy = false
    cards.current.forEach((c, i) => {
      if (c.dragging) {
        const k = 1 - Math.pow(0.0005, dt)
        c.x += (c.tx - c.x) * k
        c.y += (c.ty - c.y) * k
        c.vx = c.vy = 0
        busy = true
      } else {
        // let go: settle at the target (inside the tray) with a soft spring
        c.vx += (170 * (c.tx - c.x) - 19 * c.vx) * dt
        c.vy += (170 * (c.ty - c.y) - 19 * c.vy) * dt
        c.x += c.vx * dt
        c.y += c.vy * dt
        if (Math.abs(c.vx) + Math.abs(c.vy) > 0.03 || Math.abs(c.tx - c.x) + Math.abs(c.ty - c.y) > 0.03) busy = true
      }
      const el = boxRefs.current[i]
      if (el) el.style.translate = `${c.x.toFixed(2)}px ${c.y.toFixed(2)}px`
    })
    cardRaf.current = busy ? requestAnimationFrame(cardLoop) : 0
  }, [])

  const wakeCards = useCallback(() => {
    if (!cardRaf.current) {
      cardLast.current = performance.now()
      cardRaf.current = requestAnimationFrame(cardLoop)
    }
  }, [cardLoop])

  const onBoxDown = (e, i) => {
    if (!st.current.open) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const c = cards.current[i]
    // the card you touch comes to the front
    zTop.current += 1
    boxRefs.current[i].style.zIndex = String(zTop.current)
    // screen px -> design-frame px (stage scale and, on phones, the group's own scale)
    const g = groupRef.current.getBoundingClientRect()
    c.k = g.width / 1440 || 1
    c.dragging = true
    c.sx = e.clientX
    c.sy = e.clientY
    c.ox = c.x
    c.oy = c.y
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* pointer already gone */
    }
    e.currentTarget.classList.add('is-grabbed')
    wakeCards()
  }

  const onBoxMove = (e, i) => {
    const c = cards.current[i]
    if (!c.dragging) return
    const [rx, ry] = BOXES[i].rest
    const wantX = c.ox + (e.clientX - c.sx) / c.k
    const wantY = c.oy + (e.clientY - c.sy) / c.k
    const [cx, cy] = clampCard(i, rx + wantX, ry + wantY, !st.current.portrait)
    // inside the tray it follows exactly; past the edge it only follows a little
    c.tx = cx - rx + (rx + wantX - cx) * ELASTIC
    c.ty = cy - ry + (ry + wantY - cy) * ELASTIC
    c.wantX = wantX
    c.wantY = wantY
  }

  const onBoxUp = (e, i) => {
    const c = cards.current[i]
    if (!c.dragging) return
    c.dragging = false
    e.currentTarget.classList.remove('is-grabbed')
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    // dropped off the tray: it glides back onto the nearest spot of the photo
    const [rx, ry] = BOXES[i].rest
    const [cx, cy] = clampCard(i, rx + (c.wantX ?? c.x), ry + (c.wantY ?? c.y), !st.current.portrait)
    c.tx = cx - rx
    c.ty = cy - ry
    c.wantX = c.wantY = undefined
    wakeCards()
  }

  // closing the detail puts the cards back where the design has them
  useEffect(() => {
    if (open) return undefined
    const t = window.setTimeout(() => {
      cards.current.forEach((c, i) => {
        c.x = c.y = c.vx = c.vy = c.tx = c.ty = 0
        const el = boxRefs.current[i]
        if (el) {
          el.style.translate = ''
          el.style.zIndex = String(i + 1)
        }
      })
      zTop.current = BOXES.length
    }, 700)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => () => cancelAnimationFrame(cardRaf.current), [])

  return (
    <section
      className="vc"
      ref={sectionRef}
      style={{ height: `calc(${(N - 1) * STEP_VH * 100}vh + 150vh)` }}
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
        <canvas className="vc__dots" ref={dotCanvas} aria-hidden="true" />
        <DotField colorRef={dotColor} wakeRef={dotWake} hostRef={stickyRef} canvasRef={dotCanvas} />

        <h2 className="vc__title">
          <button
            type="button"
            className="sm-trigger"
            data-section="about"
            onClick={() => toggleSectionMenu('about')}
            aria-haspopup="menu"
            aria-label="About Me"
          >
            {[...'About Me'].map((ch, i) => (
              <span className="vc__title-char" aria-hidden="true" key={i} style={{ '--i': i }}>
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            ))}
          </button>
        </h2>

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
            <div className="vc__group" ref={groupRef}>
              <div className="vc__pop vc__pop--tray" style={{ '--d': '0.15s' }}>
                <img src={trayImg} alt="" draggable="false" className="vc__tray" />
              </div>
              {BOXES.map((b, i) => (
                <div
                  key={b.id}
                  className={`vc__pop vc__pop--box vc__pop--${b.id}`}
                  style={{ '--d': `${b.delay}s`, zIndex: i + 1 }}
                  ref={(el) => {
                    boxRefs.current[i] = el
                  }}
                >
                  <div
                    className="vc__box"
                    style={{ transform: b.rot ? `rotate(${b.rot}deg)` : undefined }}
                    onPointerDown={(e) => onBoxDown(e, i)}
                    onPointerMove={(e) => onBoxMove(e, i)}
                    onPointerUp={(e) => onBoxUp(e, i)}
                    onPointerCancel={(e) => onBoxUp(e, i)}
                  />
                </div>
              ))}
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
              style={{ width: VIAL_W, height: VIAL_H, '--glow': VIAL_GLOW[i] }}
              onClick={() => onVialClick(i)}
              aria-label={`${v.name} ${open && sel === i ? '상세 닫기' : '보기'}`}
            >
              {/* soft halo in the vial's own colour (only on the sharp vial), then the vial, then the shine */}
              <span className="vc__halo" aria-hidden="true">
                <span className="vc__halo-fill" style={shineMask(i)} />
              </span>
              <span className="vc__img" aria-hidden="true" style={{ backgroundImage: `url(${vialSprite})`, ...spritePos(i) }} />
              <span className="vc__shine" aria-hidden="true" style={shineMask(i)} />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export default VialCarousel
