(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e={version:`0.1.0`,settings:{expand_preview:!0,confirm_destructive:!0,inline_autocomplete:!0,default_shell:`bash`,active_profile:`default`,theme:`midnight`,ai_provider:`mock`,ai_model:`on-device-first`},aliases:[{name:`b`,expansion:`cd ..`,description:`Go up one directory`},{name:`bb`,expansion:`cd ../..`,description:`Go up two directories`},{name:`gs`,expansion:`git status`,description:`Git status shorthand`},{name:`ga`,expansion:`git add`,description:`Git add shorthand`},{name:`gc`,expansion:`git commit`,description:`Git commit shorthand`},{name:`gp`,expansion:`git push`,description:`Git push shorthand`},{name:`gl`,expansion:`git pull`,description:`Git pull shorthand`},{name:`ll`,expansion:`ls -lah`,description:`List files`},{name:`home`,expansion:`cd ~`,description:`Home directory`}],projects:[{name:`technea`,path:`~/Documents/Technea`,description:`Example project`},{name:`cmdflow`,path:`~/dev/cmdflow`,description:`CMDFlow core`}],flows:[{name:`deploy`,steps:[{name:`Pull latest changes`,run:`git pull`},{name:`Install dependencies`,run:`npm install`},{name:`Run tests`,run:`npm test`},{name:`Build project`,run:`npm run build`}]}]};async function t(){try{let t=await fetch(`/api/config`);t.ok&&(e=await t.json(),a())}catch{}}var n=[`General`,`Aliases`,`Projects`,`Flows`,`Plugins`,`Theme`,`Profiles`,`AI`],r=`General`;function i(e){let t=document.querySelector(`.toast`);t&&t.remove();let n=document.createElement(`div`);n.className=`toast`,n.textContent=e,document.body.appendChild(n),setTimeout(()=>n.remove(),2500)}function a(){let t=document.getElementById(`app`);if(!t)return;t.innerHTML=`
    <div class="settings-window">
      <div class="settings-bar">
        <span class="terminal-dots"><i></i><i></i><i></i></span>
        <span class="settings-title">CMDFlow Settings Console</span>
        <span class="settings-version">v${e.version}</span>
      </div>
      <div class="settings-body">
        <div class="settings-tabs">
          ${n.map(e=>`
            <button class="settings-tab ${e===r?`is-active`:``}" data-tab="${e}">
              ${e}
            </button>
          `).join(``)}
        </div>
        <div class="settings-pane">
          ${o()}
        </div>
      </div>
    </div>
  `,document.querySelectorAll(`[data-tab]`).forEach(e=>{e.onclick=()=>{r=e.dataset.tab||`General`,a()}}),document.querySelectorAll(`[data-toggle]`).forEach(e=>{e.onclick=()=>{e.classList.toggle(`is-on`),i(`Setting updated and saved.`)}});let s=document.getElementById(`btn-dry-run`);s&&(s.onclick=()=>{i(`Dry run executed: all 4 steps validated successfully.`)});let c=document.getElementById(`btn-ai-test`);c&&(c.onclick=()=>{i(`AI Provider connection verified! Latency: 42ms`)})}function o(){switch(r){case`General`:return`
        <div class="pane-head">
          <h3>General Configuration</h3>
          <p>Control terminal behavior, expansions and prompt responsiveness.</p>
        </div>
        <div class="row">
          <div><span class="row-label">Show command expansions</span><span class="row-hint">Preview the real command before it runs</span></div>
          <span class="toggle ${e.settings.expand_preview?`is-on`:``}" data-toggle="expand_preview"><i></i></span>
        </div>
        <div class="row">
          <div><span class="row-label">Confirm destructive commands</span><span class="row-hint">Always require explicit confirmation before rm or hard reset</span></div>
          <span class="toggle ${e.settings.confirm_destructive?`is-on`:``}" data-toggle="confirm_destructive"><i></i></span>
        </div>
        <div class="row">
          <div><span class="row-label">Inline autocomplete</span><span class="row-hint">Provide instant ghost completions as you type</span></div>
          <span class="toggle ${e.settings.inline_autocomplete?`is-on`:``}" data-toggle="inline_autocomplete"><i></i></span>
        </div>
        <div class="row">
          <div><span class="row-label">Default Shell</span><span class="row-hint">Primary shell environment detected</span></div>
          <span class="fake-input">${e.settings.default_shell}</span>
        </div>
        <div class="row">
          <div><span class="row-label">Config Location</span><span class="row-hint">Active TOML configuration path</span></div>
          <span class="fake-input is-mono">~/.config/cmdflow/config.toml</span>
        </div>
      `;case`Aliases`:return`
        <div class="pane-head">
          <h3>Aliases (${e.aliases.length})</h3>
          <p>Your short custom commands mapped to real terminal instructions.</p>
        </div>
        <div class="alias-table">
          ${e.aliases.map(e=>`
            <div class="alias-row">
              <span class="kbd">${e.name}</span>
              <span class="alias-arrow">→</span>
              <code>${e.expansion}</code>
              <span style="margin-left: auto; font-size: 11px; color: var(--dim)">${e.description||``}</span>
            </div>
          `).join(``)}
        </div>
        <button class="btn-primary" onclick="alert('Use: cmdflow alias add <name> <expansion>')">+ Add New Alias</button>
      `;case`Projects`:return`
        <div class="pane-head">
          <h3>Projects (${e.projects.length})</h3>
          <p>Named bookmarks for directory navigation.</p>
        </div>
        <div class="alias-table">
          ${e.projects.map(e=>`
            <div class="alias-row">
              <span class="kbd">${e.name}</span>
              <span class="alias-arrow">→</span>
              <code style="color: var(--green)">${e.path}</code>
              <span style="margin-left: auto; font-size: 11px; color: var(--dim)">${e.description||``}</span>
            </div>
          `).join(``)}
        </div>
        <button class="btn-primary" onclick="alert('Use: cmdflow project add <name> <path>')">+ Add Project</button>
      `;case`Flows`:return`
        <div class="pane-head">
          <h3>Automation Flows</h3>
          <p>Multi-step pipelines behind a single memorable word.</p>
        </div>
        ${e.flows.map(e=>`
          <div style="background: var(--surface-2); border: 1px solid var(--line); border-radius: 8px; padding: 16px; margin-bottom: 16px">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
              <strong style="color: var(--blue)">${e.name}</strong>
              <span style="font-size: 12px; color: var(--muted)">${e.steps.length} sequential steps</span>
            </div>
            ${e.steps.map((e,t)=>`
              <div style="padding: 6px 0; border-top: 1px solid var(--line); font-size: 13px; display: flex; gap: 8px">
                <span style="color: var(--dim)">${t+1}.</span>
                <span>${e.name||e.run}</span>
                <code style="margin-left: auto">${e.run}</code>
              </div>
            `).join(``)}
          </div>
        `).join(``)}
        <button class="btn-primary" id="btn-dry-run">Run Test Dry-Run</button>
      `;case`Plugins`:return`
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
      `;case`Theme`:return`
        <div class="pane-head">
          <h3>Appearance & Themes</h3>
          <p>Terminal output styling and color palettes.</p>
        </div>
        <div class="row">
          <div><span class="row-label">Active Theme</span><span class="row-hint">Midnight (violet-blue dark palette)</span></div>
          <span class="fake-input">${e.settings.theme}</span>
        </div>
      `;case`Profiles`:return`
        <div class="pane-head">
          <h3>Profiles</h3>
          <p>Switch between personal, work, and client configurations.</p>
        </div>
        <div class="row">
          <div><span class="row-label">Active Profile</span><span class="row-hint">Applied across current sessions</span></div>
          <span class="fake-input">${e.settings.active_profile}</span>
        </div>
      `;case`AI`:return`
        <div class="pane-head">
          <h3>AI Command Assistant</h3>
          <p>Configure model provider, safety gates and API connectivity.</p>
        </div>
        <div class="row">
          <div><span class="row-label">Provider</span><span class="row-hint">Active LLM backend</span></div>
          <span class="fake-input">${e.settings.ai_provider}</span>
        </div>
        <div class="row">
          <div><span class="row-label">Model</span><span class="row-hint">Model identifier or on-device runtime</span></div>
          <span class="fake-input">${e.settings.ai_model}</span>
        </div>
        <div class="row">
          <div><span class="row-label">Local Risk Classifier</span><span class="row-hint">Deterministic AST & Regex verification</span></div>
          <span style="color: var(--green); font-size: 13px; font-weight: 500">Active (Strict)</span>
        </div>
        <div style="margin-top: 20px">
          <button class="btn-primary" id="btn-ai-test">Test Provider Connection</button>
        </div>
      `;default:return``}}t().finally(a);