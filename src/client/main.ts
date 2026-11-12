import '@fontsource-variable/dm-sans'
import '@fontsource-variable/space-grotesk'
import './style.css'
import starterPack from '../../shared/starter-pack.json'
import { AmbientBackground } from './background'
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

const feature = (f: Feature) => `
  <article class="card${f.wide ? ' card--wide' : ''}" data-reveal>
    <div class="card-head">
      <span class="card-icon">${icon(f.icon)}</span>
      ${f.planned ? '<span class="pill">Planned</span>' : ''}
    </div>
    <h3>${f.title}</h3>
    <p>${f.text}</p>
    ${f.body}
  </article>`

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
    icon: 'chat',
    title: 'Natural language',
    text: 'Describe what you want in plain words. CMDFlow works out the command.',
    wide: true,
    planned: true,
    body: `<div class="stack">
        ${snip(cmd('go to downloads'))}
        <span class="stack-arrow">↓</span>
        ${snip(out('cd ~/Downloads'))}
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
    icon: 'layers',
    title: 'Workspaces',
    text: 'One command opens the editor, the servers and the browser you need.',
    planned: true,
    body: `<ul class="ticks">
        <li>${icon('check')}VS Code</li>
        <li>${icon('check')}Backend</li>
        <li>${icon('check')}Frontend</li>
        <li>${icon('check')}Browser</li>
      </ul>`,
  },
  {
    icon: 'sparkles',
    title: 'AI assistance',
    text: 'Describe the outcome. CMDFlow suggests the command and explains it first.',
    wide: true,
    planned: true,
    body: `<div class="stack">
        ${snip(cmd('delete node modules'))}
        <span class="stack-arrow">↓</span>
        ${snip(`${out('rm -rf node_modules')}<div class="snip-note">${icon('shield')}Waits for your approval</div>`)}
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
    icon: 'package',
    title: 'Community packs',
    text: 'Install a pack and pick up a workflow that already works.',
    planned: true,
    body: `<div class="chips">
        <span class="chip">Python</span><span class="chip">Docker</span><span class="chip">React</span>
        <span class="chip">Node</span><span class="chip">Git</span><span class="chip">Linux</span>
      </div>`,
  },
  {
    icon: 'blocks',
    title: 'Plugin system',
    text: 'Add commands, flows and integrations from a small, typed API.',
    planned: true,
    body: `<div class="chips"><span class="chip">Commands</span><span class="chip">Flows</span><span class="chip">AI tools</span><span class="chip">Integrations</span></div>`,
  },
  {
    icon: 'sliders',
    title: 'Fully customizable',
    text: 'Aliases, projects, themes, profiles and AI all live in one config.',
    body: `<div class="chips"><span class="chip">Aliases</span><span class="chip">Themes</span><span class="chip">Profiles</span><span class="chip">Flows</span><span class="chip">AI</span></div>`,
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
  { version: 'Version 1', title: 'Custom aliases', text: 'Short commands, real expansion preview, safe defaults.', now: true },
  { version: 'Version 2', title: 'Projects', text: 'Named project shortcuts and per-project aliases.' },
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
  <canvas id="ambient" aria-hidden="true"></canvas>
  <div class="aura aura--blue" aria-hidden="true"></div>
  <div class="aura aura--purple" aria-hidden="true"></div>

  <header class="nav" id="nav">
    <div class="nav-inner">
      <a class="brand" href="#top" aria-label="CMDFlow home">
        <span class="logo">${icon('command')}</span>
        <span class="brand-word">CMD<span>Flow</span></span>
      </a>
      <nav class="nav-links" id="nav-links" aria-label="Main">
        <a href="#features">Features</a>
        <a href="#demo">Demo</a>
        <a href="#customize">Customize</a>
        <a href="#ai">AI</a>
        <a href="#roadmap">Roadmap</a>
        <a href="#docs">Docs</a>
      </nav>
      <div class="nav-actions">
        <button class="text-button nav-github" data-toast="github">${icon('github')}<span>GitHub</span></button>
        <button class="primary primary--sm" data-toast="download"><span class="download-label">Download v1.0.1</span>${icon('arrow')}</button>
        <button class="icon-button nav-toggle" id="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="nav-links">${icon('menu')}</button>
      </div>
    </div>
  </header>

  <main id="top">
    <section class="hero">
      <div class="hero-copy">
        <span class="badge" data-reveal><span class="live-dot"></span>Works on Fish · Bash · Zsh · PowerShell</span>
        <h1 data-reveal>The Command Line.<br /><span class="grad">Finally Speaks Your Language.</span></h1>
        <p class="lede" data-reveal>Create your own command language. Stop memorizing commands. Build workflows that match the way you think.</p>
        <div class="hero-actions" data-reveal>
          <button class="primary" data-toast="download"><span class="download-label">Download CMDFlow v1.0.1</span>${icon('download')}</button>
          <button class="secondary" data-toast="github">${icon('github')}<span>View on GitHub</span></button>
        </div>
        <p class="hero-meta" data-reveal>No new terminal. No new habits. Your shell already knows how to run things.</p>
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
        <div class="terminal-aura" aria-hidden="true"></div>
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

    <section class="section" id="features">
      <div class="section-head" data-reveal>
        <span class="eyebrow">Features</span>
        <h2>Your terminal, on your terms.</h2>
        <p class="section-lede">Small building blocks that turn a wall of flags into a language you invented.</p>
      </div>
      <div class="feature-grid">
        ${features.map(feature).join('')}
      </div>
      <p class="note" data-reveal>CMDFlow is in early development. Features marked <span class="pill pill--inline">Planned</span> are being designed, not shipped.</p>
    </section>

    <section class="section section--demo" id="demo">
      <div class="section-head" data-reveal>
        <span class="eyebrow">Interactive demo</span>
        <h2>Try the idea in ten seconds.</h2>
        <p class="section-lede">Click a command. Watch what actually reaches your shell.</p>
      </div>
      <div class="demo-shell" data-reveal>
        <div class="demo-list">
          <p class="demo-list-label">Pick a command</p>
          <div class="demo-buttons" id="demo-buttons">
            ${demos
              .map(
                (d, i) =>
                  `<button class="demo-button${i === 0 ? ' is-active' : ''}" data-demo="${i}" aria-pressed="${i === 0}"><span class="demo-key">${d.label}</span>${icon('arrow')}</button>`,
              )
              .join('')}
          </div>
          <p class="demo-hint">Everything here runs locally in the browser. Nothing is executed.</p>
        </div>
        <div class="terminal terminal--demo">
          <div class="terminal-bar">
            <span class="terminal-dots" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="terminal-title">demo — sandboxed</span>
            <span class="terminal-live terminal-live--quiet"><span class="live-dot"></span>offline</span>
          </div>
          <div class="terminal-body">
            <div class="terminal-path">~/Documents/Technea</div>
            <div class="term-lines" id="demo-lines">
              <div class="term-line term-line--dim">CMDFlow demo — choose a command on the left</div>
            </div>
            <div class="term-input">
              <span class="term-user">you@mac</span>
              <span class="term-chevron">❯</span>
              <span class="term-typed" id="demo-typed"></span>
              <span class="cursor" aria-hidden="true"></span>
            </div>
          </div>
          <div class="terminal-foot">
            <span id="demo-caption">b → cd ..</span>
            <button class="text-button demo-reset" id="demo-reset">Reset</button>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="compare">
      <div class="section-head" data-reveal>
        <span class="eyebrow">Comparison</span>
        <h2>Fewer keystrokes. Less thinking.</h2>
        <p class="section-lede">The same work, said the way you would say it out loud.</p>
      </div>
      <div class="compare-grid">
        <div class="compare-card compare-card--before" data-reveal>
          <div class="compare-head"><span>Without CMDFlow</span><span class="compare-count">5 commands · 78 keystrokes</span></div>
          <div class="compare-code">
            <div><span>❯</span><code>cd ../../Documents</code></div>
            <div><span>❯</span><code>git status</code></div>
            <div><span>❯</span><code>git add .</code></div>
            <div><span>❯</span><code>git commit</code></div>
            <div><span>❯</span><code>git push</code></div>
          </div>
        </div>
        <div class="compare-card compare-card--after" data-reveal>
          <span class="compare-badge">${icon('zap')}14 keystrokes</span>
          <div class="compare-head"><span>With CMDFlow</span><span class="compare-count">4 commands · 14 keystrokes</span></div>
          <div class="compare-code">
            <div><span>❯</span><code>project docs</code><em>cd ~/Documents/Docs</em></div>
            <div><span>❯</span><code>gs</code><em>git status</em></div>
            <div><span>❯</span><code>commit</code><em>git add . && git commit</em></div>
            <div><span>❯</span><code>push</code><em>git push</em></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="customize">
      <div class="section-head" data-reveal>
        <span class="eyebrow">Customization</span>
        <h2>A console for your console.</h2>
        <p class="section-lede">Aliases, projects, flows, themes and profiles in one calm settings surface.</p>
      </div>
      <div class="settings-window" data-reveal>
        <div class="settings-bar">
          <span class="terminal-dots" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="settings-title">CMDFlow Settings</span>
          <span class="settings-version">v1.0.1</span>
        </div>
        <div class="settings-body">
          <div class="settings-tabs" id="settings-tabs" role="tablist" aria-label="Settings sections"></div>
          <div class="settings-pane" id="settings-pane" role="tabpanel"></div>
        </div>
      </div>
      <p class="note note--center" data-reveal>A design preview of the settings experience. Tabs open the real screens being built.</p>
    </section>

    <section class="section" id="ai">
      <div class="section-head" data-reveal>
        <span class="eyebrow">AI, later</span>
        <h2>The terminal that understands you.</h2>
        <p class="section-lede">CMDFlow is being built toward an assistant that helps without taking control.</p>
      </div>
      <div class="ai-grid">
        ${aiCapabilities
          .map(
            (a) => `
          <div class="ai-item" data-reveal>
            <span class="ai-icon">${icon(a.icon)}</span>
            <h3>${a.title}</h3>
            <p>${a.text}</p>
          </div>`,
          )
          .join('')}
      </div>
      <div class="safety" data-reveal>
        <span class="safety-icon">${icon('shield')}</span>
        <div>
          <h3>AI should ask, never surprise you.</h3>
          <p>Every AI action is previewed, explained and confirmed. Destructive commands are never executed automatically, and nothing leaves your machine without permission.</p>
        </div>
        <span class="pill">Planned</span>
      </div>
    </section>

    <section class="section" id="roadmap">
      <div class="section-head" data-reveal>
        <span class="eyebrow">Roadmap</span>
        <h2>Built in small, honest steps.</h2>
        <p class="section-lede">No release dates promised. Just the order things are being built in.</p>
      </div>
      <ol class="roadmap">
        ${roadmap
          .map(
            (r, i) => `
          <li class="roadmap-item${r.now ? ' is-now' : ''}" data-reveal style="--i:${i}">
            <span class="roadmap-version">${r.version}</span>
            <div class="roadmap-content">
              <h3>${r.title}${r.now ? '<span class="pill pill--now">In progress</span>' : ''}</h3>
              <p>${r.text}</p>
            </div>
            <span class="roadmap-dot" aria-hidden="true"></span>
          </li>`,
          )
          .join('')}
      </ol>
    </section>

    <section class="section" id="docs">
      <div class="section-head" data-reveal>
        <span class="eyebrow">Documentation</span>
        <h2>Everything you need to know.</h2>
        <p class="section-lede">Specifications, security threat models, shell hooks, flows and contributing guidelines.</p>
      </div>
      <div class="feature-grid" data-reveal>
        <article class="card">
          <div class="card-head"><span class="card-icon">${icon('book')}</span></div>
          <h3>Technical Spec</h3>
          <p>Architecture, layered TOML resolution, and sub-20ms resolve engine.</p>
          <div class="snip">${cmd('docs/SPEC.md')}</div>
        </article>
        <article class="card">
          <div class="card-head"><span class="card-icon">${icon('shield')}</span></div>
          <h3>Security & Sandboxing</h3>
          <p>Threat model, project trust boundaries, and injection defense.</p>
          <div class="snip">${cmd('docs/SECURITY.md')}</div>
        </article>
        <article class="card">
          <div class="card-head"><span class="card-icon">${icon('branch')}</span></div>
          <h3>Shell Integration</h3>
          <p>Zoxide-style directive protocol for Bash, Zsh, Fish, and PowerShell.</p>
          <div class="snip">${cmd('docs/SHELLS.md')}</div>
        </article>
        <article class="card">
          <div class="card-head"><span class="card-icon">${icon('flow')}</span></div>
          <h3>Automation Flows</h3>
          <p>Sequential pipelines, live step streaming, and directory tracking.</p>
          <div class="snip">${cmd('docs/FLOWS.md')}</div>
        </article>
        <article class="card">
          <div class="card-head"><span class="card-icon">${icon('sparkles')}</span></div>
          <h3>AI & Risk Classifier</h3>
          <p>Deterministic AST/regex classifier and gated approval rules.</p>
          <div class="snip">${cmd('docs/AI.md')}</div>
        </article>
        <article class="card">
          <div class="card-head"><span class="card-icon">${icon('blocks')}</span></div>
          <h3>Plugin System</h3>
          <p>Subprocess extensions with declared permissions and prompt hooks.</p>
          <div class="snip">${cmd('docs/PLUGINS.md')}</div>
        </article>
      </div>
    </section>

    <section class="cta" data-reveal>
      <div class="cta-inner">
        <span class="cta-badge">${icon('clock')}Early preview</span>
        <h2>Make the terminal feel like yours.</h2>
        <p>Get the first build when it opens, and help shape the command language.</p>
        <form class="waitlist-form" id="waitlist-form" style="margin-top: 24px; display: flex; flex-direction: column; gap: 8px; max-width: 440px; margin-inline: auto;">
          <div style="display: flex; gap: 8px;">
            <input type="email" id="waitlist-email" placeholder="Enter your developer email..." required style="flex: 1; padding: 12px 16px; border-radius: 8px; background: rgba(255,255,255,0.06); border: 1px solid var(--line); color: var(--text); font-family: inherit; font-size: 14px;" />
            <input type="text" id="waitlist-hp" style="display: none;" tabindex="-1" autocomplete="off" />
            <button type="submit" class="primary" style="white-space: nowrap;"><span>Join Waitlist</span>${icon('arrow')}</button>
          </div>
          <div id="waitlist-status" style="font-size: 13px; min-height: 20px;"></div>
        </form>
        <div class="hero-actions" style="margin-top: 20px;">
          <button class="primary" data-toast="download"><span>Download CMDFlow</span>${icon('download')}</button>
          <button class="secondary" data-toast="github">${icon('github')}<span>View on GitHub</span></button>
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
        <button data-toast="github">${icon('github')}GitHub</button>
        <button data-toast="docs">${icon('book')}Documentation</button>
        <button data-toast="download">${icon('download')}Download</button>
        <button data-toast="community">${icon('chat')}Discord</button>
        <button data-toast="license">${icon('scale')}License</button>
      </nav>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} CMDFlow</span>
      <span>Built for people who live in the terminal.</span>
    </div>
  </footer>

  <div id="toast" class="toast" role="status" hidden></div>
`

/* ------------------------------------------------------------------ *
 * Background, reveal, navigation
 * ------------------------------------------------------------------ */

const ambient = new AmbientBackground($<HTMLCanvasElement>('#ambient'))

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
 * Toasts (links are not live yet)
 * ------------------------------------------------------------------ */

const messages: Record<string, string> = {
  download: 'CMDFlow v0.1.0 ready! Install: curl -fsSL https://cmdflow.dev/install.sh | bash',
  github: 'The public repository opens with the first preview build.',
  docs: 'Documentation available in docs/ (SPEC.md, SECURITY.md, SHELLS.md, FLOWS.md, AI.md).',
  community: 'Community channels open with the first preview build.',
  license: 'CMDFlow is released under the MIT open-source license.',
}
const toastEl = $('#toast')
let toastTimer = 0
const toast = (text: string) => {
  toastEl.textContent = messages[text] ?? text
  toastEl.hidden = false
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastEl.hidden = true
  }, 3800)
}

document.querySelectorAll<HTMLElement>('[data-toast]').forEach((el) => {
  el.addEventListener('click', async () => {
    const key = el.dataset.toast ?? ''
    if (key === 'download') {
      try {
        const res = await fetch('/api/releases/latest')
        if (res.ok) {
          const data = (await res.json()) as { version: string; install_scripts: { unix: string } }
          toast(`CMDFlow v${data.version} install: ${data.install_scripts.unix}`)
          return
        }
      } catch {
        // Fallback to static message
      }
    }
    toast(key)
  })
})

// Waitlist form live submission
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

// Dynamically refresh version from release proxy
fetch('/api/releases/latest')
  .then((res) => (res.ok ? res.json() : null))
  .then((data: { version?: string } | null) => {
    if (data?.version) {
      document.querySelectorAll<HTMLElement>('.download-label').forEach((el) => {
        if (el.textContent?.includes('CMDFlow')) {
          el.textContent = `Download CMDFlow v${data.version}`
        } else {
          el.textContent = `Download v${data.version}`
        }
      })
      const settingsVer = document.querySelector('.settings-version')
      if (settingsVer) settingsVer.textContent = `v${data.version}`
    }
  })
  .catch(() => {})

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
      <button class="text-button pane-action">${icon('command')}New alias</button>`
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
      <button class="text-button pane-action">${icon('flow')}New flow</button>`
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
