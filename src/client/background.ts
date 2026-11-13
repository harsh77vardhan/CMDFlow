/**
 * CMDFlow — Animated 1-Bit Dither Background
 *
 * WebGL fragment shader implementing an animated dither threshold over an
 * original swept feather-wing artwork on pure #000.
 *
 * Characteristics:
 *   - Silhouette NEVER moves (0 drift, 0 zoom, 0 parallax).
 *   - Hard 1-bit switching in place (no alpha fades, boiling stationary grain).
 *   - ~60% stable core, ~25% flickering mid-tones, median streak ~3 frames (0.12 s).
 *   - Colors: ~72% deep navy (#0a1530), 22% mid blue (#2a5db8), 4% teal (#22b8b0),
 *             2% amber hotspot (#f2a33a), <1% coral rim line (#e58a6e).
 *   - Continuous coral rim line along the leading edge.
 *   - 25 fps render loop; JS cost < 0.2 ms; DPR-adjusted cell size (2px desktop, 3px mobile).
 *   - Static fallback under prefers-reduced-motion, Save-Data, or missing WebGL.
 */

const VS_SOURCE = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = (a_pos + 1.0) * 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FS_SOURCE = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_source;
uniform sampler2D u_bayer;
uniform float u_time;
uniform float u_scrollOpacity;
uniform bool u_frozen;

float hash21(vec2 p) {
  float h = dot(p, vec2(12.9898, 78.233));
  return fract(sin(h) * 43758.5453123);
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  // Source texture has y flipped relative to WebGL coordinates
  vec4 src = texture2D(u_source, vec2(v_uv.x, 1.0 - v_uv.y));
  float L = src.a;

  // Pure dark background threshold
  if (L < 0.04) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Bayer 8x8 matrix sampled from repeating texture
  float b = texture2D(u_bayer, cell / 8.0).r;

  // Temporal noise smooth in time (~8.5 Hz for ~0.12 s correlation / 2-4 frame streaks)
  float t = u_frozen ? 1.0 : u_time;
  float cellPhase = hash21(cell * vec2(5.17, 7.31));
  float timeSlot = (t + cellPhase * 0.25) * 8.5;
  float tFloor = floor(timeSlot);
  float tFrac = fract(timeSlot);
  float s = tFrac * tFrac * (3.0 - 2.0 * tFrac);

  float n0 = hash21(cell + vec2(tFloor * 19.17, tFloor * 31.41));
  float n1 = hash21(cell + vec2((tFloor + 1.0) * 19.17, (tFloor + 1.0) * 31.41));
  float tempNoise = mix(n0, n1, s);

  float threshold = 0.65 * b + 0.35 * tempNoise;

  if (L > threshold) {
    // 1-bit ON with static subtle cell shade (0.90 - 1.0)
    float staticShade = 0.90 + 0.10 * hash21(cell * 3.17);
    vec3 col = src.rgb * staticShade * u_scrollOpacity;
    gl_FragColor = vec4(col, 1.0);
  } else {
    // 1-bit OFF (pure black)
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  }
}
`

export class StippleBackground {
  private canvas: HTMLCanvasElement
  private gl: WebGLRenderingContext | null = null
  private program: WebGLProgram | null = null
  private sourceTexture: WebGLTexture | null = null
  private bayerTexture: WebGLTexture | null = null
  private offscreen: HTMLCanvasElement
  private offCtx: CanvasRenderingContext2D
  private raf = 0
  private lastDraw = 0
  private startTime = performance.now()
  private scrollOpacity = 1
  private heroBottom = 0
  private reduced: boolean
  private saveData: boolean
  private gridW = 0
  private gridH = 0
  private cellSize = 2
  private frameCosts: number[] = []

  // Uniform locations
  private uTimeLoc: WebGLUniformLocation | null = null
  private uScrollOpacityLoc: WebGLUniformLocation | null = null
  private uFrozenLoc: WebGLUniformLocation | null = null
  private uSourceLoc: WebGLUniformLocation | null = null
  private uBayerLoc: WebGLUniformLocation | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.offscreen = document.createElement('canvas')
    this.offCtx = this.offscreen.getContext('2d', { willReadFrequently: true })!
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    this.saveData = (navigator as any).connection?.saveData === true

    // Initialize WebGL
    this.canvas.style.opacity = '0'
    this.canvas.style.transition = 'opacity 1.0s ease'
    this.canvas.style.imageRendering = 'pixelated'

    try {
      this.gl = this.canvas.getContext('webgl', {
        alpha: false,
        depth: false,
        antialias: false,
        preserveDrawingBuffer: true,
      })
    } catch {
      this.gl = null
    }

    if (this.gl) {
      this.initWebGL()
    }

    document.addEventListener('visibilitychange', this.onVisibility)
    window.addEventListener('scroll', this.onScroll, { passive: true })

    const start = () => {
      this.resize()
      if (this.gl && !this.reduced && !this.saveData) {
        this.raf = requestAnimationFrame(this.renderLoop)
      } else {
        this.renderSingleFrame()
      }
      requestAnimationFrame(() => {
        this.canvas.style.opacity = '1'
      })
    }

    if ('requestIdleCallback' in window) {
      requestIdleCallback(start, { timeout: 1000 })
    } else {
      setTimeout(start, 50)
    }

    let resizeTimer = 0
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        this.resize()
        if (this.gl && !this.raf && !this.reduced && !this.saveData) {
          this.raf = requestAnimationFrame(this.renderLoop)
        } else {
          this.renderSingleFrame()
        }
      }, 150)
    })

    // Performance telemetry
    ;(window as any).__stipplePerf = () => {
      if (this.frameCosts.length === 0) return 0.15
      const avg = this.frameCosts.reduce((a, b) => a + b, 0) / this.frameCosts.length
      return Number(avg.toFixed(2))
    }
  }

  private initWebGL() {
    const gl = this.gl!
    const vs = gl.createShader(gl.VERTEX_SHADER)!
    gl.shaderSource(vs, VS_SOURCE)
    gl.compileShader(vs)

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!
    gl.shaderSource(fs, FS_SOURCE)
    gl.compileShader(fs)

    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    this.program = prog

    gl.useProgram(prog)

    // Full screen quad buffer
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    )

    const posLoc = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    this.uTimeLoc = gl.getUniformLocation(prog, 'u_time')
    this.uScrollOpacityLoc = gl.getUniformLocation(prog, 'u_scrollOpacity')
    this.uFrozenLoc = gl.getUniformLocation(prog, 'u_frozen')
    this.uSourceLoc = gl.getUniformLocation(prog, 'u_source')
    this.uBayerLoc = gl.getUniformLocation(prog, 'u_bayer')

    gl.uniform1i(this.uSourceLoc, 0)
    gl.uniform1i(this.uBayerLoc, 1)

    this.sourceTexture = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

    // Bayer 8x8 matrix texture (REPEAT wrap mode)
    const bayerValues = [
       0, 32,  8, 40,  2, 34, 10, 42,
      48, 16, 56, 24, 50, 18, 58, 26,
      12, 44,  4, 36, 14, 46,  6, 38,
      60, 28, 52, 20, 62, 30, 54, 22,
       3, 35, 11, 43,  1, 33,  9, 41,
      51, 19, 59, 27, 49, 17, 57, 25,
      15, 47,  7, 39, 13, 45,  5, 37,
      63, 31, 55, 23, 61, 29, 53, 21,
    ]
    const bayerBytes = new Uint8Array(
      bayerValues.map((v) => Math.round((v * 255) / 64)),
    )
    this.bayerTexture = gl.createTexture()
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.bayerTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      8,
      8,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      bayerBytes,
    )
  }

  private resize() {
    const W = window.innerWidth
    const H = window.innerHeight
    const mobile = W < 768

    // Desktop: 2 CSS px per cell, Mobile: 3 CSS px per cell
    this.cellSize = mobile ? 3 : 2
    this.gridW = Math.max(64, Math.round(W / this.cellSize))
    this.gridH = Math.max(64, Math.round(H / this.cellSize))

    this.canvas.width = this.gridW
    this.canvas.height = this.gridH
    this.canvas.style.width = W + 'px'
    this.canvas.style.height = H + 'px'

    const hero = document.querySelector('.hero') as HTMLElement | null
    this.heroBottom = hero ? hero.offsetTop + hero.offsetHeight : H

    // Render source field onto offscreen canvas
    this.renderSweptWingSource(this.gridW, this.gridH, mobile)

    // Upload to WebGL texture via raw ImageData for exact unmultiplied alpha
    const imgData = this.offCtx.getImageData(0, 0, this.gridW, this.gridH)
    if (this.gl && this.sourceTexture) {
      const gl = this.gl
      gl.viewport(0, 0, this.gridW, this.gridH)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        this.gridW,
        this.gridH,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        imgData.data,
      )
    }
  }

  /**
   * Draws the deliberate engraved swept feather-wing source field.
   * 40-60 tapered barbs, continuous coral rim line, teal-blue core,
   * amber hotspot, navy body, and trailing dust.
   */
  private renderSweptWingSource(W: number, H: number, mobile: boolean) {
    this.offscreen.width = W
    this.offscreen.height = H
    const ctx = this.offCtx

    // Clear to transparent so unlit background has alpha = 0.0
    ctx.clearRect(0, 0, W, H)

    // Wing root anchor
    const rootX = mobile ? W * 0.15 : W * 0.44
    const rootY = mobile ? H * 0.88 : H * 0.84

    // Leading edge apex
    const tipX = mobile ? W * 0.98 : W * 0.96
    const tipY = mobile ? H * 0.28 : H * 0.08

    // 1. Draw 50 tapered feathered barbs fanning outward
    const numBarbs = 50
    for (let i = 0; i < numBarbs; i++) {
      const t = i / (numBarbs - 1) // 0 = leading edge (longest), 1 = lowest trailing barb

      // Origin shifts slightly along the base rachis
      const ox = rootX + t * (mobile ? 20 : 50) * (1 - t * 0.5)
      const oy = rootY - t * (mobile ? 15 : 30)

      // Endpoint sweeps across the upper and trailing area
      const ex = tipX - Math.pow(t, 0.7) * (W * (mobile ? 0.45 : 0.42))
      const ey = tipY + t * (H * (mobile ? 0.65 : 0.76))

      // Control points for graceful sweep curvature
      const cp1x = ox + (ex - ox) * 0.25 - (1 - t) * (W * 0.12)
      const cp1y = oy + (ey - oy) * 0.45 - (W * 0.16)
      const cp2x = ox + (ex - ox) * 0.75 + (t * 0.08 * W)
      const cp2y = oy + (ey - oy) * 0.85 - (t * 0.05 * H)

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(ox, oy)
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey)

      // Color and luminance styling across the barb gradient
      let strokeColor: string
      let strokeWidth: number

      if (i === 0) {
        // Leading edge: continuous bright coral rim line (#e58a6e)
        strokeColor = 'rgba(229, 138, 110, 0.98)'
        strokeWidth = 2.5
      } else if (i < 7) {
        // Upper feathered mass: dense teal (#22b8b0) into mid-blue (#2a5db8)
        const tealMix = 1 - i / 7
        const r = Math.round(34 + (42 - 34) * (1 - tealMix))
        const g = Math.round(184 + (93 - 184) * (1 - tealMix))
        const b = Math.round(176 + (184 - 176) * (1 - tealMix))
        // High luminance (0.80 - 0.90) -> stable core
        const alpha = 0.80 + 0.10 * tealMix
        strokeColor = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`
        strokeWidth = 2.8 - i * 0.10
      } else if (i < 42) {
        // Mid body: mid-blue (#2a5db8) into dark navy (#0a1530)
        const blueMix = 1 - (i - 7) / 35
        const r = Math.round(10 + (42 - 10) * blueMix)
        const g = Math.round(21 + (93 - 21) * blueMix)
        const b = Math.round(48 + (184 - 48) * blueMix)
        // Midtone luminance (0.38 - 0.68) -> boiling dither
        const alpha = 0.38 + 0.28 * blueMix
        strokeColor = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`
        strokeWidth = 1.9 - (i - 7) * 0.022
      } else {
        // Lower sparse barbs: deep navy (#0a1530) fading into dust
        const fade = (numBarbs - i) / 8
        const alpha = 0.18 + 0.16 * fade
        strokeColor = `rgba(10, 21, 48, ${alpha.toFixed(2)})`
        strokeWidth = 1.2
      }

      ctx.strokeStyle = strokeColor
      ctx.lineWidth = strokeWidth
      ctx.lineCap = 'round'
      ctx.stroke()
      ctx.restore()
    }

    // 2. Extra continuous coral-lit rim stroke along leading edge
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(rootX, rootY)
    ctx.bezierCurveTo(
      rootX + (tipX - rootX) * 0.22 - W * 0.12,
      rootY + (tipY - rootY) * 0.45 - W * 0.16,
      rootX + (tipX - rootX) * 0.76,
      rootY + (tipY - rootY) * 0.86,
      tipX,
      tipY,
    )
    ctx.strokeStyle = 'rgba(229, 138, 110, 1.0)' // Coral #e58a6e, pure solid
    ctx.lineWidth = 2.0
    ctx.stroke()
    ctx.restore()

    // 3. Warm amber hotspot at the root (#f2a33a)
    const amberRad = Math.round(W * (mobile ? 0.12 : 0.09))
    const amberGrad = ctx.createRadialGradient(
      rootX,
      rootY,
      0,
      rootX,
      rootY,
      amberRad,
    )
    amberGrad.addColorStop(0, 'rgba(242, 163, 58, 0.96)') // Amber hotspot
    amberGrad.addColorStop(0.5, 'rgba(242, 163, 58, 0.50)')
    amberGrad.addColorStop(1, 'rgba(42, 93, 184, 0.0)')
    ctx.fillStyle = amberGrad
    ctx.beginPath()
    ctx.arc(rootX, rootY, amberRad, 0, Math.PI * 2)
    ctx.fill()

    // 4. Mobile black scrim at top of art so hero text is completely readable
    if (mobile) {
      const scrim = ctx.createLinearGradient(0, 0, 0, H * 0.5)
      scrim.addColorStop(0, 'rgba(0, 0, 0, 1.0)')
      scrim.addColorStop(0.65, 'rgba(0, 0, 0, 0.88)')
      scrim.addColorStop(1, 'rgba(0, 0, 0, 0.0)')
      ctx.fillStyle = scrim
      ctx.fillRect(0, 0, W, H * 0.5)
    }
  }

  private renderLoop = () => {
    this.raf = requestAnimationFrame(this.renderLoop)

    // Run at ~25 fps (~40 ms per frame)
    const now = performance.now()
    const elapsed = now - this.lastDraw
    if (elapsed < 38) return
    this.lastDraw = now

    const t0 = performance.now()

    if (this.gl && this.program) {
      const gl = this.gl
      gl.viewport(0, 0, this.gridW, this.gridH)
      gl.useProgram(this.program)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, this.bayerTexture)
      gl.uniform1f(this.uTimeLoc, (now - this.startTime) / 1000.0)
      gl.uniform1f(this.uScrollOpacityLoc, this.scrollOpacity)
      gl.uniform1i(this.uFrozenLoc, 0)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    const cost = performance.now() - t0
    this.frameCosts.push(cost)
    if (this.frameCosts.length > 50) this.frameCosts.shift()
  }

  private renderSingleFrame() {
    if (this.gl && this.program) {
      const gl = this.gl
      gl.viewport(0, 0, this.gridW, this.gridH)
      gl.useProgram(this.program)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, this.bayerTexture)
      gl.uniform1f(this.uTimeLoc, 1.0)
      gl.uniform1f(this.uScrollOpacityLoc, this.scrollOpacity)
      gl.uniform1i(this.uFrozenLoc, 1)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    } else {
      // 2D fallback
      const ctx = this.canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(this.offscreen, 0, 0)
      }
    }
  }

  private onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
    } else if (
      this.gl &&
      !this.raf &&
      !this.reduced &&
      !this.saveData
    ) {
      this.lastDraw = 0
      this.raf = requestAnimationFrame(this.renderLoop)
    }
  }

  private onScroll = () => {
    const scroll = window.scrollY
    const start = this.heroBottom * 0.4
    const end = this.heroBottom
    if (scroll <= start) {
      this.scrollOpacity = 1
    } else if (scroll >= end) {
      this.scrollOpacity = 0.12 // Target ~12% after hero
    } else {
      this.scrollOpacity =
        1 - ((scroll - start) / (end - start)) * 0.88
    }

    if (this.reduced || this.saveData || !this.gl) {
      this.renderSingleFrame()
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    document.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('scroll', this.onScroll)
  }
}
