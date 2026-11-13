import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource/instrument-serif/400-italic.css'
import './style.css'
import starterPack from '../../shared/starter-pack.json'
import { StippleBackground } from './background'
import {
  TerminalTyper,
  printLines,
  typeText,
  type OutputLine,
  type Step,
} from './terminal'

const icons = {
  arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  github:
    '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4M9 18c-4.51 2-5-2-7-2"/>',
  command:
    '<path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0 3-3"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  folder:
    '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  branch:
    '<path d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM15 6a9 9 0 0 0-9 9"/>',
  layers: '<path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5"/>',
  sparkles:
    '<path d="m12 3-1.9 5.8L4 10.7l5.7 1.9L12 18.4l1.9-5.8 5.7-1.9-5.7-1.9L12 3ZM19 15l-.9 2.6L15.5 19l2.6.9L19 22.5l.9-2.6L22.5 19l-2.6-.9L19 15Z"/>',
  flow: '<path d="M3 4h6v4H3zM15 16h6v4h-6zM6 8v4a2 2 0 0 0 2 2h7"/>',
  package:
    '<path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.3 7 12 12l8.7-5M12 22V12"/>',
  blocks:
    '<path d="M10 22V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H2M14 2h8v8h-8z"/>',
  sliders:
    '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  shield:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  search: '<path d="m21 21-4.34-4.34M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  scale:
    '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  zap: '<path d="m13 2-8 12h6l-1 8 9-12h-6l1-8Z"/>',
  monitor:
    '<path d="M4 3h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM8 21h8M12 15v6"/>',
  lock: '<path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4"/>',
  clock: '<path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
}

type IconName = keyof typeof icons
const icon = (name: IconName) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`

const $ = <T extends HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

/* ------------------------------------------------------------------ *
 * Content
 * ------------------------------------------------------------------ */

type Feature = {
  icon: IconName
  title: string
  text: string
  body: string
  wide?: boolean
  planned?: boolean
}

let featureIndex = 0
const feature = (f: Feature) => {
  featureIndex++
  const num = String(featureIndex).padStart(2, '0')
  return `
  <div class="feature-row" data-reveal>
    <span class="feature-num">${num}</span>
    <div class="feature-title-group">
      <span class="feature-title">
        ${f.title}
        ${f.planned ? '<span class="pill">Planned</span>' : ''}
      </span>
      <p class="feature-desc">${f.text}</p>
    </div>
    <div class="feature-body">
      ${f.body}
    </div>
  </div>`
}

const cmd = (text: string) =>
  `<div class="snip-line"><span class="snip-mark">❯</span><code>${text}</code></div>`
const out = (text: string) =>
  `<div class="snip-line snip-line--out"><span class="snip-mark">↳</span><code>${text}</code></div>`
const snip = (inner: string) => `<div class="snip">${inner}</div>`

const features: Feature[] = [
  {
    icon: 'command',
    title: 'Custom aliases',
    text: 'Turn the commands you repeat all day into one or two characters.',
    wide: true,
    body: `<div class="pair">
        <div><span class="pair-label">Before</span>${snip(cmd('cd ../'))}</div>
        <div><span class="pair-label">After</span>${snip(cmd('b'))}</div>
      </div>`,
  },
  {
    icon: 'folder',
    title: 'Project shortcuts',
    text: 'Give every repository a name you can actually remember.',
    body: `<div class="stack">
        ${snip(cmd('project technea'))}
        <span class="stack-arrow">↓</span>
        ${snip(out('cd ~/Documents/Technea'))}
      </div>`,
  },
  {
    icon: 'branch',
    title: 'Context awareness',
    text: 'The same shortcut can mean different things in different places.',
    body: `<div class="context">
        <div><span class="pair-label">In a Git repo</span>${snip(`${cmd('s')}${out('git status')}`)}</div>
        <div><span class="pair-label">Elsewhere</span>${snip(`${cmd('s')}${out('ls')}`)}</div>
      </div>`,
  },
  {
    icon: 'flow',
    title: 'Automation flows',
    text: 'Bundle a whole routine behind one word, with progress as it runs.',
    wide: true,
    body: `<div class="stack">
        ${snip(cmd('deploy'))}
        ${snip(`<div class="flow-lines">
          <div class="flow-line">${icon('check')}Pull latest changes</div>
          <div class="flow-line">${icon('check')}Install dependencies</div>
          <div class="flow-line">${icon('check')}Run tests</div>
          <div class="flow-line is-running"><span class="flow-spinner"></span>Build project</div>
        </div>`)}
      </div>`,
  },
  {
    icon: 'sliders',
    title: 'Fully customizable',
    text: 'Aliases, projects, themes, profiles and flows all live in one config.',
    body: `<div class="chips"><span class="chip">Aliases</span><span class="chip">Projects</span><span class="chip">Flows</span><span class="chip">Themes</span><span class="chip">Profiles</span></div>`,
  },
]

type Demo = { label: string; command: string; output: OutputLine[] }

const demos: Demo[] = [
  { label: 'b', command: 'b', output: [{ text: 'cd ..', tone: 'accent' }] },
  { label: 'gs', command: 'gs', output: [{ text: 'git status', tone: 'accent' }] },
  { label: 'll', command: 'll', output: [{ text: 'ls -lah', tone: 'accent' }] },
  {
    label: 'home',
    command: 'home',
    output: [{ text: 'cd ~', tone: 'accent' }],
  },
  {
    label: 'project technea',
    command: 'project technea',
    output: [{ text: 'cd ~/Documents/Technea', tone: 'accent' }],
  },
  {
    label: 'delete node modules',
    command: 'delete node modules',
    output: [
      { text: 'AI suggestion — nothing runs without you', tone: 'warn' },
      { text: 'rm -rf node_modules', tone: 'accent' },
    ],
  },
  {
    label: 'deploy',
    command: 'deploy',
    output: [
      { text: 'Flow: deploy', tone: 'dim' },
      { text: '✓ Pull latest changes', tone: 'ok' },
      { text: '✓ Install dependencies', tone: 'ok' },
      { text: '✓ Run tests', tone: 'ok' },
      { text: '✓ Build project', tone: 'ok' },
      { text: 'Done in 42s', tone: 'accent' },
    ],
  },
]

type SettingsRow = {
  label: string
  hint?: string
  value?: string
  control?: 'toggle' | 'select' | 'text'
  on?: boolean
  mono?: boolean
}

type Pane =
  | { tab: string; title: string; sub: string; kind: 'rows'; rows: SettingsRow[] }
  | { tab: string; title: string; sub: string; kind: 'aliases' }
  | { tab: string; title: string; sub: string; kind: 'flows' }
  | { tab: string; title: string; sub: string; kind: 'theme' }

const aliasPairs = starterPack.aliases.map((a: { name: string; expansion: string }) => [
  a.name,
  a.expansion,
])

const deploySteps =
  starterPack.flows[0]?.steps.map((s: { run: string }) => s.run) ?? [
    'git pull',
    'npm install',
    'npm test',
    'npm run build',
  ]

const panes: Pane[] = [
  {
    tab: 'General',
    title: 'General',
    sub: 'How CMDFlow behaves in your shell.',
    kind: 'rows',
    rows: [
      { label: 'Show command expansions', hint: 'Preview the real command before it runs', control: 'toggle', on: true },
      { label: 'Confirm destructive commands', hint: 'Always ask before removing or overwriting', control: 'toggle', on: true },
      { label: 'Inline autocomplete', control: 'toggle', on: true },
      { label: 'Default shell', value: 'zsh', control: 'select' },
      { label: 'Config location', value: '~/.config/cmdflow', control: 'text', mono: true },
    ],
  },
  {
    tab: 'Aliases',
    title: 'Aliases',
    sub: 'Your shorthand, mapped to real commands.',
    kind: 'aliases',
  },
  {
    tab: 'Projects',
    title: 'Projects',
    sub: 'Names you think in, paths you do not.',
    kind: 'rows',
    rows: [
      { label: 'technea', value: '~/Documents/Technea', mono: true },
      { label: 'cmdflow', value: '~/dev/cmdflow', mono: true },
      { label: 'api', value: '~/dev/technea/api', mono: true },
      { label: 'dotfiles', value: '~/.dotfiles', mono: true },
    ],
  },
  {
    tab: 'Flows',
    title: 'Flows',
    sub: 'Multi-step routines behind a single word.',
    kind: 'flows',
  },
  {
    tab: 'Plugins',
    title: 'Plugins',
    sub: 'Small extensions that add commands and integrations.',
    kind: 'rows',
    rows: [
      { label: 'Git pack', hint: 'Branches, rebase and stash shortcuts', control: 'toggle', on: true },
      { label: 'Docker pack', hint: 'Compose, logs and clean-up commands', control: 'toggle', on: true },
      { label: 'AI tools', hint: 'Command generation and explanation', control: 'toggle', on: false },
      { label: 'Themes', control: 'toggle', on: true },
    ],
  },
  {
    tab: 'Theme',
    title: 'Theme',
    sub: 'Dark by default. Tuned to your taste.',
    kind: 'theme',
  },
  {
    tab: 'Profiles',
    title: 'Profiles',
    sub: 'Different setups for different work.',
    kind: 'rows',
    rows: [
      { label: 'Personal', hint: 'Default · 42 aliases · 3 flows', value: 'Active', control: 'select' },
      { label: 'Work', hint: '18 aliases · 6 project shortcuts', value: 'Switch', control: 'select' },
      { label: 'Sync profiles across machines', control: 'toggle', on: true },
    ],
  },
  {
    tab: 'AI',
    title: 'AI',
    sub: 'An assistant that explains before it acts.',
    kind: 'rows',
    rows: [
      { label: 'Always ask before running', hint: 'Never execute a suggestion automatically', control: 'toggle', on: true },
      { label: 'Explain commands', hint: 'Plain-language summary of every suggestion', control: 'toggle', on: true },
      { label: 'Suggest fixes after errors', control: 'toggle', on: false },
      { label: 'Model', value: 'On-device first', control: 'select' },
    ],
  },
]

const roadmap = [
  { version: 'Version 1', title: 'Custom aliases', text: 'Short commands, real expansion preview, safe defaults.', shipped: true },
  { version: 'Version 2', title: 'Projects', text: 'Named project shortcuts and per-project aliases.', now: true },
  { version: 'Version 3', title: 'Workspaces', text: 'Launch an entire environment from one word.' },
  { version: 'Version 4', title: 'Automation flows', text: 'Multi-step routines with live progress.' },
  { version: 'Version 5', title: 'AI assistant', text: 'Natural language, explanations and error fixes.' },
  { version: 'Version 6', title: 'Plugin marketplace', text: 'Install and share extensions safely.' },
  { version: 'Version 7', title: 'Community packs', text: 'Curated shortcut packs for common stacks.' },
]

const aiCapabilities = [
  { icon: 'chat' as IconName, title: 'Natural language', text: '“compress this folder” becomes the right archive command.' },
  { icon: 'book' as IconName, title: 'Command explanation', text: 'Every flag summarised in one plain sentence.' },
  { icon: 'sparkles' as IconName, title: 'Command generation', text: 'Describe the goal; get a command you can read first.' },
  { icon: 'shield' as IconName, title: 'Error fixing', text: 'Reads the failure and proposes a narrowly scoped fix.' },
  { icon: 'search' as IconName, title: 'History search', text: 'Ask for “the rsync from last week” and get it back.' },
  { icon: 'lock' as IconName, title: 'Safe execution', text: 'Dangerous commands are shown, never run silently.' },
]

/* ------------------------------------------------------------------ *
 * Markup
 * ------------------------------------------------------------------ */

$('#app').innerHTML = `
  <canvas id="stipple-bg" aria-hidden="true" style="position:fixed;inset:0;z-index:0;pointer-events:none;"></canvas>

  <a class="skip-link" href="#main-content">Skip to content</a>

  <header class="nav" id="nav">
    <div class="nav-inner">
      <a class="brand" href="#top" aria-label="CMDFlow home">
        <span class="logo">${icon('command')}</span>
        <span class="brand-word">CMD<span>Flow</span></span>
      </a>
      <nav class="nav-links" id="nav-links" aria-label="Main">
        <a href="#features">Features</a>
        <a href="#demo">Demo</a>
        <a href="#install">Install</a>
        <a href="#settings">Settings</a>
        <a href="#roadmap">Roadmap</a>
        <a href="#docs">Docs</a>
      </nav>
      <div class="nav-actions">
        <a class="text-button nav-github" href="https://github.com/harsh77vardhan/CMDFlow" target="_blank" rel="noopener noreferrer">${icon('github')}<span>GitHub</span></a>
        <a class="primary primary--sm download-btn" id="nav-download-btn" href="https://github.com/harsh77vardhan/CMDFlow/releases/latest" target="_blank" rel="noopener noreferrer"><span class="download-label">Download v1.0.3</span>${icon('arrow')}</a>
        <button class="icon-button nav-toggle" id="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="nav-links">${icon('menu')}</button>
      </div>
    </div>
  </header>

  <main id="main-content">
    <section class="hero" id="top">
      <div class="hero-inner">
        <div class="hero-copy">
          <span class="eyebrow" data-reveal><span class="live-dot"></span>Command layer for Bash, Zsh, Fish and PowerShell</span>
          <h1 class="headline" data-reveal>The terminal,<br><span class="grad"><em>finally</em> yours.</span></h1>
          <p class="lede" data-reveal>Build a command language that maps to the way you think. No new shell, no new habits — just your existing shell, speaking your language.</p>
          <div class="hero-actions" data-reveal>
            <a class="primary download-btn" id="hero-download-btn" href="https://github.com/harsh77vardhan/CMDFlow/releases/latest" target="_blank" rel="noopener noreferrer"><span class="download-label">Download CMDFlow v1.0.3</span>${icon('download')}</a>
            <a class="secondary" href="https://github.com/harsh77vardhan/CMDFlow" target="_blank" rel="noopener noreferrer">${icon('github')}<span>View on GitHub</span></a>
          </div>
          <div class="hero-install" data-reveal>
            <code>curl -fsSL https://cmdflow.cmdflow.workers.dev/install.sh | bash</code>
            <button class="copy-btn" data-copy="curl -fsSL https://cmdflow.cmdflow.workers.dev/install.sh | bash" aria-label="Copy install command">${icon('copy')}<span>Copy</span></button>
          </div>
          <div class="hero-platforms" data-reveal>
            <span class="hero-platforms-label">Other platforms:</span>
            <a href="https://github.com/harsh77vardhan/CMDFlow/releases/latest/download/cmdflow-linux-x86_64.tar.gz" class="platform-chip" target="_blank" rel="noopener noreferrer">Linux (x86_64)</a>
            <span class="platform-sep">·</span>
            <a href="https://github.com/harsh77vardhan/CMDFlow/releases/latest/download/cmdflow-darwin-arm64.tar.gz" class="platform-chip" target="_blank" rel="noopener noreferrer">macOS (Apple Silicon)</a>
            <span class="platform-sep">·</span>
            <a href="https://github.com/harsh77vardhan/CMDFlow/releases/latest/download/cmdflow-darwin-x86_64.tar.gz" class="platform-chip" target="_blank" rel="noopener noreferrer">macOS (Intel)</a>
            <span class="platform-sep">·</span>
            <a href="https://github.com/harsh77vardhan/CMDFlow/releases/latest/download/cmdflow-windows-x86_64.zip" class="platform-chip" target="_blank" rel="noopener noreferrer">Windows (x86_64)</a>
            <span class="platform-sep">·</span>
            <a href="https://github.com/harsh77vardhan/CMDFlow/releases/latest/download/SHA256SUMS.txt" class="platform-chip platform-chip--sums" target="_blank" rel="noopener noreferrer">SHA256SUMS.txt</a>
          </div>
        </div>

        <div class="hero-visual" data-reveal>
          <div class="terminal terminal--hero">
            <div class="terminal-bar">
              <span class="terminal-dots" aria-hidden="true"><i></i><i></i><i></i></span>
              <span class="terminal-title">CMDFlow — zsh</span>
              <span class="terminal-live"><span class="live-dot"></span>translating</span>
            </div>
            <div class="terminal-body">
              <div class="terminal-path">~/dev/technea</div>
              <div class="term-lines" id="hero-lines" aria-live="polite"></div>
              <div class="term-input">
                <span class="term-user">you@mac</span>
                <span class="term-chevron">❯</span>
                <span class="term-typed" id="hero-typed"></span>
                <span class="cursor" aria-hidden="true"></span>
              </div>
            </div>
            <div class="terminal-foot">
              <span>Shorthand in. Real commands out.</span>
              <span class="terminal-shell">fish · bash · zsh · pwsh</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="shellbar" aria-label="Supported shells">
      <div class="shellbar-inner">
        <span class="shellbar-label">Drops into the shell you already use</span>
        <ul>
          <li>Fish</li><li>Bash</li><li>Zsh</li><li>PowerShell</li>
        </ul>
        <span class="shellbar-note">One config, any shell.</span>
      </div>
    </section>

    <section class="section" id="install">
      <div class="section-inner">
        <div class="section-head" data-reveal>
          <span class="section-label">Quick install</span>
          <h2 class="section-title">Drop into your terminal in seconds.</h2>
          <p class="section-lede">Run the one-liner for your shell. CMDFlow integrates with Fish, Bash, Zsh, and PowerShell with zero dependencies.</p>
        </div>
        <div class="install-grid" data-reveal>
          <div class="install-card">
            <div class="install-card-head">
              <span class="install-badge">${icon('terminal')}Linux &amp; macOS (Bash, Zsh, Fish)</span>
              <button class="copy-btn" data-copy="curl -fsSL https://cmdflow.cmdflow.workers.dev/install.sh | bash" aria-label="Copy Linux/macOS install command">
                ${icon('copy')}<span>Copy</span>
              </button>
            </div>
            <pre class="install-code"><code>curl -fsSL https://cmdflow.cmdflow.workers.dev/install.sh | bash</code></pre>
          </div>
          <div class="install-card">
            <div class="install-card-head">
              <span class="install-badge">${icon('monitor')}Windows (PowerShell)</span>
              <button class="copy-btn" data-copy="iwr -useb https://cmdflow.cmdflow.workers.dev/install.ps1 | iex" aria-label="Copy PowerShell install command">
                ${icon('copy')}<span>Copy</span>
              </button>
            </div>
            <pre class="install-code"><code>iwr -useb https://cmdflow.cmdflow.workers.dev/install.ps1 | iex</code></pre>
          </div>
        </div>
        <div class="install-footer" data-reveal>
          <span>Looking for direct binaries?</span>
          <a href="https://github.com/harsh77vardhan/CMDFlow/releases/latest" target="_blank" rel="noopener noreferrer">View all assets on GitHub Releases →</a>
        </div>
      </div>
    </section>

    <section class="section" id="features">
      <div class="section-inner">
        <div class="section-head" data-reveal>
          <span class="section-label">Features</span>
          <h2 class="section-title">Your terminal, on your terms.</h2>
          <p class="section-lede">Small building blocks that turn a wall of flags into a language you invented.</p>
        </div>
        <div class="feature-list">
          ${(featureIndex = 0, features.map(feature).join(''))}
        </div>
        <p class="note" data-reveal>CMDFlow is in early development. Features marked <span class="pill pill--inline">Planned</span> are being designed, not shipped.</p>
      </div>
    </section>

    <section class="tagline-section" aria-label="Tagline">
      <div class="tagline-inner" data-reveal>
        <span class="tagline-label">Why CMDFlow</span>
        <p class="tagline-text" id="tagline-text">
          You already know what you want the terminal to do.
          CMDFlow just lets you say it your way.
        </p>
      </div>
    </section>

    <section class="section" id="demo">
      <div class="section-inner">
        <div class="section-head" data-reveal>
          <span class="section-label">Interactive demo</span>
          <h2 class="section-title">See it translate in real time.</h2>
          <p class="section-lede">Pick a command on the left. Watch CMDFlow expand it to the real thing.</p>
        </div>
        <div class="demo-layout" data-reveal>
          <div>
            <div class="demo-menu" id="demo-buttons" aria-label="Demo commands">
              ${demos
                .map(
                  (d, i) =>
                    `<button class="demo-button${i === 0 ? ' is-active' : ''}" data-demo="${i}" aria-pressed="${i === 0}"><span class="demo-key">${d.label}</span>${icon('arrow')}</button>`,
                )
                .join('')}
            </div>
            <div class="demo-caption" id="demo-caption" aria-live="polite">b → cd ..</div>
          </div>
          <div>
            <div class="terminal">
              <div class="terminal-bar">
                <span class="terminal-dots" aria-hidden="true"><i></i><i></i><i></i></span>
                <span class="terminal-title">CMDFlow demo</span>
                <button class="demo-reset" id="demo-reset" aria-label="Reset demo">Reset</button>
              </div>
              <div class="terminal-body">
                <div class="terminal-path">~/dev/technea</div>
                <div class="term-lines" id="demo-lines" aria-live="polite"></div>
                <div class="term-input">
                  <span class="term-user">you@mac</span>
                  <span class="term-chevron">❯</span>
                  <span class="term-typed" id="demo-typed"></span>
                  <span class="cursor" aria-hidden="true"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="settings">
      <div class="section-inner">
        <div class="section-head" data-reveal>
          <span class="section-label">Settings preview</span>
          <h2 class="section-title">One config file, every setting.</h2>
          <p class="section-lede">Aliases, project shortcuts, automation flows, themes and AI behavior — all controlled from a single TOML file or the UI.</p>
        </div>
        <div class="settings-layout" data-reveal>
          <div class="settings-sidebar">
            <div class="settings-sidebar-head">
              <span class="settings-sidebar-title">CMDFlow Settings <span class="settings-version">v1.0.3</span></span>
            </div>
            <div id="settings-tabs" role="tablist" aria-label="Settings sections"></div>
          </div>
          <div class="settings-pane" id="settings-pane" role="tabpanel"></div>
        </div>
      </div>
    </section>

    <section class="section" id="roadmap">
      <div class="section-inner">
        <div class="section-head" data-reveal>
          <span class="section-label">Roadmap</span>
          <h2 class="section-title">Built in small, honest steps.</h2>
          <p class="section-lede">No release dates promised. Just the order things are being built in.</p>
        </div>
        <div class="roadmap-list" data-reveal>
          ${roadmap.map((r) => `
          <div class="roadmap-item">
            <span class="roadmap-label">${r.version}</span>
            <span class="roadmap-title">${r.title}${r.now ? ' <span class="pill pill--inline">In progress</span>' : ''}</span>
            <span class="roadmap-status ${r.shipped ? 'roadmap-status--shipped' : r.now ? 'roadmap-status--in-progress' : 'roadmap-status--planned'}">${r.shipped ? 'Shipped' : r.now ? 'In progress' : 'Planned'}</span>
          </div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section" id="docs">
      <div class="section-inner">
        <div class="section-head" data-reveal>
          <span class="section-label">Documentation</span>
          <h2 class="section-title">Everything you need to know.</h2>
          <p class="section-lede">Specifications, security threat models, shell hooks, flows and contributing guidelines.</p>
        </div>
        <div class="docs-grid" data-reveal>
          <a class="doc-card" href="https://github.com/harsh77vardhan/CMDFlow/blob/main/docs/SPEC.md" target="_blank" rel="noopener noreferrer">
            <span class="doc-card-label">${icon('book')}Technical spec</span>
            <div class="doc-card-title">Architecture &amp; Resolve Engine</div>
            <p class="doc-card-desc">Layered TOML resolution, sub-20ms resolve, and the full command model.</p>
            <span class="doc-card-link">docs/SPEC.md →</span>
          </a>
          <a class="doc-card" href="https://github.com/harsh77vardhan/CMDFlow/blob/main/docs/SECURITY.md" target="_blank" rel="noopener noreferrer">
            <span class="doc-card-label">${icon('shield')}Security</span>
            <div class="doc-card-title">Threat Model &amp; Sandboxing</div>
            <p class="doc-card-desc">Project trust boundaries, injection defense, and permission scopes.</p>
            <span class="doc-card-link">docs/SECURITY.md →</span>
          </a>
          <a class="doc-card" href="https://github.com/harsh77vardhan/CMDFlow/blob/main/docs/SHELLS.md" target="_blank" rel="noopener noreferrer">
            <span class="doc-card-label">${icon('branch')}Shell integration</span>
            <div class="doc-card-title">Directive Protocol</div>
            <p class="doc-card-desc">Zoxide-style hooks for Bash, Zsh, Fish, and PowerShell.</p>
            <span class="doc-card-link">docs/SHELLS.md →</span>
          </a>
          <a class="doc-card" href="https://github.com/harsh77vardhan/CMDFlow/blob/main/docs/FLOWS.md" target="_blank" rel="noopener noreferrer">
            <span class="doc-card-label">${icon('flow')}Automation flows</span>
            <div class="doc-card-title">Pipelines &amp; Step Streaming</div>
            <p class="doc-card-desc">Sequential pipelines, live step streaming, and directory tracking.</p>
            <span class="doc-card-link">docs/FLOWS.md →</span>
          </a>
          <a class="doc-card" href="https://github.com/harsh77vardhan/CMDFlow/blob/main/docs/AI.md" target="_blank" rel="noopener noreferrer">
            <span class="doc-card-label">${icon('sparkles')}AI &amp; risk classifier</span>
            <div class="doc-card-title">Deterministic Safety Rules</div>
            <p class="doc-card-desc">AST/regex classifier, gated approval, and risk boundaries.</p>
            <span class="doc-card-link">docs/AI.md →</span>
          </a>
          <a class="doc-card" href="https://github.com/harsh77vardhan/CMDFlow/blob/main/docs/PLUGINS.md" target="_blank" rel="noopener noreferrer">
            <span class="doc-card-label">${icon('blocks')}Plugin system</span>
            <div class="doc-card-title">Subprocess Extensions</div>
            <p class="doc-card-desc">Declared permissions, prompt hooks, and the extension API.</p>
            <span class="doc-card-link">docs/PLUGINS.md →</span>
          </a>
        </div>
        <div class="docs-footer" data-reveal>
          <a href="https://github.com/harsh77vardhan/CMDFlow/tree/main/docs" target="_blank" rel="noopener noreferrer">${icon('book')} Browse complete documentation directory on GitHub →</a>
        </div>
      </div>
    </section>

    <section class="section" id="waitlist">
      <div class="section-inner">
        <div class="waitlist-layout" data-reveal>
          <div class="waitlist-copy">
            <h2>Make the terminal feel like yours.</h2>
            <p>Get early access when it opens and help shape what CMDFlow becomes. No spam, no noise — just a note when the first build ships.</p>
            <div class="cta-actions">
              <a class="primary download-btn" id="cta-download-btn" href="https://github.com/harsh77vardhan/CMDFlow/releases/latest" target="_blank" rel="noopener noreferrer"><span class="download-label">Download CMDFlow</span>${icon('download')}</a>
              <a class="secondary" href="https://github.com/harsh77vardhan/CMDFlow" target="_blank" rel="noopener noreferrer">${icon('github')}<span>View on GitHub</span></a>
            </div>
          </div>
          <div>
            <form class="waitlist-form" id="waitlist-form">
              <div class="waitlist-row">
                <input class="waitlist-input" type="email" id="waitlist-email" placeholder="your@email.dev" required autocomplete="email" />
                <input type="text" id="waitlist-hp" style="display:none;" tabindex="-1" autocomplete="off" />
                <button type="submit" class="primary"><span>Join waitlist</span>${icon('arrow')}</button>
              </div>
              <div id="waitlist-status"></div>
            </form>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <a class="brand" href="#top" aria-label="CMDFlow home">
          <span class="logo">${icon('command')}</span>
          <span class="brand-word">CMD<span>Flow</span></span>
        </a>
        <p>A command layer for the shell you already love. Open source, local-first, no account required.</p>
      </div>
      <nav class="footer-links" aria-label="Footer">
        <a href="https://github.com/harsh77vardhan/CMDFlow" target="_blank" rel="noopener noreferrer">${icon('github')}GitHub</a>
        <a href="https://github.com/harsh77vardhan/CMDFlow/tree/main/docs" target="_blank" rel="noopener noreferrer">${icon('book')}Documentation</a>
        <a href="https://github.com/harsh77vardhan/CMDFlow/releases/latest" target="_blank" rel="noopener noreferrer">${icon('download')}Download</a>
        <a href="https://github.com/harsh77vardhan/CMDFlow/issues" target="_blank" rel="noopener noreferrer">${icon('chat')}Community &amp; Issues</a>
        <a href="https://github.com/harsh77vardhan/CMDFlow/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">${icon('scale')}MIT License</a>
      </nav>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} CMDFlow</span>
      <span>Built for people who live in the terminal.</span>
    </div>
  </footer>
`



/* ------------------------------------------------------------------ *
 * Background, reveal, navigation
 * ------------------------------------------------------------------ */

const ambient = new StippleBackground($<HTMLCanvasElement>('#stipple-bg'))

const reveal = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.classList.add('is-visible')
      reveal.unobserve(entry.target)
    }
  },
  { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
)
document.querySelectorAll('[data-reveal]').forEach((el, i) => {
  el.classList.add('reveal')
  ;(el as HTMLElement).style.setProperty('--reveal-delay', `${(i % 4) * 70}ms`)
  reveal.observe(el)
})
if (reduceMotion)
  document.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
    el.classList.add('is-visible')
    reveal.unobserve(el)
  })

/* ------------------------------------------------------------------ *
 * Tagline reveal animation (words activate in reading order on scroll)
 * ------------------------------------------------------------------ */

const taglineEl = document.querySelector<HTMLElement>('#tagline-text')
if (taglineEl) {
  const rawWords = taglineEl.textContent?.trim().split(/\s+/) || []
  taglineEl.innerHTML = rawWords
    .map((w) => `<span class="tagline-word">${w}</span>`)
    .join(' ')

  const wordSpans = Array.from(taglineEl.querySelectorAll<HTMLElement>('.tagline-word'))

  if (reduceMotion) {
    wordSpans.forEach((w) => w.classList.add('is-lit'))
  } else {
    let taglineTicking = false
    const updateTagline = () => {
      const rect = taglineEl.getBoundingClientRect()
      const windowH = window.innerHeight
      const start = windowH * 0.85
      const end = windowH * 0.38
      const progress = Math.max(0, Math.min(1, (start - rect.top) / (start - end)))
      const litCount = Math.floor(progress * (wordSpans.length + 1))
      wordSpans.forEach((w, i) => {
        w.classList.toggle('is-lit', i < litCount)
      })
      taglineTicking = false
    }
    window.addEventListener(
      'scroll',
      () => {
        if (!taglineTicking) {
          requestAnimationFrame(updateTagline)
          taglineTicking = true
        }
      },
      { passive: true },
    )
    updateTagline()
  }
}

const nav = $('#nav')
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 12)
onScroll()
window.addEventListener('scroll', onScroll, { passive: true })

const navToggle = $('#nav-toggle')
const navLinks = $('#nav-links')
const setMenu = (open: boolean) => {
  navLinks.classList.toggle('is-open', open)
  navToggle.setAttribute('aria-expanded', String(open))
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu')
  navToggle.innerHTML = icon(open ? 'close' : 'menu')
}
navToggle.onclick = () =>
  setMenu(navToggle.getAttribute('aria-expanded') !== 'true')
navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMenu(false))
})
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setMenu(false)
})

/* ------------------------------------------------------------------ *
 * Download platform detection & dynamic release wiring
 * ------------------------------------------------------------------ */

interface PlatformInfo {
  key: string
  name: string
  file: string
  label: string
}

function detectVisitorPlatform(): PlatformInfo {
  const ua = (navigator.userAgent || '').toLowerCase()
  const p = ((navigator as any).userAgentData?.platform || navigator.platform || '').toLowerCase()

  if (p.includes('win') || ua.includes('windows')) {
    return {
      key: 'windows-x86_64',
      name: 'Windows',
      file: 'cmdflow-windows-x86_64.zip',
      label: 'Windows (x86_64)',
    }
  }

  if (p.includes('mac') || ua.includes('macintosh') || ua.includes('mac os')) {
    const isArm =
      (navigator as any).userAgentData?.architecture === 'arm' ||
      ua.includes('arm') ||
      (!ua.includes('intel') && !ua.includes('x86'))
    if (isArm) {
      return {
        key: 'darwin-arm64',
        name: 'macOS (Apple Silicon)',
        file: 'cmdflow-darwin-arm64.tar.gz',
        label: 'macOS (Apple Silicon)',
      }
    }
    return {
      key: 'darwin-x86_64',
      name: 'macOS (Intel)',
      file: 'cmdflow-darwin-x86_64.tar.gz',
      label: 'macOS (Intel)',
    }
  }

  return {
    key: 'linux-x86_64',
    name: 'Linux',
    file: 'cmdflow-linux-x86_64.tar.gz',
    label: 'Linux (x86_64)',
  }
}

const visitorPlatform = detectVisitorPlatform()
const directReleaseBase = 'https://github.com/harsh77vardhan/CMDFlow/releases/latest/download'
const initialDownloadUrl = `${directReleaseBase}/${visitorPlatform.file}`

// Wire initial download URLs immediately
document.querySelectorAll<HTMLAnchorElement>('.download-btn').forEach((btn) => {
  btn.href = initialDownloadUrl
})

// Dynamically refresh version and exact platform download URLs
fetch('/api/releases/latest')
  .then((res) => (res.ok ? res.json() : null))
  .then((data: { version?: string; platforms?: Record<string, { url?: string }> } | null) => {
    const version = data?.version || '1.0.3'
    const platformUrl = data?.platforms?.[visitorPlatform.key]?.url || `${directReleaseBase}/${visitorPlatform.file}`

    document.querySelectorAll<HTMLAnchorElement>('.download-btn').forEach((btn) => {
      btn.href = platformUrl
      const labelEl = btn.querySelector('.download-label')
      if (labelEl) {
        if (btn.id === 'hero-download-btn' || btn.id === 'cta-download-btn') {
          labelEl.textContent = `Download CMDFlow v${version} (${visitorPlatform.name})`
        } else {
          labelEl.textContent = `Download v${version}`
        }
      }
    })

    const settingsVer = document.querySelector('.settings-version')
    if (settingsVer) settingsVer.textContent = `v${version}`
  })
  .catch(() => {
    document.querySelectorAll<HTMLAnchorElement>('.download-btn').forEach((btn) => {
      if (!btn.href || btn.href.endsWith('#') || btn.href === '') {
        btn.href = initialDownloadUrl
      }
    })
  })

/* ------------------------------------------------------------------ *
 * Copy buttons for installation one-liners
 * ------------------------------------------------------------------ */

document.querySelectorAll<HTMLButtonElement>('.copy-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const text = btn.dataset.copy || ''
    if (!text) return
    let copied = false
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        copied = true
      }
    } catch {
      // Fallback
    }
    if (!copied) {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        copied = true
      } catch {
        // Fallback
      }
    }
    const label = btn.querySelector('span')
    if (label) label.textContent = 'Copied!'
    btn.classList.add('is-copied')
    window.setTimeout(() => {
      if (label) label.textContent = 'Copy'
      btn.classList.remove('is-copied')
    }, 2000)
  })
})

/* ------------------------------------------------------------------ *
 * Waitlist form live submission
 * ------------------------------------------------------------------ */

const waitlistForm = document.getElementById('waitlist-form') as HTMLFormElement | null
const waitlistEmail = document.getElementById('waitlist-email') as HTMLInputElement | null
const waitlistHp = document.getElementById('waitlist-hp') as HTMLInputElement | null
const waitlistStatus = document.getElementById('waitlist-status')

if (waitlistForm && waitlistEmail && waitlistStatus) {
  waitlistForm.onsubmit = async (e) => {
    e.preventDefault()
    waitlistStatus.textContent = 'Submitting...'
    waitlistStatus.style.color = 'var(--muted)'
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: waitlistEmail.value,
          hp: waitlistHp?.value || '',
        }),
      })
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string }
      if (res.ok && data.success) {
        waitlistStatus.textContent = data.message || 'You are on the waitlist!'
        waitlistStatus.style.color = 'var(--green)'
        waitlistEmail.value = ''
      } else {
        waitlistStatus.textContent = data.error || 'Submission failed'
        waitlistStatus.style.color = '#ff6b6b'
      }
    } catch {
      waitlistStatus.textContent = 'Waitlist entry recorded locally.'
      waitlistStatus.style.color = 'var(--blue)'
    }
  }
}

/* ------------------------------------------------------------------ *
 * Hero terminal loop
 * ------------------------------------------------------------------ */

const heroSteps: Step[] = [
  { kind: 'clear' },
  { kind: 'type', text: 'b' },
  { kind: 'output', lines: [{ text: 'cd ..', tone: 'accent' }] },
  { kind: 'clear' },
  { kind: 'type', text: 'gs' },
  { kind: 'output', lines: [{ text: 'git status', tone: 'accent' }] },
  { kind: 'clear' },
  { kind: 'type', text: 'll' },
  { kind: 'output', lines: [{ text: 'ls -lah', tone: 'accent' }] },
  { kind: 'clear' },
  { kind: 'type', text: 'project technea' },
  { kind: 'output', lines: [{ text: 'cd ~/Documents/Technea', tone: 'accent' }] },
  { kind: 'clear' },
  { kind: 'type', text: 'start technea' },
  {
    kind: 'output',
    lines: [
      { text: 'Opening VS Code…', tone: 'ok' },
      { text: 'Starting backend…', tone: 'ok' },
      { text: 'Starting frontend…', tone: 'ok' },
      { text: 'Done.', tone: 'accent' },
    ],
  },
  { kind: 'wait', ms: 900 },
]

const heroTyper = new TerminalTyper(
  { typed: $('#hero-typed'), lines: $('#hero-lines') },
  heroSteps,
)
if (reduceMotion) {
  $('#hero-typed').textContent = 'start technea'
  void printLines($('#hero-lines'), [
    { text: 'Opening VS Code…', tone: 'ok' },
    { text: 'Starting backend…', tone: 'ok' },
    { text: 'Starting frontend…', tone: 'ok' },
    { text: 'Done.', tone: 'accent' },
  ])
} else {
  void heroTyper.start()
}

/* ------------------------------------------------------------------ *
 * Interactive demo
 * ------------------------------------------------------------------ */

const demoLines = $('#demo-lines')
const demoTyped = $('#demo-typed')
const demoButtons = $('#demo-buttons')
const demoCaption = $('#demo-caption')
let demoRun = 0

async function runDemo(index: number) {
  const run = ++demoRun
  const item = demos[index]
  if (!item) return
  demoButtons
    .querySelectorAll<HTMLButtonElement>('[data-demo]')
    .forEach((button) => {
      const active = Number(button.dataset.demo) === index
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-pressed', String(active))
    })
  demoCaption.textContent = `${item.command} → ${item.output[0]?.text ?? ''}`
  demoLines.replaceChildren()
  demoTyped.textContent = ''
  const alive = () => run === demoRun
  if (reduceMotion) {
    demoTyped.textContent = item.command
    await printLines(demoLines, item.output)
    return
  }
  await typeText(demoTyped, item.command, alive)
  if (!alive()) return
  await new Promise((r) => setTimeout(r, 180))
  if (!alive()) return
  await printLines(demoLines, item.output)
}

demoButtons.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-demo]')
  if (!button) return
  void runDemo(Number(button.dataset.demo))
})
$('#demo-reset').onclick = () => {
  demoRun++
  demoTyped.textContent = ''
  demoLines.replaceChildren()
  const first = document.createElement('div')
  first.className = 'term-line term-line--dim'
  first.textContent = 'CMDFlow demo — choose a command on the left'
  demoLines.append(first)
  demoCaption.textContent = 'b → cd ..'
  demoButtons.querySelectorAll<HTMLButtonElement>('[data-demo]').forEach((b) => {
    const active = b.dataset.demo === '0'
    b.classList.toggle('is-active', active)
    b.setAttribute('aria-pressed', String(active))
  })
}

/* ------------------------------------------------------------------ *
 * Settings showcase
 * ------------------------------------------------------------------ */

const toggles = (row: SettingsRow) =>
  row.control === 'toggle'
    ? `<span class="toggle${row.on ? ' is-on' : ''}" aria-hidden="true"><i></i></span>`
    : row.control === 'select'
      ? `<span class="fake-select">${row.value ?? 'Default'}${icon('chevron')}</span>`
      : `<span class="fake-input${row.mono ? ' is-mono' : ''}">${row.value ?? ''}</span>`

function paneMarkup(pane: Pane) {
  const header = `<div class="pane-head"><h3>${pane.title}</h3><p>${pane.sub}</p></div>`
  if (pane.kind === 'aliases') {
    return `${header}
      <div class="alias-table">
        ${aliasPairs
          .map(
            ([alias, expansion]) => `
          <div class="alias-row">
            <span class="kbd">${alias}</span>
            <span class="alias-arrow">→</span>
            <code>${expansion}</code>
          </div>`,
          )
          .join('')}
      </div>
      <a class="text-button pane-action" href="https://github.com/harsh77vardhan/CMDFlow/blob/main/docs/SPEC.md" target="_blank" rel="noopener noreferrer">${icon('command')}Configure in CLI: cmdflow alias add</a>`
  }
  if (pane.kind === 'flows') {
    return `${header}
      <div class="flow-card">
        <div class="flow-card-head"><span class="kbd">deploy</span><span class="flow-steps">${deploySteps.length} steps</span></div>
        ${deploySteps
          .map(
            (step, i) => `
          <div class="flow-step">
            <span class="flow-index">${i + 1}</span>
            <code>${step}</code>
          </div>`,
          )
          .join('')}
        <div class="flow-card-foot">Runs top to bottom · stops on the first failure</div>
      </div>
      <a class="text-button pane-action" href="https://github.com/harsh77vardhan/CMDFlow/blob/main/docs/FLOWS.md" target="_blank" rel="noopener noreferrer">${icon('flow')}Configure in CLI: cmdflow flow add</a>`
  }
  if (pane.kind === 'theme') {
    const themes = [
      { name: 'Midnight', colors: ['#0a0c13', '#5b8cff', '#a274ff'], active: true },
      { name: 'Graphite', colors: ['#101114', '#8b94a7', '#c9d1e0'] },
      { name: 'Nebula', colors: ['#0b0714', '#8b5cf6', '#e879f9'] },
    ]
    return `${header}
      <div class="theme-grid">
        ${themes
          .map(
            (theme) => `
          <div class="theme-card${theme.active ? ' is-active' : ''}">
            <span class="theme-swatch" style="background:${theme.colors[0]}">
              <i style="background:${theme.colors[1]}"></i><i style="background:${theme.colors[2]}"></i>
            </span>
            <span class="theme-name">${theme.name}</span>
          </div>`,
          )
          .join('')}
      </div>
      <div class="row">
        <div><span class="row-label">Match system appearance</span><span class="row-hint">Dark always wins for now</span></div>
        ${toggles({ label: '', control: 'toggle', on: true })}
      </div>`
  }
  return `${header}
    <div class="rows">
      ${pane.rows
        .map(
          (row) => `
        <div class="row">
          <div><span class="row-label">${row.label}</span>${row.hint ? `<span class="row-hint">${row.hint}</span>` : ''}</div>
          ${toggles(row)}
        </div>`,
        )
        .join('')}
    </div>`
}

function initSettings() {
  const tabs = $('#settings-tabs')
  const pane = $('#settings-pane')
  tabs.innerHTML = panes
    .map(
      (p, i) =>
        `<button class="settings-tab${i === 0 ? ' is-active' : ''}" role="tab" aria-selected="${i === 0}" data-tab="${i}">${p.tab}</button>`,
    )
    .join('')
  const show = (index: number) => {
    const item = panes[index]
    if (!item) return
    pane.innerHTML = paneMarkup(item)
    tabs.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((tab) => {
      const active = Number(tab.dataset.tab) === index
      tab.classList.toggle('is-active', active)
      tab.setAttribute('aria-selected', String(active))
    })
  }
  tabs.addEventListener('click', (event) => {
    const tab = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-tab]')
    if (tab) show(Number(tab.dataset.tab))
  })
  show(0)
}
initSettings()

/* ------------------------------------------------------------------ *
 * Teardown
 * ------------------------------------------------------------------ */

window.addEventListener('pagehide', () => {
  heroTyper.stop()
  ambient.destroy()
})
