type Mote = {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  alpha: number
  hue: 'blue' | 'purple'
}

/**
 * A very quiet drifting field of light behind the page. It reuses the
 * template's approach of capping pixel ratio, pausing hidden tabs and
 * honouring reduced-motion preferences.
 */
export class AmbientBackground {
  private ctx: CanvasRenderingContext2D
  private motes: Mote[] = []
  private raf = 0
  private width = 0
  private height = 0
  private dpr = 1
  private last = 0
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: true })!
    this.resize()
    window.addEventListener('resize', this.resize)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.raf = requestAnimationFrame(this.draw)
  }

  resize = () => {
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.dpr = Math.min(devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(this.width * this.dpr)
    this.canvas.height = Math.round(this.height * this.dpr)
    this.seed()
  }

  private seed() {
    const count = Math.round(
      Math.min(70, Math.max(26, (this.width * this.height) / 26000)),
    )
    this.motes = Array.from({ length: count }, (_, i) => {
      const n = this.random(i * 31 + 7)
      return {
        x: this.random(i * 13 + 1) * this.width,
        y: this.random(i * 47 + 5) * this.height,
        r: 0.8 + this.random(i * 19 + 3) * 2.4,
        vx: (this.random(i * 23 + 9) - 0.5) * 7,
        vy: -(3 + this.random(i * 29 + 11) * 9),
        alpha: 0.12 + this.random(i * 37 + 13) * 0.36,
        hue: n > 0.58 ? 'purple' : 'blue',
      }
    })
  }

  private random(n: number) {
    const x = Math.sin(n * 78.233) * 43758.5453
    return x - Math.floor(x)
  }

  private onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
    } else if (!this.raf) {
      this.last = 0
      this.raf = requestAnimationFrame(this.draw)
    }
  }

  private draw = (now: number) => {
    this.raf = requestAnimationFrame(this.draw)
    const g = this.ctx
    const dt = this.reduced ? 0 : Math.min((now - (this.last || now)) / 1000, 0.05)
    this.last = now
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    g.clearRect(0, 0, this.width, this.height)
    for (const mote of this.motes) {
      mote.x += mote.vx * dt
      mote.y += mote.vy * dt
      if (mote.y < -20) {
        mote.y = this.height + 20
        mote.x = Math.random() * this.width
      }
      if (mote.x < -20) mote.x = this.width + 20
      if (mote.x > this.width + 20) mote.x = -20
      const gradient = g.createRadialGradient(
        mote.x,
        mote.y,
        0,
        mote.x,
        mote.y,
        mote.r * 7,
      )
      const tint = mote.hue === 'blue' ? '91, 140, 255' : '162, 116, 255'
      gradient.addColorStop(0, `rgba(${tint}, ${mote.alpha})`)
      gradient.addColorStop(1, `rgba(${tint}, 0)`)
      g.fillStyle = gradient
      g.beginPath()
      g.arc(mote.x, mote.y, mote.r * 7, 0, Math.PI * 2)
      g.fill()
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.resize)
    document.removeEventListener('visibilitychange', this.onVisibility)
  }
}
