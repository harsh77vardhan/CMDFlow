/**
 * CMDFlow — Vanta.js Background Integration (Topology)
 *
 * Implements a full-screen, fixed topographic contour background using
 * Vanta.js TOPOLOGY with p5.js, mounted directly on the full-screen layer.
 *
 * Requirements:
 *   - One fixed layer: position: fixed; inset: 0; width: 100vw; height: 100vh / 100lvh; z-index: 0
 *   - No hard-coded small holder; effect is mounted directly on this container.
 *   - Canvas scales 100% x 100% to fill the entire viewport seamlessly.
 *   - Constant opacity = 1 at all scroll positions (zero scroll-based fading/transitions).
 *   - Static black fallback under prefers-reduced-motion or Save-Data.
 *   - Tab visibility lifecycle handling (pause/resume).
 *   - Initialises after measured size equals viewport.
 *   - Resizes on ResizeObserver, window.resize, orientationchange, visualViewport.resize (100ms debounce), and fonts.ready.
 */

const modulesPromise = Promise.all([
  import('p5'),
  import('vanta/dist/vanta.topology.min'),
])

export class VantaBackground {
  private container: HTMLElement
  private effect: any = null
  private reduced: boolean
  private saveData: boolean
  private resizeObserver: ResizeObserver | null = null
  private debouncedResizeFn: (() => void) | null = null

  constructor(container: HTMLElement) {
    this.container = container
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.saveData = (navigator as any).connection?.saveData === true

    // Container starts at full opacity immediately with no transition
    this.container.style.opacity = '1'

    if (this.reduced || this.saveData) {
      // Static black fallback
      return
    }

    const start = () => {
      this.waitForSizeAndInit()
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true })
    } else {
      start()
    }
  }

  private waitForSizeAndInit() {
    const isReady = () => {
      const rect = this.container.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }

    if (isReady()) {
      this.initTopology()
    } else {
      const ro = new ResizeObserver(() => {
        if (isReady()) {
          ro.disconnect()
          this.initTopology()
        }
      })
      ro.observe(this.container)
    }
  }

  private async initTopology() {
    try {
      if (this.reduced || this.saveData) return

      const [p5Mod, topMod] = await modulesPromise

      if (this.reduced || this.saveData) return

      const p5 = (p5Mod as any).default?.default || (p5Mod as any).default || p5Mod
      const TOPOLOGY = (topMod as any).default?.default || (topMod as any).default || topMod
      ;(window as any).p5 = p5

      this.effect = TOPOLOGY({
        el: this.container,
        p5: p5,
        color: 0x224270, // Dim cool blue-gray
        backgroundColor: 0x000000, // Pure black
        mouseControls: false,
        touchControls: false,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        scale: 1.0,
        scaleMobile: 1.0,
      })

      ;(window as any).__vanta = this.effect

      // Fast-forward simulation trails in small slices to eliminate long tasks
      const runPrewarm = () => {
        let left = 20
        const tick = () => {
          if (!this.effect) return
          if (this.effect.p5 && typeof this.effect.p5.draw === 'function') {
            const count = Math.min(left, 4)
            for (let i = 0; i < count; i++) {
              this.effect.p5.draw()
            }
            left -= count
            if (left > 0) requestAnimationFrame(tick)
          } else {
            requestAnimationFrame(tick)
          }
        }
        requestAnimationFrame(tick)
      }
      runPrewarm()

      // Override built-in Vanta resize to safely restart on dimension change
      // (avoiding out-of-bounds vector field crash in p5 TOPOLOGY)
      const origVantaResize = this.effect.resize
      window.removeEventListener('resize', origVantaResize)
      this.effect.resize = () => {
        if (!this.effect) return
        if (typeof this.effect.setSize === 'function') this.effect.setSize()
        if (typeof this.effect.restart === 'function') {
          this.effect.restart()
          runPrewarm()
        }
      }

      this.container.style.opacity = '1'
      this.setupObservers()
    } catch (err) {
      console.warn('Vanta initialization skipped; fallback to black:', err)
      this.container.style.opacity = '1'
    }
  }

  private setupObservers() {
    let resizeTimer: any = null
    const debouncedResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        if (this.effect && typeof this.effect.resize === 'function') {
          this.effect.resize()
        }
      }, 100)
    }
    this.debouncedResizeFn = debouncedResize

    this.resizeObserver = new ResizeObserver(() => debouncedResize())
    this.resizeObserver.observe(this.container)

    window.addEventListener('resize', debouncedResize, { passive: true })
    window.addEventListener('orientationchange', debouncedResize, { passive: true })
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', debouncedResize, { passive: true })
    }
    if ((document as any).fonts?.ready) {
      (document as any).fonts.ready.then(() => debouncedResize()).catch(() => {})
    }

    document.addEventListener('visibilitychange', this.onVisibility)
  }

  private onVisibility = () => {
    if (!this.effect) return
    if (document.hidden) {
      if (typeof this.effect.pause === 'function') {
        this.effect.pause()
      }
    } else {
      if (typeof this.effect.resume === 'function') {
        this.effect.resume()
      }
    }
  }

  destroy() {
    document.removeEventListener('visibilitychange', this.onVisibility)
    if (this.debouncedResizeFn) {
      window.removeEventListener('resize', this.debouncedResizeFn)
      window.removeEventListener('orientationchange', this.debouncedResizeFn)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', this.debouncedResizeFn)
      }
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    if (this.effect && typeof this.effect.destroy === 'function') {
      this.effect.destroy()
      this.effect = null
    }
  }
}
