import { useEffect, useRef } from 'react'

// A soft, drifting aurora drawn in a fragment shader (simplex-noise ribbons
// blended across three colour stops). Renders with premultiplied alpha so it
// can sit on top of any flat background colour.
const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform float uAmp;
uniform float uBlend;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

vec3 ramp(float t) {
  t = clamp(t, 0.0, 1.0);
  return t < 0.5 ? mix(uC0, uC1, t * 2.0) : mix(uC1, uC2, (t - 0.5) * 2.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 col = ramp(uv.x);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmp;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float mid = 0.2;
  float alpha = smoothstep(mid - uBlend * 0.5, mid + uBlend * 0.5, intensity);
  alpha *= clamp(intensity, 0.0, 1.0) * 0.8;

  gl_FragColor = vec4(col * alpha, alpha);
}`

const hex = (h) => {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

const DEFAULT_STOPS = ['#8fd9ea', '#b9a8f5', '#9be8c8']

function Aurora({
  colorStops = DEFAULT_STOPS,
  amplitude = 1.0,
  blend = 0.6,
  speed = 1.0,
  className = '',
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false })
    if (!gl) return

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
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const u = (n) => gl.getUniformLocation(prog, n)
    const uTime = u('uTime')
    const uRes = u('uRes')
    gl.uniform3fv(u('uC0'), hex(colorStops[0]))
    gl.uniform3fv(u('uC1'), hex(colorStops[1]))
    gl.uniform3fv(u('uC2'), hex(colorStops[2]))
    gl.uniform1f(u('uAmp'), amplitude)
    gl.uniform1f(u('uBlend'), blend)
    gl.clearColor(0, 0, 0, 0)

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let visible = true
    const start = performance.now()

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uRes, canvas.width, canvas.height)
    }

    const draw = (t) => {
      resize()
      gl.uniform1f(uTime, reduce ? 4 : ((t - start) / 1000) * speed)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const loop = (t) => {
      draw(t)
      raf = visible && !reduce ? requestAnimationFrame(loop) : 0
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(loop)
    })
    io.observe(canvas)
    draw(performance.now()) // paint the first frame right away
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [colorStops, amplitude, blend, speed])

  return <canvas ref={canvasRef} className={`aurora ${className}`} aria-hidden="true" />
}

export default Aurora
