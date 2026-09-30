import { useEffect, useRef } from 'react'

// A slow, dark liquid that drifts behind the footer (React Bits "Liquid Ether" idea, built for
// this page as one small fragment shader instead of a full fluid solver):
// - the colour is the footer's cyan, taken down to a deep, dim range so the big name stays the
//   brightest thing on the screen;
// - the pointer stirs it: its recent path drags the liquid along and lights it up a little, and
//   the wake fades away by itself;
// - it only renders while the footer is on screen.
const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`

const TRAIL = 16

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uT;
uniform vec4 uTrail[${TRAIL}]; // xy = position, zw = velocity (already scaled by its remaining strength)
uniform vec3 uBg;
uniform vec3 uC1;
uniform vec3 uC2;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += a * noise(p);
    p = p * 2.02 + 7.3;
    a *= 0.5;
  }
  return s / 0.9375;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 2.4;

  // the pointer's wake drags and swirls the liquid it passes through
  float stir = 0.0;
  for (int i = 0; i < ${TRAIL}; i++) {
    vec2 d = p - uTrail[i].xy;
    float w = exp(-dot(d, d) * 2.0);
    float sp = length(uTrail[i].zw);
    p -= uTrail[i].zw * w * 1.8;
    p += vec2(-d.y, d.x) * sp * w * 0.7;
    stir += w * sp;
  }

  // two layers of domain warping give the slow, oily flow
  vec2 q = vec2(fbm(p * 0.8 + vec2(0.0, uT * 0.10)), fbm(p * 0.8 + vec2(4.7, 1.2) - vec2(uT * 0.09, 0.0)));
  vec2 r = vec2(fbm(p + 2.0 * q + vec2(1.7, 9.2) + uT * 0.13), fbm(p + 2.0 * q + vec2(8.3, 2.8) - uT * 0.11));
  float f = fbm(p + 2.6 * r);

  float v = smoothstep(0.28, 0.86, f);
  v = pow(v, 1.35) * (0.62 + 0.38 * length(q));
  v += stir * 0.4; // stirred liquid catches a little more light

  // deep background -> dim cyan -> a touch brighter cyan (all far below the text colour)
  vec3 col = v < 0.5 ? mix(uBg, uC1, v * 2.0) : mix(uC1, uC2, clamp((v - 0.5) * 2.0, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`

// the footer text colour is #83e2ff; the liquid uses the same hue, much darker
const CYAN = [131 / 255, 226 / 255, 255 / 255]
const BG = [36 / 255, 36 / 255, 36 / 255] // footer background #242424
const DIM1 = CYAN.map((c) => c * 0.26)
const DIM2 = CYAN.map((c) => c * 0.46)

function LiquidEther({ className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const host = canvas.parentElement
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false })
    if (!gl) return undefined

    const compile = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    // if this GPU can't build the shader, show nothing at all: the footer keeps its plain background
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.style.display = 'none'
      return undefined
    }
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const u = (n) => gl.getUniformLocation(prog, n)
    const uRes = u('uRes')
    const uT = u('uT')
    const uTrail = u('uTrail')
    gl.uniform3fv(u('uBg'), BG)
    gl.uniform3fv(u('uC1'), DIM1)
    gl.uniform3fv(u('uC2'), DIM2)

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fine = window.matchMedia('(pointer: fine)').matches
    const S = {
      raf: 0, visible: false, start: performance.now(),
      trail: Array.from({ length: TRAIL }, () => ({ x: 0, y: 0, vx: 0, vy: 0, s: 0 })),
      head: 0, lastX: null, lastY: null, lastT: 0,
      W: 0, H: 0,
    }
    const flat = new Float32Array(TRAIL * 4)

    // the liquid is soft, so it is drawn at a modest resolution and simply scaled up
    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1) * 0.6
      S.W = host.clientWidth
      S.H = host.clientHeight
      const w = Math.max(2, Math.round(S.W * scale))
      const h = Math.max(2, Math.round(S.H * scale))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, w, h)
      gl.uniform2f(uRes, w, h)
    }

    const draw = (now) => {
      // decay the wake, then hand it to the shader
      let alive = false
      for (let i = 0; i < TRAIL; i++) {
        const t = S.trail[i]
        t.s *= 0.965
        if (t.s > 0.01) alive = true
        flat[i * 4] = t.x
        flat[i * 4 + 1] = t.y
        flat[i * 4 + 2] = t.vx * t.s
        flat[i * 4 + 3] = t.vy * t.s
      }
      gl.uniform4fv(uTrail, flat)
      gl.uniform1f(uT, reduce ? 3 : ((now - S.start) / 1000) * 0.7)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      return alive
    }

    const loop = (now) => {
      draw(now)
      S.raf = S.visible && !reduce ? requestAnimationFrame(loop) : 0
    }

    // pointer -> position in the shader's own space (aspect-correct, y up), velocity per frame
    const onMove = (e) => {
      if (!fine || reduce || e.pointerType === 'touch') return
      const r = host.getBoundingClientRect()
      const nx = (e.clientX - r.left) / r.width
      const ny = 1 - (e.clientY - r.top) / r.height
      const aspect = r.width / r.height
      const x = (nx - 0.5) * aspect * 2.4
      const y = (ny - 0.5) * 2.4
      if (S.lastX !== null) {
        const now = performance.now()
        const dt = Math.max(now - S.lastT, 8)
        const t = S.trail[S.head]
        t.x = x
        t.y = y
        t.vx = Math.max(-0.6, Math.min(0.6, ((x - S.lastX) / dt) * 16 * 2.4))
        t.vy = Math.max(-0.6, Math.min(0.6, ((y - S.lastY) / dt) * 16 * 2.4))
        t.s = 1
        S.head = (S.head + 1) % TRAIL
      }
      S.lastX = x
      S.lastY = y
      S.lastT = performance.now()
    }
    const onLeave = () => {
      S.lastX = null
      S.lastY = null
    }

    // only render while the footer is on screen
    const onScroll = () => {
      const r = host.getBoundingClientRect()
      const vis = r.top < window.innerHeight && r.bottom > 0
      if (vis && !S.visible) {
        S.visible = true
        if (!S.raf) S.raf = requestAnimationFrame(loop)
      } else if (!vis && S.visible) {
        S.visible = false
      }
    }

    resize()
    draw(performance.now()) // a first frame right away
    onScroll()
    const ro = new ResizeObserver(() => {
      resize()
      draw(performance.now())
    })
    ro.observe(host)
    const onResize = () => {
      resize()
      draw(performance.now())
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)

    return () => {
      cancelAnimationFrame(S.raf)
      ro.disconnect()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className={`liquid-ether ${className}`} aria-hidden="true" />
}

export default LiquidEther
