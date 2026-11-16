import test from 'node:test'
import assert from 'node:assert/strict'
import { api } from './src/api/client.js'

test('reads recover from temporary backend errors, including HTML gateway responses', async t => {
  const responses = [
    new Response('{"message":"Database unavailable"}', { status: 503 }),
    new Response('<html>Bad Gateway</html>', { status: 502 }),
    new Response('', { status: 504 }),
    Response.json({ chronic: [{ streetId: 1 }] }),
  ]
  const fetch = t.mock.method(globalThis, 'fetch', async () => responses.shift())
  assert.deepEqual(await api.get('/api/insights'), { chronic: [{ streetId: 1 }] })
  assert.equal(fetch.mock.callCount(), 4)
})

test('a lasting outage stops retrying and returns an actionable error', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('Unavailable', { status: 503 }))
  await assert.rejects(api.get('/api/insights'), /Service temporarily unavailable\. Please try again\./)
  assert.equal(fetch.mock.callCount(), 4)
})

test('a read recovers from a dropped connection', async t => {
  let calls = 0
  const fetch = t.mock.method(globalThis, 'fetch', async () => {
    if (++calls === 1) throw new TypeError('Failed to fetch')
    return Response.json({ status: 'UP' })
  })
  assert.deepEqual(await api.get('/api/stats'), { status: 'UP' })
  assert.equal(fetch.mock.callCount(), 2)
})

test('validation failures return immediately with the backend message', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Unknown ward' }, { status: 404 }))
  await assert.rejects(api.get('/api/wards/999'), /Unknown ward/)
  assert.equal(fetch.mock.callCount(), 1)
})

test('writes are never replayed after an error or lost response', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }))
  await assert.rejects(api.post('/api/reports', { streetId: 1 }), /temporarily unavailable/)
  assert.equal(fetch.mock.callCount(), 1)
  fetch.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(api.put('/api/reports/1/status', { status: 'RESOLVED' }), /Unable to connect/)
  assert.equal(fetch.mock.callCount(), 2)
})
