import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from './server.mjs'

async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  return `http://127.0.0.1:${server.address().port}`
}
async function close(server) {
  if (!server.listening) return
  server.closeAllConnections()
  await new Promise(resolve => server.close(resolve))
}

test('gateway serves deep links and proxies each API to its own service', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'floodwatch-gateway-'))
  await writeFile(join(directory, 'index.html'), '<!doctype html><title>FloodWatch</title>')
  const requests = []
  const upstream = name => createServer(async (req, res) => {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    requests.push({ name, method: req.method, path: req.url, body: Buffer.concat(chunks).toString() })
    res.writeHead(req.method === 'POST' ? 201 : 200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ service: name }))
  })
  const reports = upstream('report')
  const alerts = upstream('alert')
  const gateway = createApp({ reportUrl: await listen(reports), alertUrl: await listen(alerts), distDir: directory })
  const url = await listen(gateway)
  t.after(async () => { await close(gateway); await close(reports); await close(alerts); await rm(directory, { recursive: true }) })
  const deepLink = await fetch(url + '/feed')
  assert.equal(deepLink.status, 200)
  assert.match(await deepLink.text(), /<title>FloodWatch/)
  assert.equal((await fetch(url + '/assets/missing.js')).status, 404)
  assert.equal((await fetch(url + '/api/reports?status=OPEN')).status, 200)
  assert.equal((await fetch(url + '/api/alerts?active=true')).status, 200)
  assert.equal((await fetch(url + '/api/insights')).status, 200)
  const body = JSON.stringify({ streetId: 10, severity: 3 })
  assert.equal((await fetch(url + '/api/reports', { method: 'POST', body })).status, 201)
  assert.deepEqual(requests.slice(0, 4), [
    { name: 'report', method: 'GET', path: '/api/reports?status=OPEN', body: '' },
    { name: 'alert', method: 'GET', path: '/api/alerts?active=true', body: '' },
    { name: 'alert', method: 'GET', path: '/api/insights', body: '' },
    { name: 'report', method: 'POST', path: '/api/reports', body },
  ])
  assert.equal((await fetch(url + '/health')).status, 200)
  assert.equal((await fetch(url + '/api/users', { method: 'POST', body: '{}' })).status, 403)
  assert.equal((await fetch(url + '/api/%75sers', { method: 'POST', body: '{}' })).status, 400)
  assert.equal((await fetch(url + '/api/reports', { method: 'POST', body: 'x'.repeat(70000) })).status, 413)
  await close(alerts)
  assert.equal((await fetch(url + '/health')).status, 503)
  const failed = await fetch(url + '/api/insights')
  assert.equal(failed.status, 502)
  assert.match((await failed.json()).message, /temporarily unavailable/)
})

test('demo write cap does not depend on spoofable client IP headers', async t => {
  const backend = createServer((req, res) => { req.resume(); res.end('{}') })
  const origin = await listen(backend)
  const gateway = createApp({ reportUrl: origin, alertUrl: origin, writeLimit: 1 })
  const url = await listen(gateway)
  t.after(async () => { await close(gateway); await close(backend) })
  assert.equal((await fetch(url + '/api/reports', { method: 'POST', body: '{}' })).status, 200)
  const limited = await fetch(url + '/api/reports', { method: 'POST', body: '{}', headers: { 'x-real-ip': '203.0.113.4' } })
  assert.equal(limited.status, 429)
  assert.equal(limited.headers.get('retry-after'), '60')
})
