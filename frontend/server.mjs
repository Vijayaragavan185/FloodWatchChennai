import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2' }

export function createApp({ reportUrl, alertUrl, distDir = resolve(dirname(fileURLToPath(import.meta.url)), 'dist'),
  publicDemo = true, writeLimit = 120, requestTimeout = 15000 } = {}) {
  const targets = [reportUrl, alertUrl].map(value => {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/') {
      throw new Error('Upstream addresses must be HTTP origins without credentials or paths')
    }
    return url.origin
  })
  const root = resolve(distDir)
  let writeWindow = { start: Date.now(), count: 0 }
  const json = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify(body))
  }
  const probe = async url => {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000), redirect: 'error' })
    await response.body?.cancel()
    return response.ok
  }
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")
    try {
      const url = new URL(req.url, 'http://localhost')
      if (url.pathname === '/health' && req.method === 'GET') {
        const checks = await Promise.allSettled([probe(targets[0] + '/api/stats'), probe(targets[1] + '/api/alerts?active=true')])
        const ready = checks.every(check => check.status === 'fulfilled' && check.value)
        return json(res, ready ? 200 : 503, { status: ready ? 'UP' : 'DOWN' })
      }
      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
        // These API paths contain only fixed names and numeric IDs. Reject encoded aliases
        // so they cannot bypass public-demo restrictions before Spring decodes them.
        if (url.pathname.includes('%')) return json(res, 400, { message: 'Invalid API path' })
        if (!['GET', 'POST', 'PUT'].includes(req.method)) return json(res, 405, { message: 'Method not allowed' })
        if (publicDemo && req.method === 'POST' && url.pathname.replace(/\/+$/, '') === '/api/users') {
          return json(res, 403, { message: 'Choose an existing demo user. Registration is disabled on the public demo.' })
        }
        if (req.method !== 'GET') {
          const now = Date.now()
          // An aggregate cap bounds writes to this shared demo without trusting client IP headers.
          if (now - writeWindow.start >= 60000) writeWindow = { start: now, count: 0 }
          if (++writeWindow.count > writeLimit) {
            res.setHeader('Retry-After', '60')
            return json(res, 429, { message: 'Demo write limit reached. Try again in a minute.' })
          }
        }
        const chunks = []
        let size = 0
        for await (const chunk of req.iterator({ destroyOnReturn: false })) {
          size += chunk.length
          if (size > 65536) {
            req.resume()
            return json(res, 413, { message: 'Request is too large' })
          }
          chunks.push(chunk)
        }
        const isAlert = /^\/api\/(alerts|insights)(\/|$)/.test(url.pathname)
        const response = await fetch(targets[isAlert ? 1 : 0] + url.pathname + url.search, {
          method: req.method, headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: req.method === 'GET' ? undefined : Buffer.concat(chunks),
          redirect: 'error', signal: AbortSignal.timeout(requestTimeout),
        })
        res.writeHead(response.status, { 'Content-Type': response.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' })
        res.end(Buffer.from(await response.arrayBuffer()))
        return
      }
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { message: 'Method not allowed' })
      let path
      try { path = decodeURIComponent(url.pathname) } catch { return json(res, 400, { message: 'Invalid path' }) }
      if (path.includes('\0') || path.includes('\\')) return json(res, 400, { message: 'Invalid path' })
      let file = resolve(root, '.' + path)
      if (!file.startsWith(root + sep) && file !== root) return json(res, 403, { message: 'Invalid path' })
      let found = false
      try { found = (await stat(file)).isFile() } catch { /* Missing asset or SPA route. */ }
      if (!found) {
        if (extname(path) || path.startsWith('/assets/')) return json(res, 404, { message: 'Asset not found' })
        file = resolve(root, 'index.html')
      }
      const bytes = await readFile(file)
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream',
        'Content-Length': bytes.length, 'Cache-Control': file.includes(sep + 'assets' + sep) ? 'public, max-age=31536000, immutable' : 'no-cache' })
      res.end(req.method === 'HEAD' ? undefined : bytes)
    } catch (error) {
      if (res.headersSent) return res.end()
      json(res, 502, { message: 'The services are starting or temporarily unavailable. Please try again shortly.' })
    }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const server = createApp({ reportUrl: process.env.REPORT_SERVICE_URL, alertUrl: process.env.ALERT_SERVICE_URL,
    publicDemo: process.env.PUBLIC_DEMO !== 'false' })
  const port = Number(process.env.PORT || 8080)
  server.listen(port, '::', () => console.log(`FloodWatch public gateway listening on ${port}`))
  process.on('SIGTERM', () => server.close(() => process.exit(0)))
}
