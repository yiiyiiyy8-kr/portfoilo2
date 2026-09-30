import { useEffect } from 'react'

// A field of small dots behind the section (React Bits "Dot Field" idea, built for this page).
// - The dots take the colour held in colorRef and glide to a new one when it changes
//   (About Me writes the glass colour of the vial that is currently in the middle).
// - Near the pointer the dots are nudged away and swell a little; when it leaves they ease back.
// - The loop only runs while something is changing; otherwise the canvas just sits there.
const SPACING = 30
const RADIUS = 1.5
const REACH = 150 // px around the pointer that is affected

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))

function DotField({ colorRef, wakeRef, hostRef, canvasRef }) {
  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const S = {
      W: 0, H: 0, dpr: 1, n: 0,
      gx: null, gy: null, ox: null, oy: null, hot: null,
      px: 0, py: 0, over: false, strength: 0,
      color: [...colorRef.current], raf: 0,
    }

    const layout = () => {
      S.W = host.clientWidth
      S.H = host.clientHeight
      S.dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(S.W * S.dpr)
      canvas.height = Math.round(S.H * S.dpr)
      canvas.style.width = `${S.W}px`
      canvas.style.height = `${S.H}px`
      ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0)
      const cols = Math.ceil(S.W / SPACING) + 1
      const rows = Math.ceil(S.H / SPACING) + 1
      S.n = cols * rows
      S.gx = new Float32Array(S.n)
      S.gy = new Float32Array(S.n)
      S.ox = new Float32Array(S.n)
      S.oy = new Float32Array(S.n)
      S.hot = new Float32Array(S.n)
      const offX = (S.W - (cols - 1) * SPACING) / 2
      const offY = (S.H - (rows - 1) * SPACING) / 2
      let k = 0
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          S.gx[k] = offX + c * SPACING
          S.gy[k] = offY + r * SPACING
          k++
        }
      }
    }

    const draw = () => {
      if (!S.W) return
      ctx.clearRect(0, 0, S.W, S.H)
      const [r, g, b] = S.color
      // slightly deeper than the glass colour so the dots read on the light background
      ctx.fillStyle = `rgb(${Math.round(r * 0.86)}, ${Math.round(g * 0.86)}, ${Math.round(b * 0.86)})`
      const cx = S.W / 2
      const cy = S.H / 2
      const maxD = Math.hypot(cx, cy)
      for (let i = 0; i < S.n; i++) {
        const x = S.gx[i] + S.ox[i]
        const y = S.gy[i] + S.oy[i]
        // calm towards the corners, brighter around the middle
        const edge = 1 - 0.55 * clamp(Math.hypot(S.gx[i] - cx, S.gy[i] - cy) / maxD)
        const hot = S.hot[i]
        ctx.globalAlpha = clamp((0.34 + hot * 0.5) * edge)
        ctx.beginPath()
        ctx.arc(x, y, RADIUS + hot * 1.9, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    const step = () => {
      let busy = false

      // colour glides toward whatever colorRef says
      const t = colorRef.current
      for (let c = 0; c < 3; c++) {
        const d = t[c] - S.color[c]
        if (Math.abs(d) > 0.4) {
          S.color[c] += reduce ? d : d * 0.09
          busy = true
        } else S.color[c] = t[c]
      }

      // pointer: dots ease toward their pushed position, or back home
      S.strength += ((S.over ? 1 : 0) - S.strength) * 0.12
      const R2 = REACH * REACH
      for (let i = 0; i < S.n; i++) {
        let tx = 0
        let ty = 0
        let th = 0
        if (S.strength > 0.004 && !reduce) {
          const dx = S.gx[i] - S.px
          const dy = S.gy[i] - S.py
          const d2 = dx * dx + dy * dy
          if (d2 < R2) {
            const d = Math.sqrt(d2) || 1
            const k = (1 - d / REACH) ** 2
            tx = (dx / d) * k * 26 * S.strength
            ty = (dy / d) * k * 26 * S.strength
            th = k * S.strength
          }
        }
        S.ox[i] += (tx - S.ox[i]) * 0.16
        S.oy[i] += (ty - S.oy[i]) * 0.16
        S.hot[i] += (th - S.hot[i]) * 0.16
        if (Math.abs(S.ox[i]) + Math.abs(S.oy[i]) + S.hot[i] > 0.02) busy = true
      }
      if (S.over || S.strength > 0.004) busy = true

      draw()
      S.raf = busy ? requestAnimationFrame(step) : 0
    }
    const wake = () => {
      if (!S.raf) S.raf = requestAnimationFrame(step)
    }
    wakeRef.current = wake

    const onMove = (e) => {
      if (e.pointerType === 'touch' || reduce) return
      const r = canvas.getBoundingClientRect()
      S.px = e.clientX - r.left
      S.py = e.clientY - r.top
      S.over = true
      wake()
    }
    const onLeave = () => {
      S.over = false
      wake()
    }

    layout()
    draw()
    const ro = new ResizeObserver(() => {
      layout()
      draw()
    })
    ro.observe(host)
    const onResize = () => {
      layout()
      draw()
    }
    window.addEventListener('resize', onResize)
    host.addEventListener('pointermove', onMove, { passive: true })
    host.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(S.raf)
      ro.disconnect()
      window.removeEventListener('resize', onResize)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      wakeRef.current = null
    }
  }, [colorRef, wakeRef, hostRef, canvasRef])

  return null
}

export default DotField
