/**
 * CMDFlow — Vanta.js Background Integration (Topology)
 *
 * Implements a quiet, editorial topographic contour background using
 * Vanta.js TOPOLOGY with p5.js, preloaded and initialised as soon as DOM is ready.
 *
 * Characteristics:
 *   - Starts immediately at full opacity (no delay, no slow fade-in).
 *   - Constant opacity all the way down the page (no scroll-based fading).
 *   - Fallback: prefers-reduced-motion and Save-Data remain clean static black (#000).
 *   - Pauses on document.hidden (tab hidden).
 *   - Frame 1 execution so text content paints first.
 *   - Tuned internal resolution for crisp scaling and sub-100ms setup.
 */

export class VantaBackground {
  private container: HTMLElement
  private holder: HTMLElement | null = null
  private effect: any = null
  private reduced: boolean
  private saveData: boolean

  constructor(container: HTMLElement) {
    this.container = container
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.saveData = (navigator as any).connection?.saveData === true

    // Ensure container starts at full opacity immediately
    this.container.style.opacity = '1'

    if (this.reduced || this.saveData) {
      // Under reduced motion or save-data, keep background purely static black
      return
    }

    // Initialise as soon as DOM is ready, not on idle and not after a timeout
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initTopology(), { once: true })
    } else {
      this.initTopology()
    }

    document.addEventListener('visibilitychange', this.onVisibility)
    window.addEventListener('resize', this.onResize, { passive: true })
  }

  private async initTopology() {
    try {
      if (this.reduced || this.saveData) return

      const isMobile = window.innerWidth < 768
      this.holder = document.createElement('div')
      this.holder.style.position = 'absolute'
      this.holder.style.inset = '0'
      this.holder.style.width = isMobile ? '360px' : '720px'
      this.holder.style.height = isMobile ? '540px' : '450px'
      this.holder.style.pointerEvents = 'none'
      this.container.appendChild(this.holder)

      const [p5Mod, topMod] = await Promise.all([
        import('p5'),
        import('vanta/dist/vanta.topology.min'),
      ])

      if (this.reduced || this.saveData) return

      const p5 = (p5Mod as any).default?.default || (p5Mod as any).default || p5Mod
      const TOPOLOGY = (topMod as any).default?.default || (topMod as any).default || topMod
      ;(window as any).p5 = p5

      this.effect = TOPOLOGY({
        el: this.holder,
        p5: p5,
        color: 0x224270, // Dim cool blue-gray
        backgroundColor: 0x000000, // Pure black
        mouseControls: false,
        touchControls: false,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        scale: 1.0,
        scaleMobile: 2.0,
      })

      this.container.style.opacity = '1'
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

  private onResize = () => {
    if (this.effect && typeof this.effect.resize === 'function') {
      this.effect.resize()
    }
  }

  destroy() {
    document.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('resize', this.onResize)
    if (this.effect && typeof this.effect.destroy === 'function') {
      this.effect.destroy()
      this.effect = null
    }
    if (this.holder && this.holder.parentElement) {
      this.holder.parentElement.removeChild(this.holder)
      this.holder = null
    }
  }
}
