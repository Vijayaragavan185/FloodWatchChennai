// Retry reads briefly while a backend or its database is restarting. Never replay
// writes: a failed response does not mean the report or vote was not saved.
const RETRY_DELAYS = [500, 1000, 2000]
const TEMPORARY_STATUSES = new Set([502, 503, 504])
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function request(method, url, body) {
  const options = { method, headers: {} }
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }
  const retries = method === 'GET' ? RETRY_DELAYS.length : 0
  for (let attempt = 0; ; attempt++) {
    let res, text
    try {
      res = await fetch(url, options)
      text = await res.text()
    } catch (err) {
      if (attempt < retries) {
        await wait(RETRY_DELAYS[attempt])
        continue
      }
      throw new Error('Unable to connect. Please check your connection and try again.', { cause: err })
    }
    if (res.ok) return text ? JSON.parse(text) : null
    const temporary = TEMPORARY_STATUSES.has(res.status)
    if (temporary && attempt < retries) {
      await wait(RETRY_DELAYS[attempt])
      continue
    }
    if (temporary) throw new Error('Service temporarily unavailable. Please try again.')
    let data
    try { data = text ? JSON.parse(text) : null } catch { /* Gateways may send HTML. */ }
    throw new Error(data?.message || `${res.status} ${res.statusText}`)
  }
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body ?? {}),
  put: (url, body) => request('PUT', url, body),
}

export const SEVERITY = [
  { level: 0, label: 'No report', color: '#e3ebf3' },
  { level: 1, label: 'Puddles', color: '#b9e0f2', hint: 'Water on the road surface only' },
  { level: 2, label: 'Ankle deep', color: '#6fbde3', hint: 'Walking is uncomfortable' },
  { level: 3, label: 'Knee deep', color: '#f2bd3f', hint: 'Two-wheelers struggle' },
  { level: 4, label: 'Vehicles stalled', color: '#ec7d32', hint: 'Cars and autos stopping' },
  { level: 5, label: 'Road submerged', color: '#d23b33', hint: 'Avoid the road completely' },
]

export const LEVEL_COLOR = { WATCH: '#1d7fc4', WARNING: '#e08a12', SEVERE: '#d23b33' }

export function timeAgo(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`
  const days = Math.floor(diff / 86400)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
