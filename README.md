# CMDFlow

A premium landing page for CMDFlow — a command layer that sits on top of the
shell you already use (Fish, Bash, Zsh, PowerShell). Instead of memorising long
terminal commands, you define short, memorable commands that expand into real
ones.

This site is built from the Coil template's stack and design language: Vite,
TypeScript, locally hosted variable fonts, a hand-written CSS design system, and
canvas/DOM animation with reduced-motion and hidden-tab safeguards. The original
game logic has been removed.

## Run

```sh
bun install --frozen-lockfile
bun run dev
```

Requires Bun 1.3.14 (see `.bun-version`). Vite serves the page through the
Cloudflare plugin at `http://127.0.0.1:5197`. For a forwarded Cloud workspace
preview, bind to all interfaces and pass the port:

```sh
bunx vite --host 0.0.0.0 --port 3000
```

## Structure

- `index.html`: document metadata for CMDFlow.
- `src/client/main.ts`: page markup, content data, hero typing loop, interactive
  demo, settings showcase tabs, scroll reveals and toasts.
- `src/client/terminal.ts`: realistic typing engine shared by both terminals.
- `src/client/background.ts`: drifting ambient canvas field.
- `src/client/style.css`: design tokens, layout, motion and responsive rules.
- `src/worker/index.ts`: static asset Worker with a reserved `/api/*` namespace.
- `public/favicon.svg`: CMDFlow mark.

Everything is client-side. The interactive demo executes nothing; terminal
output is scripted. Navigation links for GitHub, downloads, documentation and
Discord are not live yet and explain that in a toast.

## Content status

The page describes the product honestly: features that are being designed carry
a **Planned** pill, and the roadmap states that no release dates are promised.
Custom aliases, projects, context awareness, automation flows and customization
are presented as the core product.

## Verify

```sh
bun run typecheck
bun run build
```

## Deploy

```sh
bun run build
bunx wrangler deploy --config dist/cmdflow/wrangler.json --name your-cmdflow-site
```

The Worker serves the built assets; no Durable Objects or databases are
required. Use your own Worker name and credentials — never commit account
tokens.
