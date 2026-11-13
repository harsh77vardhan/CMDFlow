import { describe, it, expect } from 'vitest'
import worker, { type Env } from './index'

const mockEnv: Env = {
  ASSETS: {
    fetch: async () => new Response('Mock Asset', { status: 200 }),
  } as unknown as Fetcher,
}

describe('Cloudflare Worker API', () => {
  it('GET /api/health returns 200 with service status', async () => {
    const req = new Request('http://localhost/api/health')
    const res = await worker.fetch(req, mockEnv)
    expect(res.status).toBe(200)
    const data = (await res.json()) as { status: string; service: string }
    expect(data.status).toBe('ok')
    expect(data.service).toBe('cmdflow-api')
  })

  it('GET /api/releases/latest returns latest version info and checksums', async () => {
    const req = new Request('http://localhost/api/releases/latest')
    const res = await worker.fetch(req, mockEnv)
    expect(res.status).toBe(200)
    const data = (await res.json()) as { version: string; platforms: Record<string, { sha256: string }> }
    expect(data.version).toBe('1.0.3')
    expect(data.platforms['linux-x86_64'].sha256).toBeDefined()
  })

  it('POST /api/waitlist rejects invalid email', async () => {
    const req = new Request('http://localhost/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    })
    const res = await worker.fetch(req, mockEnv)
    expect(res.status).toBe(400)
    const data = (await res.json()) as { error: string }
    expect(data.error).toContain('Invalid email')
  })

  it('POST /api/waitlist succeeds with valid email', async () => {
    const req = new Request('http://localhost/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'developer@example.com' }),
    })
    const res = await worker.fetch(req, mockEnv)
    expect(res.status).toBe(200)
    const data = (await res.json()) as { success: boolean }
    expect(data.success).toBe(true)
  })

  it('POST /api/waitlist ignores honeypot submissions', async () => {
    const req = new Request('http://localhost/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bot@example.com', hp: 'bot-filled' }),
    })
    const res = await worker.fetch(req, mockEnv)
    expect(res.status).toBe(200)
  })

  it('POST /api/install-token generates unique token', async () => {
    const req = new Request('http://localhost/api/install-token', { method: 'POST' })
    const res = await worker.fetch(req, mockEnv)
    expect(res.status).toBe(200)
    const data = (await res.json()) as { install_token: string }
    expect(data.install_token).toMatch(/^cf_tok_/)
  })

  it('POST /api/ai/command returns 503 when Cloud AI is disabled (default)', async () => {
    const req = new Request('http://localhost/api/ai/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'delete node modules' }),
    })
    const res = await worker.fetch(req, mockEnv)
    expect(res.status).toBe(503)
    const data = (await res.json()) as { error: string }
    expect(data.error).toContain('Cloud AI is disabled')
  })

  it('POST /api/ai/command classifies destructive requests when API key is provided', async () => {
    const req = new Request('http://localhost/api/ai/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'delete node modules' }),
    })
    const authEnv: Env = {
      ...mockEnv,
      OPENAI_API_KEY: 'test-key',
    }
    const res = await worker.fetch(req, authEnv)
    expect(res.status).toBe(200)
    const data = (await res.json()) as { command: string; risk: string }
    expect(data.command).toBe('rm -rf node_modules')
    expect(data.risk).toBe('destructive')
  })

  it('POST /api/feedback validates message requirement', async () => {
    const req = new Request('http://localhost/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 5 }),
    })
    const res = await worker.fetch(req, mockEnv)
    expect(res.status).toBe(400)
  })

  it('GET /api/unknown returns 404', async () => {
    const req = new Request('http://localhost/api/nonexistent_route')
    const res = await worker.fetch(req, mockEnv)
    expect(res.status).toBe(404)
  })
})
