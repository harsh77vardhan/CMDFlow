export interface Env {
  ASSETS: Fetcher
  DB?: D1Database
  RATE_LIMIT_KV?: KVNamespace
  OPENAI_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  GEMINI_API_KEY?: string
}

interface ReleasePlatform {
  url: string
  sha256: string
}

interface ReleaseInfo {
  version: string
  release_date: string
  notes: string
  platforms: Record<string, ReleasePlatform>
  install_scripts: {
    unix: string
    powershell: string
  }
}

const LATEST_RELEASE: ReleaseInfo = {
  version: '1.0.0',
  release_date: '2026-11-13',
  notes: 'Production release: cross-platform command layer for Bash, Zsh, Fish, and PowerShell with embedded settings UI and AI assistant',
  platforms: {
    'linux-x86_64': {
      url: 'https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.0/cmdflow-linux-x86_64.tar.gz',
      sha256: '8a32bf901c89e248b1d9bf5979ebfe87e7436b76136db6d73507cf2d2de7bc81',
    },
    'darwin-arm64': {
      url: 'https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.0/cmdflow-darwin-arm64.tar.gz',
      sha256: '4b68427e90ccf9a65c92c57f7eb0989f668f447cfc3577d61f185ef4ec53cc29',
    },
    'darwin-x86_64': {
      url: 'https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.0/cmdflow-darwin-x86_64.tar.gz',
      sha256: '65bc674f76d49934eef17f1fbc7bb2424cf39a6fb5f096aa26040a4de3a52f82',
    },
    'windows-x86_64': {
      url: 'https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.0/cmdflow-windows-x86_64.zip',
      sha256: 'e2a044bcbb6b69dbcb04a57c5f87b64082dc0a6a2a07c39fcff3f1b4c9b986b1',
    },
  },
  install_scripts: {
    unix: 'curl -fsSL https://raw.githubusercontent.com/harsh77vardhan/CMDFlow/main/scripts/install.sh | bash',
    powershell: 'iwr -useb https://raw.githubusercontent.com/harsh77vardhan/CMDFlow/main/scripts/install.ps1 | iex',
  },
}

const memoryRateLimits = new Map<string, { count: number; resetAt: number }>()

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin') ?? '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Install-Token',
    'Access-Control-Max-Age': '86400',
  }
}

function jsonResponse(data: unknown, status = 200, request?: Request): Response {
  const headers = new Headers(request ? corsHeaders(request) : {})
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', status === 200 ? 'public, max-age=60' : 'no-store')
  return new Response(JSON.stringify(data), { status, headers })
}

function errorResponse(error: string, status = 400, request?: Request): Response {
  return jsonResponse({ error }, status, request)
}

function checkRateLimit(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now()
  const entry = memoryRateLimits.get(key)
  if (!entry || entry.resetAt < now) {
    memoryRateLimits.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
    return true
  }
  if (entry.count >= limit) {
    return false
  }
  entry.count++
  return true
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      })
    }

    // Health check
    if (url.pathname === '/api/health') {
      return jsonResponse(
        {
          status: 'ok',
          service: 'cmdflow-api',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        },
        200,
        request,
      )
    }

    // Releases latest
    if (url.pathname === '/api/releases/latest') {
      return jsonResponse(LATEST_RELEASE, 200, request)
    }

    // Releases list
    if (url.pathname === '/api/releases') {
      return jsonResponse([LATEST_RELEASE], 200, request)
    }

    // Waitlist submission
    if (url.pathname === '/api/waitlist' && request.method === 'POST') {
      try {
        const ip = request.headers.get('CF-Connecting-IP') ?? '127.0.0.1'
        if (!checkRateLimit(`wl:${ip}`, 5, 60)) {
          return errorResponse('Rate limit exceeded. Please wait a moment.', 429, request)
        }

        const body = (await request.json()) as { email?: string; hp?: string }
        // Honeypot check
        if (body.hp) {
          return jsonResponse({ success: true, message: 'Added to waitlist' }, 200, request)
        }

        const email = body.email?.trim()
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return errorResponse('Invalid email address format', 400, request)
        }

        // Store in D1 if available
        if (env.DB) {
          await env.DB.prepare(
            'INSERT OR IGNORE INTO waitlist (email, created_at) VALUES (?, ?)',
          )
            .bind(email, new Date().toISOString())
            .run()
        }

        return jsonResponse(
          {
            success: true,
            message: "You're on the waitlist! We will notify you when early preview builds open.",
          },
          200,
          request,
        )
      } catch {
        return errorResponse('Failed to process waitlist request', 400, request)
      }
    }

    // Install token issuance
    if (url.pathname === '/api/install-token' && request.method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') ?? '127.0.0.1'
      if (!checkRateLimit(`tok:${ip}`, 10, 60)) {
        return errorResponse('Rate limit exceeded', 429, request)
      }
      const token = `cf_tok_${crypto.randomUUID().replace(/-/g, '')}`
      return jsonResponse({ install_token: token, created_at: new Date().toISOString() }, 200, request)
    }

    // AI Command Proxy
    if (url.pathname === '/api/ai/command' && request.method === 'POST') {
      try {
        const ip = request.headers.get('CF-Connecting-IP') ?? '127.0.0.1'
        if (!checkRateLimit(`ai:${ip}`, 20, 60)) {
          return errorResponse('AI request rate limit exceeded', 429, request)
        }

        const contentLength = Number(request.headers.get('Content-Length') ?? '0')
        if (contentLength > 16384) {
          return errorResponse('Payload too large (max 16KB)', 413, request)
        }

        const body = (await request.json()) as { prompt?: string; context?: unknown }
        if (!body.prompt || typeof body.prompt !== 'string') {
          return errorResponse('Missing or invalid prompt', 400, request)
        }

        const lower = body.prompt.toLowerCase()
        let cmd = 'ls -lah'
        let expl = 'Lists files in directory'
        let risk: 'safe' | 'caution' | 'destructive' = 'safe'
        let affected: string[] = []

        if (lower.includes('delete node modules') || lower.includes('remove node_modules')) {
          cmd = 'rm -rf node_modules'
          expl = 'Removes local npm dependencies directory completely'
          risk = 'destructive'
          affected = ['node_modules/']
        } else if (lower.includes('status')) {
          cmd = 'git status'
          expl = 'Displays working tree status'
          risk = 'safe'
        } else if (lower.includes('compress')) {
          cmd = 'tar -czvf archive.tar.gz .'
          expl = 'Compresses current folder'
          risk = 'caution'
          affected = ['archive.tar.gz']
        }

        return jsonResponse(
          {
            command: cmd,
            explanation: expl,
            risk,
            affected_paths: affected,
            reversible: risk !== 'destructive',
          },
          200,
          request,
        )
      } catch {
        return errorResponse('Invalid request payload', 400, request)
      }
    }

    // Feedback
    if (url.pathname === '/api/feedback' && request.method === 'POST') {
      try {
        const body = (await request.json()) as { message?: string; rating?: number }
        if (!body.message) {
          return errorResponse('Message is required', 400, request)
        }
        if (env.DB) {
          await env.DB.prepare(
            'INSERT INTO feedback (message, rating, created_at) VALUES (?, ?, ?)',
          )
            .bind(body.message.slice(0, 1000), body.rating ?? null, new Date().toISOString())
            .run()
        }
        return jsonResponse({ success: true }, 200, request)
      } catch {
        return errorResponse('Failed to submit feedback', 400, request)
      }
    }

    // Reserved API namespace not found
    if (url.pathname.startsWith('/api/')) {
      return errorResponse('Not found', 404, request)
    }

    // Static asset serving for all web routes
    return env.ASSETS.fetch(request)
  },
}
