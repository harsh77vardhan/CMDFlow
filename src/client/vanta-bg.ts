/**
 * CMDFlow — Vanta.js Background Integration (Topology)
 *
 * Implements a quiet, editorial topographic contour background using
 * Vanta.js TOPOLOGY with p5.js, lazy-loaded after first paint via requestIdleCallback.
 *
 * Requirements:
 *   - Pure black backdrop (0x000000).
 *   - Dim cool blue-gray elevation contours (0x224270).
 *   - No mouse controls or bright neon glows; calm and engineered.
 *   - Smooth fade-out past hero (opacity drops to 0.12 between 50% and 100% of hero height).
 *   - Fully disabled under prefers-reduced-motion or Save-Data (retaining pure #000).
 *   - Tab visibility lifecycle handling (pause/resume).
 *   - Dynamic scaleMobile for mobile GPU performance.
 */

export class VantaBackground {
  private container: HTMLElement
  private effect: any = null
  private reduced: boolean
  private saveData: boolean
  private scrollRaf = 0
  private heroBottom = 0

  constructor(container: HTMLElement) {
    this.container = container
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.saveData = (navigator as any).connection?.saveData === true

    this.container.style.opacity = '0'
    this.container.style.transition = 'opacity 0.8s ease'

    if (this.reduced || this.saveData) {
      // Under reduced motion or save-data, keep background purely static black
      return
    }

    let started = false
    const init = () => {
      if (started) return
      started = true
      this.initTopology()
    }

    const schedule = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          setTimeout(init, 2000)
        })
      } else {
        setTimeout(init, 2500)
      }
    }

    if (document.readyState === 'complete') {
      schedule()
    } else {
      window.addEventListener('load', schedule, { once: true })
    }

    const triggerNow = () => {
      window.removeEventListener('scroll', triggerNow)
      window.removeEventListener('pointerdown', triggerNow)
      window.removeEventListener('keydown', triggerNow)
      init()
    }
    window.addEventListener('scroll', triggerNow, { once: true, passive: true })
    window.addEventListener('pointerdown', triggerNow, { once: true, passive: true })
    window.addEventListener('keydown', triggerNow, { once: true, passive: true })

    document.addEventListener('visibilitychange', this.onVisibility)
    window.addEventListener('scroll', this.onScroll, { passive: true })
    window.addEventListener('resize', this.onResize, { passive: true })
  }

  private async initTopology() {
    try {
      const hero = document.querySelector('.hero') as HTMLElement | null
      this.heroBottom = hero ? hero.offsetTop + hero.offsetHeight : window.innerHeight

      const [p5Mod, topMod] = await Promise.all([
        import('p5'),
        import('vanta/dist/vanta.topology.min'),
      ])

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
        scaleMobile: 2.0, // Mobile performance optimization
      })

      requestAnimationFrame(() => {
        this.container.style.opacity = '1'
      })
    } catch (err) {
      console.warn('Vanta initialization skipped; fallback to black:', err)
      this.container.style.opacity = '1'
    }
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

  private onScroll = () => {
    cancelAnimationFrame(this.scrollRaf)
    this.scrollRaf = requestAnimationFrame(() => {
      const scroll = window.scrollY
      const start = this.heroBottom * 0.5
      const end = this.heroBottom
      let opacity = 1
      if (scroll <= start) {
        opacity = 1
      } else if (scroll >= end) {
        opacity = 0.12 // Fade to 12% opacity past hero
      } else {
        opacity = 1 - ((scroll - start) / (end - start)) * 0.88
      }
      this.container.style.opacity = String(opacity)
    })
  }

  private onResize = () => {
    const hero = document.querySelector('.hero') as HTMLElement | null
    this.heroBottom = hero ? hero.offsetTop + hero.offsetHeight : window.innerHeight
    if (this.effect && typeof this.effect.resize === 'function') {
      this.effect.resize()
    }
  }

  destroy() {
    cancelAnimationFrame(this.scrollRaf)
    document.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('scroll', this.onScroll)
    window.removeEventListener('resize', this.onResize)
    if (this.effect && typeof this.effect.destroy === 'function') {
      this.effect.destroy()
      this.effect = null
    }
  }
}
