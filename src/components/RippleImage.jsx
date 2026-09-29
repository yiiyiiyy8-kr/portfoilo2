import { useEffect, useRef } from 'react'

const MAX = 8

const VERT = `
attribute vec2 p;
varying vec2 v;
void main() {
  v = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
}`

const FRAG = `
precision mediump float;
varying vec2 v;
uniform sampler2D tex;
uniform float ratio;
uniform vec3 rip[${MAX}]; // x, y, start time (-1 = unused)
uniform float time;
void main() {
  vec2 uv = v;
  vec2 offset = vec2(0.0);
  for (int i = 0; i < ${MAX}; i++) {
    if (rip[i].z < 0.0) continue;
    float age = time - rip[i].z;
    vec2 diff = (uv - rip[i].xy) * vec2(ratio, 1.0);
    float d = length(diff);
    float wave = sin((d - age * 0.55) * 38.0);
    float env = exp(-d * 3.5) * exp(-age * 1.6) * smoothstep(0.0, 0.15, age * 0.55 - d + 0.15);
    offset += normalize(diff + 1e-5) * wave * env * 0.03 * vec2(1.0 / ratio, 1.0);
  }
  gl_FragColor = texture2D(tex, uv + offset);
}`

function RippleImage({ src, alt, className }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true })
    if (!gl) return undefined

    const compile = (type, code) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, code)
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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uRip = gl.getUniformLocation(prog, 'rip')
    const uTime = gl.getUniformLocation(prog, 'time')
    const uRatio = gl.getUniformLocation(prog, 'ratio')

    const ripples = new Float32Array(MAX * 3).fill(-1)
    let next = 0
    let raf = 0
    let cancelled = false
    let lastAdd = 0
    const start = performance.now()
    const now = () => (performance.now() - start) / 1000

    const img = new Image()
    img.src = src
    img.onload = () => {
      if (cancelled) return
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
      const tex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.uniform1f(uRatio, canvas.width / canvas.height)

      const render = () => {
        if (cancelled) return
        const t = now()
        for (let i = 0; i < MAX; i++) {
          if (ripples[i * 3 + 2] >= 0 && t - ripples[i * 3 + 2] > 3) ripples[i * 3 + 2] = -1
        }
        gl.uniform3fv(uRip, ripples)
        gl.uniform1f(uTime, t)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        raf = requestAnimationFrame(render)
      }
      render()
    }

    const addRipple = (e) => {
      const t = now()
      if (t - lastAdd < 0.09) return
      lastAdd = t
      const r = canvas.getBoundingClientRect()
      ripples[next * 3] = (e.clientX - r.left) / r.width
      ripples[next * 3 + 1] = (e.clientY - r.top) / r.height
      ripples[next * 3 + 2] = t
      next = (next + 1) % MAX
    }
    canvas.addEventListener('pointermove', addRipple)
    canvas.addEventListener('pointerdown', addRipple)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointermove', addRipple)
      canvas.removeEventListener('pointerdown', addRipple)
    }
  }, [src])

  return <canvas ref={canvasRef} className={className} role="img" aria-label={alt} />
}

export default RippleImage
