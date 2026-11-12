export type Tone = 'accent' | 'ok' | 'dim' | 'warn'
export type OutputLine = { text: string; tone?: Tone }

export type Step =
  | { kind: 'type'; text: string }
  | { kind: 'wait'; ms: number }
  | { kind: 'output'; lines: OutputLine[] }
  | { kind: 'clear' }

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

const jitter = (min: number, max: number) => min + Math.random() * (max - min)

export function printLine(container: HTMLElement, line: OutputLine) {
  const row = document.createElement('div')
  row.className = `term-line${line.tone ? ` term-line--${line.tone}` : ''}`
  row.textContent = line.text
  container.append(row)
}

export async function printLines(container: HTMLElement, lines: OutputLine[]) {
  for (const line of lines) {
    printLine(container, line)
    if (!reduceMotion) await new Promise((r) => setTimeout(r, 110))
  }
}

/**
 * Types text one character at a time with human-ish cadence. Returns early
 * when `alive` reports the run has been superseded.
 */
export async function typeText(
  el: HTMLElement,
  text: string,
  alive: () => boolean = () => true,
) {
  el.textContent = ''
  if (reduceMotion) {
    el.textContent = text
    return
  }
  for (const char of text) {
    if (!alive()) return
    el.textContent += char
    const pause =
      char === ' ' ? jitter(55, 95) : char === '/' ? jitter(90, 150) : jitter(34, 78)
    await new Promise((r) => setTimeout(r, pause))
    if (!alive()) return
  }
}

/** Loops a scripted sequence inside a terminal window. */
export class TerminalTyper {
  private alive = true
  private wake: (() => void) | null = null

  constructor(
    private readonly ui: { typed: HTMLElement; lines: HTMLElement },
    private readonly steps: Step[],
  ) {}

  stop() {
    this.alive = false
    this.wake?.()
  }

  async start() {
    while (this.alive) {
      for (const step of this.steps) {
        if (!this.alive) return
        await this.play(step)
      }
    }
  }

  private wait(ms: number) {
    return new Promise<void>((resolve) => {
      const id = window.setTimeout(() => {
        this.wake = null
        resolve()
      }, ms)
      this.wake = () => {
        window.clearTimeout(id)
        this.wake = null
        resolve()
      }
    })
  }

  private async play(step: Step) {
    if (step.kind === 'wait') return this.wait(step.ms)
    if (step.kind === 'clear') {
      this.ui.lines.replaceChildren()
      this.ui.typed.textContent = ''
      return
    }
    if (step.kind === 'output') {
      if (step.lines.length) await this.wait(160)
      await printLines(this.ui.lines, step.lines)
      return this.wait(1500)
    }
    await typeText(this.ui.typed, step.text, () => this.alive)
    await this.wait(420)
  }
}
