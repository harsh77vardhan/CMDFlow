declare module 'vanta/dist/vanta.topology.min' {
  const TOPOLOGY: (options: Record<string, any>) => {
    destroy: () => void
    resize: () => void
    setOptions: (opts: Record<string, any>) => void
    pause?: () => void
    resume?: () => void
    el: HTMLElement
  }
  export default TOPOLOGY
}
