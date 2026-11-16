import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'

export function createAuth(accounts, reportUrl, secure = true) {
  const sessions = new Map(), attempts = new Map()
  const digest = token => createHash('sha256').update(token).digest('hex')
  const cookie = (token, age) => `floodwatch_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? '; Secure' : ''}`
  const session = req => {
    const token = /(?:^|;\s*)floodwatch_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1]
    if (!token) return null
    const key = digest(token), value = sessions.get(key)
    if (!value || value.expires < Date.now()) { sessions.delete(key); return null }
    return { key, user: value.user }
  }
  return { session, async handle(req, res, url, json) {
    if (!url.pathname.startsWith('/api/auth/')) return false
    if (url.pathname === '/api/auth/me' && req.method === 'GET') {
      json(res, 200, { user: session(req)?.user || null }); return true
    }
    if (req.method !== 'POST') { json(res, 405, { message: 'Method not allowed' }); return true }
    if (req.headers['sec-fetch-site'] === 'cross-site') { json(res, 403, { message: 'Invalid request origin' }); return true }
    if (url.pathname === '/api/auth/logout') {
      const current = session(req)
      if (current) sessions.delete(current.key)
      res.setHeader('Set-Cookie', cookie('', 0)); json(res, 200, { message: 'Signed out' }); return true
    }
    if (url.pathname !== '/api/auth/login') { json(res, 404, { message: 'Not found' }); return true }
    let text = ''
    for await (const part of req) {
      text += part.toString()
      if (text.length > 4096) { json(res, 413, { message: 'Request too large' }); return true }
    }
    let input
    try { input = JSON.parse(text) } catch { json(res, 400, { message: 'Enter email and password' }); return true }
    const email = String(input?.email || '').trim().toLowerCase(), password = String(input?.password || '')
    if (email.length > 254 || password.length > 256) { json(res, 400, { message: 'Invalid credentials' }); return true }
    const now = Date.now(), attempt = attempts.get(email) || { count: 0, start: now }
    if (now - attempt.start > 60000) { attempt.count = 0; attempt.start = now }
    if (++attempt.count > 12) { json(res, 429, { message: 'Too many attempts. Try in a minute.' }); return true }
    if (attempts.size > 1000) attempts.clear()
    attempts.set(email, attempt)
    const account = accounts.find(a => a.email === email)
    const expected = Buffer.from(account?.hash || '00'.repeat(32), 'hex')
    const actual = scryptSync(password, account?.salt || 'unknown-account', 32)
    if (!account || expected.length !== actual.length || !timingSafeEqual(actual, expected)) {
      json(res, 401, { message: 'Incorrect email or password' }); return true
    }
    const usersResponse = await fetch(reportUrl + '/api/users', { signal: AbortSignal.timeout(10000) })
    if (!usersResponse.ok) throw new Error('Users unavailable')
    const users = await usersResponse.json()
    let user = account.role === 'OFFICIAL' ? users.find(u => u.role === 'OFFICIAL') : users.find(u => u.phone === account.phone)
    if (!user && account.role === 'CITIZEN') {
      const created = await fetch(reportUrl + '/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: account.fullName, phone: account.phone }), signal: AbortSignal.timeout(10000) })
      if (!created.ok) throw new Error('Account unavailable')
      user = await created.json()
    }
    if (!user || user.role !== account.role) throw new Error('Account role unavailable')
    user = { id: user.id, fullName: user.fullName, role: user.role, email }
    for (const [key, value] of sessions) if (value.expires < now) sessions.delete(key)
    if (sessions.size >= 5000) { json(res, 503, { message: 'Please try again later' }); return true }
    const token = randomBytes(32).toString('hex')
    sessions.set(digest(token), { user, expires: now + 8 * 3600000 })
    attempts.delete(email)
    res.setHeader('Set-Cookie', cookie(token, 8 * 3600)); json(res, 200, { user }); return true
  } }
}
