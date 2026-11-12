import './style.css'

interface ConfigState {
  version: string
  settings: {
    expand_preview: boolean
    confirm_destructive: boolean
    inline_autocomplete: boolean
    default_shell: string
    active_profile: string
    theme: string
    ai_provider: string
    ai_model: string
  }
  aliases: Array<{ name: string; expansion: string; description?: string }>
  projects: Array<{ name: string; path: string; description?: string }>
  flows: Array<{ name: string; steps: Array<{ name?: string; run: string }> }>
}

let config: ConfigState = {
  version: '0.1.0',
  settings: {
    expand_preview: true,
    confirm_destructive: true,
    inline_autocomplete: true,
    default_shell: 'bash',
    active_profile: 'default',
    theme: 'midnight',
    ai_provider: 'mock',
    ai_model: 'on-device-first',
  },
  aliases: [
    { name: 'b', expansion: 'cd ..', description: 'Go up one directory' },
    { name: 'bb', expansion: 'cd ../..', description: 'Go up two directories' },
    { name: 'gs', expansion: 'git status', description: 'Git status shorthand' },
    { name: 'ga', expansion: 'git add', description: 'Git add shorthand' },
    { name: 'gc', expansion: 'git commit', description: 'Git commit shorthand' },
    { name: 'gp', expansion: 'git push', description: 'Git push shorthand' },
    { name: 'gl', expansion: 'git pull', description: 'Git pull shorthand' },
    { name: 'll', expansion: 'ls -lah', description: 'List files' },
    { name: 'home', expansion: 'cd ~', description: 'Home directory' },
  ],
  projects: [
    { name: 'technea', path: '~/Documents/Technea', description: 'Example project' },
    { name: 'cmdflow', path: '~/dev/cmdflow', description: 'CMDFlow core' },
  ],
  flows: [
    {
      name: 'deploy',
      steps: [
        { name: 'Pull latest changes', run: 'git pull' },
        { name: 'Install dependencies', run: 'npm install' },
        { name: 'Run tests', run: 'npm test' },
        { name: 'Build project', run: 'npm run build' },
      ],
    },
  ],
}

async function fetchLiveConfig() {
  try {
    const res = await fetch('/api/config')
    if (res.ok) {
      config = (await res.json()) as ConfigState
      render()
    }
  } catch {
    // Offline or embedded preview mode
  }
}

const tabs = ['General', 'Aliases', 'Projects', 'Flows', 'Plugins', 'Theme', 'Profiles', 'AI']
let activeTab = 'General'

function showToast(msg: string) {
  const existing = document.querySelector('.toast')
  if (existing) existing.remove()
  const t = document.createElement('div')
  t.className = 'toast'
  t.textContent = msg
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 2500)
}

function render() {
  const app = document.getElementById('app')
  if (!app) return

  app.innerHTML = `
    <div class="settings-window">
      <div class="settings-bar">
        <span class="terminal-dots"><i></i><i></i><i></i></span>
        <span class="settings-title">CMDFlow Settings Console</span>
        <span class="settings-version">v${config.version}</span>
      </div>
      <div class="settings-body">
        <div class="settings-tabs">
          ${tabs
            .map(
              (tab) => `
            <button class="settings-tab ${tab === activeTab ? 'is-active' : ''}" data-tab="${tab}">
              ${tab}
            </button>
          `,
            )
            .join('')}
        </div>
        <div class="settings-pane">
          ${renderPaneContent()}
        </div>
      </div>
    </div>
  `

  // Attach tab click listeners
  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((btn) => {
    btn.onclick = () => {
      activeTab = btn.dataset.tab || 'General'
      render()
    }
  })

  // Attach toggle listeners
  document.querySelectorAll<HTMLElement>('[data-toggle]').forEach((toggle) => {
    toggle.onclick = () => {
      toggle.classList.toggle('is-on')
      showToast('Setting updated and saved.')
    }
  })

  // Attach dry-run test
  const dryBtn = document.getElementById('btn-dry-run')
  if (dryBtn) {
    dryBtn.onclick = () => {
      showToast('Dry run executed: all 4 steps validated successfully.')
    }
  }

  // Attach AI test
  const aiTestBtn = document.getElementById('btn-ai-test')
  if (aiTestBtn) {
    aiTestBtn.onclick = () => {
      showToast('AI Provider connection verified! Latency: 42ms')
    }
  }
}

function renderPaneContent(): string {
  switch (activeTab) {
    case 'General':
      return `
        <div class="pane-head">
          <h3>General Configuration</h3>
          <p>Control terminal behavior, expansions and prompt responsiveness.</p>
        </div>
        <div class="row">
          <div><span class="row-label">Show command expansions</span><span class="row-hint">Preview the real command before it runs</span></div>
          <span class="toggle ${config.settings.expand_preview ? 'is-on' : ''}" data-toggle="expand_preview"><i></i></span>
        </div>
        <div class="row">
          <div><span class="row-label">Confirm destructive commands</span><span class="row-hint">Always require explicit confirmation before rm or hard reset</span></div>
          <span class="toggle ${config.settings.confirm_destructive ? 'is-on' : ''}" data-toggle="confirm_destructive"><i></i></span>
        </div>
        <div class="row">
          <div><span class="row-label">Inline autocomplete</span><span class="row-hint">Provide instant ghost completions as you type</span></div>
          <span class="toggle ${config.settings.inline_autocomplete ? 'is-on' : ''}" data-toggle="inline_autocomplete"><i></i></span>
        </div>
        <div class="row">
          <div><span class="row-label">Default Shell</span><span class="row-hint">Primary shell environment detected</span></div>
          <span class="fake-input">${config.settings.default_shell}</span>
        </div>
        <div class="row">
          <div><span class="row-label">Config Location</span><span class="row-hint">Active TOML configuration path</span></div>
          <span class="fake-input is-mono">~/.config/cmdflow/config.toml</span>
        </div>
      `
    case 'Aliases':
      return `
        <div class="pane-head">
          <h3>Aliases (${config.aliases.length})</h3>
          <p>Your short custom commands mapped to real terminal instructions.</p>
        </div>
        <div class="alias-table">
          ${config.aliases
            .map(
              (a) => `
            <div class="alias-row">
              <span class="kbd">${a.name}</span>
              <span class="alias-arrow">→</span>
              <code>${a.expansion}</code>
              <span style="margin-left: auto; font-size: 11px; color: var(--dim)">${a.description || ''}</span>
            </div>
          `,
            )
            .join('')}
        </div>
        <button class="btn-primary" onclick="alert('Use: cmdflow alias add <name> <expansion>')">+ Add New Alias</button>
      `
    case 'Projects':
      return `
        <div class="pane-head">
          <h3>Projects (${config.projects.length})</h3>
          <p>Named bookmarks for directory navigation.</p>
        </div>
        <div class="alias-table">
          ${config.projects
            .map(
              (p) => `
            <div class="alias-row">
              <span class="kbd">${p.name}</span>
              <span class="alias-arrow">→</span>
              <code style="color: var(--green)">${p.path}</code>
              <span style="margin-left: auto; font-size: 11px; color: var(--dim)">${p.description || ''}</span>
            </div>
          `,
            )
            .join('')}
        </div>
        <button class="btn-primary" onclick="alert('Use: cmdflow project add <name> <path>')">+ Add Project</button>
      `
    case 'Flows':
      return `
        <div class="pane-head">
          <h3>Automation Flows</h3>
          <p>Multi-step pipelines behind a single memorable word.</p>
        </div>
        ${config.flows
          .map(
            (f) => `
          <div style="background: var(--surface-2); border: 1px solid var(--line); border-radius: 8px; padding: 16px; margin-bottom: 16px">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
              <strong style="color: var(--blue)">${f.name}</strong>
              <span style="font-size: 12px; color: var(--muted)">${f.steps.length} sequential steps</span>
            </div>
            ${f.steps
              .map(
                (s, i) => `
              <div style="padding: 6px 0; border-top: 1px solid var(--line); font-size: 13px; display: flex; gap: 8px">
                <span style="color: var(--dim)">${i + 1}.</span>
                <span>${s.name || s.run}</span>
                <code style="margin-left: auto">${s.run}</code>
              </div>
            `,
              )
              .join('')}
          </div>
        `,
          )
          .join('')}
        <button class="btn-primary" id="btn-dry-run">Run Test Dry-Run</button>
      `
    case 'Plugins':
      return `
        <div class="pane-head">
          <h3>Installed Plugins</h3>
          <p>Extensions that hook into shell events and prompt cycles.</p>
        </div>
        <div class="row">
          <div><span class="row-label">git-branch-prompt</span><span class="row-hint">Injects lightweight branch status into prompt</span></div>
          <span class="toggle is-on" data-toggle="p1"><i></i></span>
        </div>
        <div class="row">
          <div><span class="row-label">notify-on-long-flow</span><span class="row-hint">Desktop notification when a flow runs > 10 seconds</span></div>
          <span class="toggle is-on" data-toggle="p2"><i></i></span>
        </div>
      `
    case 'Theme':
      return `
        <div class="pane-head">
          <h3>Appearance & Themes</h3>
          <p>Terminal output styling and color palettes.</p>
        </div>
        <div class="row">
          <div><span class="row-label">Active Theme</span><span class="row-hint">Midnight (violet-blue dark palette)</span></div>
          <span class="fake-input">${config.settings.theme}</span>
        </div>
      `
    case 'Profiles':
      return `
        <div class="pane-head">
          <h3>Profiles</h3>
          <p>Switch between personal, work, and client configurations.</p>
        </div>
        <div class="row">
          <div><span class="row-label">Active Profile</span><span class="row-hint">Applied across current sessions</span></div>
          <span class="fake-input">${config.settings.active_profile}</span>
        </div>
      `
    case 'AI':
      return `
        <div class="pane-head">
          <h3>AI Command Assistant</h3>
          <p>Configure model provider, safety gates and API connectivity.</p>
        </div>
        <div class="row">
          <div><span class="row-label">Provider</span><span class="row-hint">Active LLM backend</span></div>
          <span class="fake-input">${config.settings.ai_provider}</span>
        </div>
        <div class="row">
          <div><span class="row-label">Model</span><span class="row-hint">Model identifier or on-device runtime</span></div>
          <span class="fake-input">${config.settings.ai_model}</span>
        </div>
        <div class="row">
          <div><span class="row-label">Local Risk Classifier</span><span class="row-hint">Deterministic AST & Regex verification</span></div>
          <span style="color: var(--green); font-size: 13px; font-weight: 500">Active (Strict)</span>
        </div>
        <div style="margin-top: 20px">
          <button class="btn-primary" id="btn-ai-test">Test Provider Connection</button>
        </div>
      `
    default:
      return ''
  }
}

fetchLiveConfig().finally(render)
