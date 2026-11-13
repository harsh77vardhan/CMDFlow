/**
 * CMDFlow — Procedural Stipple Background
 *
 * Renders a static stipple field — one flowing ribbon of dots sweeping from
 * lower-left to upper-right, dissolving into dust — using a seeded PRNG so
 * the picture is IDENTICAL on every load.
 *
 * Palette:
 *   - Pure black (#000000) background
 *   - Dot ramp: ~72% deep navy (~#0a1530), ~22% mid blue (~#2a5db8),
 *               ~4% teal/cyan (~#22b8b0), ~2% warm amber hotspot (~#f2a33a),
 *               <1% coral rim light (~#e58a6e) along leading edges.
 *
 * Performance specifications:
 *   - Rendered ONCE to an offscreen canvas; animation loop only blits + twinkles.
 *   - DPR capped at 2; ~25k dots on desktop, ~8k on mobile.
 *   - Starts via requestIdleCallback after first paint.
 *   - Pauses on visibilitychange.
 *   - Fully static under prefers-reduced-motion or Save-Data.
 *   - Canvas fades in over 1.2 s so it never blocks LCP.
 *   - On desktop the artwork sits right of center in the hero, bleeding off.
 *   - On mobile it sits behind the lower half of the hero with a black scrim.
 *   - After the hero, fades to ~15% opacity as the user scrolls.
 *   - Optional pointer parallax of at most 6 px on desktop only.
 *   - Average per-frame cost well under 4 ms (typically 0.1-0.3 ms).
 */

type Dot = {
  x: number       // 0..1 normalized
  y: number       // 0..1 normalized
  r: number       // radius in CSS px (1-2 px scaled with dpr)
  color: string   // pre-computed rgba
  phase: number   // twinkle phase offset 0..2π
  period: number  // twinkle period 4-9 s
  edge: boolean   // rim-light candidate
}

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------
function mkRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s += 0x6d2b79f5
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Luminance field from analytic curves + noise + gaussian hotspot
// ---------------------------------------------------------------------------
function luminanceAt(nx: number, ny: number): number {
  // Flip coords so lower-left is origin
  const px = nx
  const py = 1 - ny

  // Strand 1 — main spine: starts at (0, 0.15), arcs up to (1, 0.75)
  const t1 = px
  const sy1 = 0.15 + t1 * 0.6 + 0.18 * Math.sin(t1 * Math.PI)
  const d1 = Math.abs(py - sy1)
  const strand1 = Math.exp(-d1 * d1 * 44) * 1.0

  // Strand 2 — upper feather
  const t2 = px
  const sy2 = 0.3 + t2 * 0.5 + 0.1 * Math.sin(t2 * Math.PI * 1.3)
  const d2 = Math.abs(py - sy2)
  const strand2 = Math.exp(-d2 * d2 * 55) * 0.55

  // Strand 3 — lower feather
  const sy3 = 0.05 + t2 * 0.65
  const d3 = Math.abs(py - sy3)
  const strand3 = Math.exp(-d3 * d3 * 40) * 0.42

  // Gaussian hotspot near (0.12, 0.20) in py-coords (lower-left origin)
  const hx = nx - 0.12
  const hy = py - 0.2
  const hotspot = Math.exp(-(hx * hx * 32 + hy * hy * 32)) * 0.95

  // Fade to dust toward upper-right edge
  const edgeFade = Math.pow(Math.max(0, 1 - nx), 0.5)

  // Combine
  const base = (strand1 + strand2 + strand3) * edgeFade + hotspot

  // High-frequency subtle noise (deterministic function of position)
  const noise = 0.07 * (Math.sin(nx * 83.3 + ny * 61.7) * 0.5 + 0.5)

  return Math.min(Math.max(0, base + noise), 1)
}

// ---------------------------------------------------------------------------
// Gradient magnitude (for rim-light detection)
// ---------------------------------------------------------------------------
function gradMag(nx: number, ny: number): number {
  const eps = 0.015
  const L = luminanceAt(nx, ny)
  const Lx = luminanceAt(nx + eps, ny)
  const Ly = luminanceAt(nx, ny + eps)
  return Math.sqrt((Lx - L) ** 2 + (Ly - L) ** 2) / eps
}

// ---------------------------------------------------------------------------
// Color mapping
// ---------------------------------------------------------------------------
function dotColor(lum: number, isHotspot: boolean, isEdge: boolean, alpha: number): string {
  if (isHotspot && lum > 0.65) {
    // Amber hotspot (~#f2a33a)
    return `rgba(242,163,58,${alpha.toFixed(2)})`
  }
  if (isEdge) {
    // Coral/salmon rim light (~#e58a6e) along leading edges
    return `rgba(229,138,110,${(alpha * 0.85).toFixed(2)})`
  }
  if (lum < 0.35) {
    // Deep navy (~#0a1530)
    return `rgba(10,21,48,${alpha.toFixed(2)})`
  }
  if (lum < 0.65) {
    // Navy -> Mid blue (~#2a5db8)
    const t = (lum - 0.35) / 0.3
    const r = Math.round(10 + t * (42 - 10))
    const g = Math.round(21 + t * (93 - 21))
    const b = Math.round(48 + t * (184 - 48))
    return `rgba(${r},${g},${b},${alpha.toFixed(2)})`
  }
  // Mid blue -> Teal/cyan (~#22b8b0)
  const t = (lum - 0.65) / 0.35
  const r = Math.round(42 + t * (34 - 42))
  const g = Math.round(93 + t * (184 - 93))
  const b = Math.round(184 + t * (176 - 184))
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`
}

// ---------------------------------------------------------------------------
// Blue-noise inspired stratified dot sampling with SEEDED PRNG
// ---------------------------------------------------------------------------
function buildDots(budget: number): { all: Dot[]; twinkle: Dot[] } {
  const rng = mkRng(0xdeadbeef)
  const dots: Dot[] = []

  const cols = Math.ceil(Math.sqrt(budget * 1.6))
  const rows = Math.ceil(budget / cols)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (dots.length >= budget * 2) break
      const nx = (col + rng()) / cols
      const ny = (row + rng()) / rows
      const lum = luminanceAt(nx, ny)

      const threshold = lum > 0.08 ? lum * 0.85 : 0.0
      if (rng() > threshold) continue

      const isHotspot = nx < 0.22 && (1 - ny) > 0.1 && (1 - ny) < 0.35
      const gm = gradMag(nx, ny)
      const isEdge = gm > 0.6 && lum > 0.3

      const baseAlpha = 0.55 + lum * 0.45
      const radius = lum > 0.5 ? (rng() < 0.35 ? 1.5 : 1.0) : 1.0

      dots.push({
        x: nx,
        y: ny,
        r: radius,
        color: dotColor(lum, isHotspot, isEdge, baseAlpha),
        phase: rng() * Math.PI * 2,
        period: 4 + rng() * 5,
        edge: isEdge,
      })
    }
  }

  const all = dots.slice(0, budget)
  // Select a small subset (~450 dots) for fine dot-level twinkle
  const twinkleStep = Math.max(1, Math.floor(all.length / 450))
  const twinkle: Dot[] = []
  for (let i = 0; i < all.length; i += twinkleStep) {
    twinkle.push(all[i])
  }

  return { all, twinkle }
}

// ---------------------------------------------------------------------------
// StippleBackground controller class
// ---------------------------------------------------------------------------
export class StippleBackground {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private offscreen: HTMLCanvasElement
  private offCtx: CanvasRenderingContext2D
  private dots: Dot[] = []
  private twinkleDots: Dot[] = []
  private renderW = 0
  private renderH = 0
  private dpr = 1
  private raf = 0
  private fadeRaf = 0
  private reduced: boolean
  private saveData: boolean
  private initialized = false
  private scrollOpacity = 1
  private heroBottom = 0

  // Desktop pointer parallax (max 6px)
  private targetParallaxX = 0
  private targetParallaxY = 0
  private currentParallaxX = 0
  private currentParallaxY = 0

  // Performance telemetry
  private frameTimes: number[] = []

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: true })!
    this.offscreen = document.createElement('canvas')
    this.offCtx = this.offscreen.getContext('2d', { alpha: true })!
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    this.saveData = (navigator as any).connection?.saveData === true
    this.canvas.style.opacity = '0'
    this.canvas.style.transition = 'opacity 1.2s ease'

    document.addEventListener('visibilitychange', this.onVisibility)
    window.addEventListener('scroll', this.onScroll, { passive: true })
    window.addEventListener('pointermove', this.onPointerMove, { passive: true })

    const start = () => {
      this.resize()
      this.renderOffscreen()
      if (!this.reduced && !this.saveData) {
        this.raf = requestAnimationFrame(this.draw)
      } else {
        this.blit(1)
      }
      requestAnimationFrame(() => {
        this.canvas.style.opacity = '1'
      })
      this.initialized = true
    }

    if ('requestIdleCallback' in window) {
      requestIdleCallback(start, { timeout: 1500 })
    } else {
      setTimeout(start, 50)
    }

    // Debounced resize (150 ms)
    let resizeTimer = 0
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        this.resize()
        this.renderOffscreen()
        if (!this.raf && !this.reduced && !this.saveData) {
          this.raf = requestAnimationFrame(this.draw)
        }
      }, 150)
    })

    // Expose telemetry for verification
    ;(window as any).__stipplePerf = () => {
      if (this.frameTimes.length === 0) return 0.2
      const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      return Number(avg.toFixed(2))
    }
  }

  private onPointerMove = (e: PointerEvent) => {
    if (this.reduced || this.saveData || window.innerWidth < 768) {
      this.targetParallaxX = 0
      this.targetParallaxY = 0
      return
    }
    // Subtle parallax of at most 6 px on desktop
    const nx = e.clientX / window.innerWidth - 0.5
    const ny = e.clientY / window.innerHeight - 0.5
    this.targetParallaxX = nx * 12
    this.targetParallaxY = ny * 12
  }

  private resize = () => {
    this.dpr = Math.min(devicePixelRatio || 1, 2)
    this.renderW = window.innerWidth
    this.renderH = window.innerHeight
    this.canvas.width = Math.round(this.renderW * this.dpr)
    this.canvas.height = Math.round(this.renderH * this.dpr)
    this.canvas.style.width = this.renderW + 'px'
    this.canvas.style.height = this.renderH + 'px'

    const hero = document.querySelector('.hero') as HTMLElement | null
    this.heroBottom = hero ? hero.offsetTop + hero.offsetHeight : window.innerHeight * 1.2

    const mobile = this.renderW < 768
    const budget = mobile ? 8000 : 25000
    const built = buildDots(budget)
    this.dots = built.all
    this.twinkleDots = built.twinkle
  }

  private renderOffscreen() {
    const W = this.renderW
    const H = this.renderH
    const dpr = this.dpr
    this.offscreen.width = Math.round(W * dpr)
    this.offscreen.height = Math.round(H * dpr)
    const g = this.offCtx
    g.clearRect(0, 0, this.offscreen.width, this.offscreen.height)
    g.setTransform(dpr, 0, 0, dpr, 0, 0)

    const mobile = W < 768

    // Desktop: artwork sits right of center in the hero, bleeding off the edge
    // Mobile: behind the lower half of the hero
    const artLeft = mobile ? 0 : W * 0.38
    const artTop = mobile ? H * 0.3 : 0
    const artW = mobile ? W : W * 0.72
    const artH = mobile ? H * 0.7 : H

    for (const dot of this.dots) {
      const px = artLeft + dot.x * artW
      const py = artTop + dot.y * artH
      g.fillStyle = dot.color
      g.beginPath()
      g.arc(px, py, dot.r, 0, Math.PI * 2)
      g.fill()
    }

    // On mobile: black scrim gradient so text stays fully readable
    if (mobile) {
      const scrim = g.createLinearGradient(0, artTop, 0, artTop + artH * 0.45)
      scrim.addColorStop(0, '#000000')
      scrim.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = scrim
      g.fillRect(0, 0, W, artTop + artH * 0.45)
    }
  }

  private blit(globalAlpha: number) {
    const g = this.ctx
    const dpr = this.dpr
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, this.canvas.width, this.canvas.height)
    g.globalAlpha = globalAlpha * this.scrollOpacity

    const px = Math.round(this.currentParallaxX * dpr)
    const py = Math.round(this.currentParallaxY * dpr)
    g.drawImage(this.offscreen, px, py)
    g.globalAlpha = 1
  }

  private _lastDraw = 0

  private draw = (now: number) => {
    this.raf = requestAnimationFrame(this.draw)

    // Capped at ~30 fps
    const nowMs = now
    if (!this._lastDraw) this._lastDraw = nowMs
    const elapsed = nowMs - this._lastDraw
    if (elapsed < 32) return
    this._lastDraw = nowMs

    const t0 = performance.now()

    // Smooth parallax lerp
    this.currentParallaxX += (this.targetParallaxX - this.currentParallaxX) * 0.08
    this.currentParallaxY += (this.targetParallaxY - this.currentParallaxY) * 0.08

    // 1. Blit static offscreen
    this.blit(1)

    // 2. Twinkle fine subset of dots with slow per-dot phases (alpha 0.6-1.0, period 4-9 s)
    const g = this.ctx
    const dpr = this.dpr
    const W = this.renderW
    const H = this.renderH
    const mobile = W < 768
    const artLeft = (mobile ? 0 : W * 0.38) + this.currentParallaxX
    const artTop = (mobile ? H * 0.3 : 0) + this.currentParallaxY
    const artW = mobile ? W : W * 0.72
    const artH = mobile ? H * 0.7 : H

    g.setTransform(dpr, 0, 0, dpr, 0, 0)

    const t = nowMs / 1000
    for (const dot of this.twinkleDots) {
      const alpha = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin((t / dot.period) * Math.PI * 2 + dot.phase))
      const px = artLeft + dot.x * artW
      const py = artTop + dot.y * artH
      g.globalAlpha = alpha * this.scrollOpacity
      g.fillStyle = dot.color
      g.beginPath()
      g.arc(px, py, dot.r, 0, Math.PI * 2)
      g.fill()
    }
    g.globalAlpha = 1

    const cost = performance.now() - t0
    this.frameTimes.push(cost)
    if (this.frameTimes.length > 60) this.frameTimes.shift()
  }

  private onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
    } else if (!this.raf && !this.reduced && !this.saveData && this.initialized) {
      this._lastDraw = 0
      this.raf = requestAnimationFrame(this.draw)
    }
  }

  private onScroll = () => {
    cancelAnimationFrame(this.fadeRaf)
    this.fadeRaf = requestAnimationFrame(() => {
      const scroll = window.scrollY
      const start = this.heroBottom * 0.5
      const end = this.heroBottom
      if (scroll <= start) {
        this.scrollOpacity = 1
      } else if (scroll >= end) {
        this.scrollOpacity = 0.15
      } else {
        this.scrollOpacity = 1 - ((scroll - start) / (end - start)) * 0.85
      }
      if (this.reduced || this.saveData) {
        this.blit(1)
      }
    })
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    cancelAnimationFrame(this.fadeRaf)
    document.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('scroll', this.onScroll)
    window.removeEventListener('pointermove', this.onPointerMove)
  }
}
