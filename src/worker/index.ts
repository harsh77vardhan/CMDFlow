export interface Env {
  ASSETS: Fetcher
}

/**
 * The CMDFlow landing page is static. The Worker serves the built assets and
 * keeps a small reserved namespace for future API routes.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/'))
      return Response.json(
        { error: 'Not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      )
    return env.ASSETS.fetch(request)
  },
}
