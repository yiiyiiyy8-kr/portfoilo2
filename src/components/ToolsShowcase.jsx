import { useCallback, useEffect, useRef, useState } from 'react'
import toolBg from '../assets/desktop9/tool-bg.png'
import './ToolsShowcase.css'

// Each frame is the 1440 x 1024 Figma frame; the whole strip is dragged
// sideways and snaps so exactly one frame is fitted to the window.
const FRAME_W = 1440
const FRAME_H = 1024

// Clicking a tool name reveals its description underneath (one open at a time).
const frames = [
  {
    id: 'design',
    intro: true,
    category: 'DESIGN',
    blockLeft: 75,
    initialOpen: 0,
    tools: [
      {
        name: 'Figma',
        description: [
          'Figma에서 오토 레이아웃, 컴포넌트, 프로토타이핑을 익혔습니다.',
          '이를 활용해 와이어프레임부터 최종 UI까지 제작하고, 화면 간 사용 흐름을 직접 확인할 수 있습니다.',
        ],
      },
      {
        name: 'Photoshop',
        description: [
          'Photoshop에서 이미지 보정, 합성, 색상 조절 기능을 익혔습니다.',
          '이를 활용해 프로젝트의 분위기에 맞는 비주얼과 웹 콘텐츠 이미지를 제작할 수 있습니다.',
        ],
      },
      {
        name: 'Illustrator',
        description: [
          'Illustrator에서 벡터 드로잉, 도형 편집, 패스 활용 방법을 익혔습니다.',
          '이를 활용해 로고와 아이콘, 그래픽 요소를 제작하고 다양한 크기로 확장할 수 있습니다.',
        ],
      },
    ],
  },
  {
    id: 'motion',
    category: 'MOTION',
    blockLeft: 56,
    footerLeft: 51,
    tools: [
      {
        name: 'After Effects',
        description: [
          'After Effects에서 키프레임, 모션 그래픽, 화면 전환 효과를 익혔습니다.',
          '이를 활용해 UI 인터랙션과 서비스의 흐름을 보여주는 모션 영상을 제작할 수 있습니다.',
        ],
      },
      {
        name: 'Premiere Pro',
        description: [
          'Premiere Pro에서 영상 편집, 자막, 사운드 조절 방법을 익혔습니다.',
          '이를 활용해 프로젝트의 과정과 주요 기능을 효과적으로 전달하는 영상을 제작할 수 있습니다.',
        ],
      },
    ],
  },
  {
    id: 'ai',
    category: 'AI',
    blockLeft: 56,
    footerLeft: 51,
    blur: true,
    tools: [
      {
        name: 'Midjourney',
        description: [
          'Midjourney에서 프롬프트를 활용한 이미지 생성과 스타일 탐색 방법을 익혔습니다.',
          '이를 활용해 프로젝트 콘셉트에 맞는 비주얼을 탐색하고 디자인 아이디어를 구체화할 수 있습니다.',
        ],
      },
      {
        name: 'Claude',
        description: [
          'Claude를 활용해 아이디어 정리, 콘텐츠 구조화, 코드 작성 과정을 경험했습니다.',
          '이를 통해 기획 내용을 구체화하고 디자인 구현 과정의 문제를 효율적으로 해결할 수 있습니다.',
        ],
      },
    ],
  },
]


const LENS = 168
const MAP_SIZE = 256
const DISPLACE = 110

// Displacement map for a convex glass lens: content is magnified in the
// middle and bends hard at the rim. Encoded as R = x offset, G = y offset.
function buildLensMap() {
  const c = document.createElement('canvas')
  c.width = c.height = MAP_SIZE
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(MAP_SIZE, MAP_SIZE)
  const half = MAP_SIZE / 2
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const nx = (x + 0.5 - half) / half
      const ny = (y + 0.5 - half) / half
      const r = Math.hypot(nx, ny)
      let dx = 0
      let dy = 0
      if (r < 1) {
        const bulge = -(1 - r * r) * 0.9 // magnify: sample nearer the centre
        const rim = Math.max(0, (r - 0.82) / 0.18) ** 2 * 0.8 // bend at the edge
        const k = bulge + rim
        dx = nx * k
        dy = ny * k
      }
      const o = (y * MAP_SIZE + x) * 4
      img.data[o] = Math.round(128 + dx * 127)
      img.data[o + 1] = Math.round(128 + dy * 127)
      img.data[o + 2] = 128
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL()
}

// Fluid-glass cursor: a lens that trails the pointer with inertia, stretches
// with speed and refracts (with a little chromatic split) what is beneath it.
function FluidGlass({ viewportRef, dragging }) {
  const lensRef = useRef(null)
  const [mapUrl, setMapUrl] = useState('')

  useEffect(() => {
    setMapUrl(buildLensMap())
  }, [])

  useEffect(() => {
    const vp = viewportRef.current
    const lens = lensRef.current
    if (!vp || !lens) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const st = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, inside: false, raf: 0 }

    const tick = () => {
      const px = st.x
      const py = st.y
      st.x += (st.tx - st.x) * (reduce ? 1 : 0.16)
      st.y += (st.ty - st.y) * (reduce ? 1 : 0.16)
      st.vx = st.vx * 0.8 + (st.x - px) * 0.2
      st.vy = st.vy * 0.8 + (st.y - py) * 0.2
      const speed = Math.hypot(st.vx, st.vy)
      const stretch = Math.min(speed * 0.045, 0.28)
      const angle = Math.atan2(st.vy, st.vx)
      lens.style.transform =
        `translate3d(${st.x - LENS / 2}px, ${st.y - LENS / 2}px, 0) ` +
        `rotate(${angle}rad) scale(${1 + stretch}, ${1 - stretch * 0.6}) rotate(${-angle}rad)`
      const moving = speed > 0.02 || Math.abs(st.tx - st.x) > 0.3 || Math.abs(st.ty - st.y) > 0.3
      st.raf = moving || st.inside ? requestAnimationFrame(tick) : 0
    }
    const wake = () => {
      if (!st.raf) st.raf = requestAnimationFrame(tick)
    }

    const onEnter = (e) => {
      const r = vp.getBoundingClientRect()
      st.x = st.tx = e.clientX - r.left
      st.y = st.ty = e.clientY - r.top
      st.inside = true
      lens.dataset.on = '1'
      wake()
    }
    const onMove = (e) => {
      const r = vp.getBoundingClientRect()
      st.tx = e.clientX - r.left
      st.ty = e.clientY - r.top
      if (!st.inside) onEnter(e)
      wake()
    }
    const onLeave = () => {
      st.inside = false
      delete lens.dataset.on
    }

    vp.addEventListener('pointerenter', onEnter)
    vp.addEventListener('pointermove', onMove)
    vp.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(st.raf)
      vp.removeEventListener('pointerenter', onEnter)
      vp.removeEventListener('pointermove', onMove)
      vp.removeEventListener('pointerleave', onLeave)
    }
  }, [viewportRef])

  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter
          id="fluid-glass"
          x="0"
          y="0"
          width={LENS}
          height={LENS}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feImage href={mapUrl || undefined} x="0" y="0" width={LENS} height={LENS} preserveAspectRatio="none" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={DISPLACE} xChannelSelector="R" yChannelSelector="G" result="dR" />
          <feColorMatrix in="dR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={DISPLACE * 0.93} xChannelSelector="R" yChannelSelector="G" result="dG" />
          <feColorMatrix in="dG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={DISPLACE * 0.86} xChannelSelector="R" yChannelSelector="G" result="dB" />
          <feColorMatrix in="dB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feBlend in="r" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b" mode="screen" />
        </filter>
      </svg>
      <div
        ref={lensRef}
        className={`fluid-lens${dragging ? ' is-dragging' : ''}`}
        style={{ width: LENS, height: LENS }}
        aria-hidden="true"
      />
    </>
  )
}

// Stripe texture + horizontal rules. Lives outside the 1440-wide frame so the
// pattern keeps going to the window edges when the window is wider than the frame.
const BG_STEP = 781.8
const RULES = [162, 320, 923]

function FrameBackdrop({ extra, blur }) {
  const count = Math.ceil((FRAME_W + extra * 2) / BG_STEP) + 2
  const first = -Math.ceil(extra / BG_STEP) - 1
  return (
    <div
      className="tool-frame__wide"
      style={{ left: -extra, width: FRAME_W + extra * 2 }}
      aria-hidden="true"
    >
      <div className="tool-frame__bg" style={{ left: extra }}>
        {Array.from({ length: count }, (_, k) => {
          const i = first + k
          return (
            <img
              key={i}
              src={toolBg}
              alt=""
              draggable="false"
              className="tool-frame__bg-img"
              style={{
                left: -18 + i * BG_STEP,
                top: i % 2 === 0 ? -224.8 : -150.2,
              }}
            />
          )
        })}
      </div>
      {blur && <div className="tool-frame__blur" />}
      {RULES.map((top) => (
        <span key={top} className="tool-frame__rule" style={{ top: top + 8 }} />
      ))}
    </div>
  )
}

function ToolFrame({ frame }) {
  const [open, setOpen] = useState(frame.initialOpen ?? null)

  return (
    <div className="tool-frame">
      <div className="tool-frame__block" style={{ left: frame.blockLeft }}>
        <span className="tool-frame__category">{frame.category}</span>

        <ul className="tool-frame__list">
          {frame.tools.map((tool, i) => {
            const isOpen = open === i
            return (
              <li key={tool.name} className={`tool-frame__item${isOpen ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="tool-frame__name"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  {tool.name}
                </button>
                <div className="tool-frame__reveal" aria-hidden={!isOpen}>
                  <p className="tool-frame__description">
                    {tool.description.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

    </div>
  )
}

function ToolsShowcase() {
  const sectionRef = useRef(null)
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const drag = useRef({ active: false, moved: false, startX: 0, lastX: 0, lastT: 0, vel: 0 })
  const indexRef = useRef(0)
  const widthRef = useRef(0)
  const [index, setIndex] = useState(0)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [dragging, setDragging] = useState(false)

  const place = useCallback((dx = 0, animate = false) => {
    const track = trackRef.current
    if (!track) return
    track.style.transition = animate
      ? 'transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)'
      : 'none'
    track.style.transform = `translate3d(${-indexRef.current * widthRef.current + dx}px, 0, 0)`
  }, [])

  const goTo = useCallback(
    (next) => {
      indexRef.current = Math.max(0, Math.min(frames.length - 1, next))
      setIndex(indexRef.current)
      place(0, true)
    },
    [place],
  )

  // Scroll-linked reveal: the strip fades in as the section rises into view,
  // so the hand-off from the bag screen isn't a hard cut.
  useEffect(() => {
    const section = sectionRef.current
    const update = () => {
      const { top } = section.getBoundingClientRect()
      const vh = window.innerHeight
      const p = Math.min(Math.max((vh - top) / (vh * 0.7), 0), 1)
      section.style.setProperty('--reveal', String(p * p * (3 - 2 * p)))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    const measure = () => {
      widthRef.current = el.clientWidth
      setSize({ w: el.clientWidth, h: el.clientHeight })
      place(0, false)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [place])

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const d = drag.current
    d.active = true
    d.moved = false
    d.startX = d.lastX = e.clientX
    d.lastT = performance.now()
    d.vel = 0
    d.pointerId = e.pointerId
  }

  const onPointerMove = (e) => {
    const d = drag.current
    if (!d.active) return
    let dx = e.clientX - d.startX
    if (!d.moved && Math.abs(dx) < 4) return
    if (!d.moved) {
      // only capture once it's a real drag, so plain clicks still reach the tool names
      viewportRef.current.setPointerCapture(d.pointerId)
      setDragging(true)
    }
    d.moved = true
    viewportRef.current.classList.add('is-dragging')

    const now = performance.now()
    const dt = now - d.lastT
    if (dt > 0) d.vel = 0.8 * d.vel + 0.2 * ((e.clientX - d.lastX) / dt)
    d.lastX = e.clientX
    d.lastT = now

    // rubber-band at the ends
    const atStart = indexRef.current === 0 && dx > 0
    const atEnd = indexRef.current === frames.length - 1 && dx < 0
    if (atStart || atEnd) dx *= 0.3
    place(dx, false)
  }

  const onPointerUp = (e) => {
    const d = drag.current
    if (!d.active) return
    d.active = false
    viewportRef.current.classList.remove('is-dragging')
    setDragging(false)
    if (viewportRef.current.hasPointerCapture(e.pointerId)) {
      viewportRef.current.releasePointerCapture(e.pointerId)
    }
    if (!d.moved) return

    // swallow the click that the browser fires right after a drag
    d.suppressClick = true
    setTimeout(() => {
      d.suppressClick = false
    }, 0)

    const dx = e.clientX - d.startX
    const w = widthRef.current
    // a flick or a drag past ~1/5 of the width advances one frame
    const projected = dx + d.vel * 220
    let next = indexRef.current
    if (projected < -w * 0.2) next += 1
    else if (projected > w * 0.2) next -= 1
    goTo(next)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') goTo(indexRef.current + 1)
    if (e.key === 'ArrowLeft') goTo(indexRef.current - 1)
  }

  const scale = size.w && size.h ? Math.min(size.w / FRAME_W, size.h / FRAME_H) : 1
  const extra = Math.max(0, (size.w / scale - FRAME_W) / 2) + 40

  return (
    <section className="tools" ref={sectionRef} aria-label="사용 도구">
      <div
        className="tools__viewport"
        ref={viewportRef}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onClickCapture={(e) => {
          if (drag.current.suppressClick) e.stopPropagation()
        }}
      >
        <div className="tools__track" ref={trackRef}>
          {frames.map((frame) => (
            <div className="tools__slot" key={frame.id}>
              <span className="tools__brand">Tools</span>
              <span className="tools__year">2026</span>
              <span className="tools__handle">@jaeyoung</span>
              <div className="tools__stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
                <FrameBackdrop extra={extra} blur={frame.blur} />
                <ToolFrame frame={frame} />
              </div>
            </div>
          ))}
        </div>

        <FluidGlass viewportRef={viewportRef} dragging={dragging} />

        <div className="tools__dots" role="tablist" aria-label="도구 프레임">
          {frames.map((frame, i) => (
            <button
              key={frame.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${i + 1} / ${frames.length}`}
              className={`tools__dot${i === index ? ' is-active' : ''}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default ToolsShowcase
