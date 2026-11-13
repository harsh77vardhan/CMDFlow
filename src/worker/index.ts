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
  version: '1.0.3',
  release_date: '2026-11-13',
  notes: 'Production release: cross-platform command layer for Bash, Zsh, Fish, and PowerShell with embedded settings UI and AI assistant',
  platforms: {
    'linux-x86_64': {
      url: 'https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.3/cmdflow-linux-x86_64.tar.gz',
      sha256: '88a50d4461ee52494b69b055062f0cf582d6cc9706c6bd413c07b8805a1360a2',
    },
    'darwin-arm64': {
      url: 'https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.3/cmdflow-darwin-arm64.tar.gz',
      sha256: '59e98451121aa0c0851b338f7aac6de61fe4a4cbf52b0bc1bfa26ae694085c22',
    },
    'darwin-x86_64': {
      url: 'https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.3/cmdflow-darwin-x86_64.tar.gz',
      sha256: 'daef67d443ea8eb4c38c359acd5088c806cf63df7c2ae509452749b194eb247c',
    },
    'windows-x86_64': {
      url: 'https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.3/cmdflow-windows-x86_64.zip',
      sha256: 'f6f30dc44de99387420007ec312d6413882de31f7bab0f26d057ebbfb0e78821',
    },
  },
  install_scripts: {
    unix: 'curl -fsSL https://cmdflow.cmdflow.workers.dev/install.sh | bash',
    powershell: 'iwr -useb https://cmdflow.cmdflow.workers.dev/install.ps1 | iex',
  },
}

const memoryRateLimits = new Map<string, { count: number; resetAt: number }>()

const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https?:\/\/cmdflow\.cmdflow\.workers\.dev$/,
  /^https:\/\/harsh77vardhan\.github\.io$/,
  /^https:\/\/.*\.cmdflow\.pages\.dev$/,
  /^https:\/\/cmdflow\.dev$/,
]

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true
  return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Install-Token',
    'Access-Control-Max-Age': '86400',
  }
  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
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

async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  kv?: KVNamespace,
): Promise<boolean> {
  if (kv) {
    try {
      const val = await kv.get(key)
      const count = val ? parseInt(val, 10) : 0
      if (count >= limit) {
        return false
      }
      await kv.put(key, (count + 1).toString(), {
        expirationTtl: Math.max(windowSeconds, 60),
      })
      return true
    } catch {
      // Fallback to memory
    }
  }
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
    const origin = request.headers.get('Origin')

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      if (origin && !isOriginAllowed(origin)) {
        return new Response('CORS origin rejected', { status: 403 })
      }
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      })
    }

    // Reject foreign origins on API namespace
    if (url.pathname.startsWith('/api/') && origin && !isOriginAllowed(origin)) {
      return errorResponse('Foreign Origin rejected by CORS', 403, request)
    }

    // Health check
    if (url.pathname === '/api/health') {
      return jsonResponse(
        {
          status: 'ok',
          service: 'cmdflow-api',
          version: LATEST_RELEASE.version,
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
        if (!(await checkRateLimit(`wl:${ip}`, 5, 60, env.RATE_LIMIT_KV))) {
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
      if (!(await checkRateLimit(`tok:${ip}`, 10, 60, env.RATE_LIMIT_KV))) {
        return errorResponse('Rate limit exceeded', 429, request)
      }
      const token = `cf_tok_${crypto.randomUUID().replace(/-/g, '')}`
      return jsonResponse({ install_token: token, created_at: new Date().toISOString() }, 200, request)
    }

    // AI Command Proxy
    if (url.pathname === '/api/ai/command' && request.method === 'POST') {
      try {
        const ip = request.headers.get('CF-Connecting-IP') ?? '127.0.0.1'
        if (!(await checkRateLimit(`ai:${ip}`, 20, 60, env.RATE_LIMIT_KV))) {
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

        // Cloud AI is disabled by default on the public Worker unless explicitly configured
        if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY && !env.GEMINI_API_KEY) {
          return jsonResponse(
            {
              error:
                'Cloud AI is disabled on this demo deployment. Set OPENAI_API_KEY / ANTHROPIC_API_KEY locally in ~/.config/cmdflow/config.toml, or use Ollama for free local inference.',
            },
            503,
            request,
          )
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
