import { useEffect, useMemo, useRef, useState } from 'react'
import { SEVERITY } from '../api/client.js'

const COLS = 7
const ROWS = 9
const SEA = 0.9 // width of the sea strip, in cells

/**
 * Schematic ward map of Chennai drawn on an HTML5 Canvas.
 * Each cell is a ward coloured by the highest active severity; wards with an active
 * street alert pulse. North is at the top and the Bay of Bengal is on the right.
 */
export default function WardMap({ summaries, alerts, selectedId, onSelect, maxHeight = 600 }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const [width, setWidth] = useState(640)
  const [hover, setHover] = useState(null)

  const alerted = useMemo(() => {
    const set = new Set()
    ;(alerts ?? []).forEach((a) => set.add(`${a.gridRow},${a.gridCol}`))
    return set
  }, [alerts])

  // Keep the latest values in a ref so the animation loop never has to restart.
  const state = useRef({})
  state.current = { summaries: summaries ?? [], alerted, selectedId, hoverId: hover?.ward.wardId }

  // Resize the canvas with its container.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(320, Math.floor(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const avail = width
  const cell = Math.min(avail / (COLS + SEA), maxHeight / ROWS)
  const height = Math.round(cell * ROWS)
  const canvasWidth = Math.round(cell * (COLS + SEA))

  // Animation loop: draws the whole map about 60 times a second.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const width = canvasWidth
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    let frame

    const draw = (t) => {
      const { summaries: wards, alerted: hot, selectedId: sel, hoverId } = state.current
      ctx.clearRect(0, 0, width, height)

      // land
      ctx.fillStyle = '#f3f6fa'
      ctx.fillRect(0, 0, COLS * cell, height)

      // sea with moving waves
      const seaX = COLS * cell
      const grad = ctx.createLinearGradient(seaX, 0, width, 0)
      grad.addColorStop(0, '#cfe6f6')
      grad.addColorStop(1, '#8cc4ea')
      ctx.fillStyle = grad
      ctx.fillRect(seaX, 0, width - seaX, height)
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 1.5
      for (let y = 18; y < height; y += 26) {
        ctx.beginPath()
        for (let x = seaX + 4; x < width; x += 4) {
          const yy = y + Math.sin(x / 9 + t / 600 + y) * 3
          x === seaX + 4 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy)
        }
        ctx.stroke()
      }
      ctx.save()
      ctx.translate(seaX + (width - seaX) / 2 + 4, height / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillStyle = '#2a6f9e'
      ctx.font = `600 ${Math.max(11, cell * 0.16)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('BAY OF BENGAL', 0, 0)
      ctx.restore()

      // wards
      const pad = Math.max(2, cell * 0.05)
      wards.forEach((w) => {
        const x = w.gridCol * cell + pad
        const y = w.gridRow * cell + pad
        const s = cell - pad * 2
        const sev = SEVERITY[w.maxSeverity] ?? SEVERITY[0]
        roundRect(ctx, x, y, s, s, s * 0.14)
        ctx.fillStyle = sev.color
        ctx.fill()
        ctx.lineWidth = w.wardId === sel ? 3 : w.wardId === hoverId ? 2 : 1
        ctx.strokeStyle = w.wardId === sel ? '#0b2540' : w.wardId === hoverId ? '#33536f' : 'rgba(11,37,64,0.18)'
        ctx.stroke()

        // pulsing ring for wards with an active alert
        if (hot.has(`${w.gridRow},${w.gridCol}`)) {
          const phase = (t % 1600) / 1600
          ctx.beginPath()
          ctx.arc(x + s / 2, y + s / 2, s * (0.35 + phase * 0.35), 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(210,59,51,${0.85 * (1 - phase)})`
          ctx.lineWidth = 3
          ctx.stroke()
        }

        // label
        ctx.fillStyle = w.maxSeverity >= 4 ? '#fff' : '#12304d'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const lines = wrap(w.name, 11)
        let size = Math.max(9, cell * 0.15)
        ctx.font = `600 ${size}px system-ui, sans-serif`
        const widest = Math.max(...lines.map((l) => ctx.measureText(l).width))
        if (widest > s * 0.9) { size = size * (s * 0.9) / widest; ctx.font = `600 ${size}px system-ui, sans-serif` }
        lines.forEach((line, i, arr) => {
          ctx.fillText(line, x + s / 2, y + s / 2 + (i - (arr.length - 1) / 2) * size * 1.15)
        })

        // badge with the number of active reports
        if (w.activeReports > 0) {
          const r = Math.max(7, cell * 0.12)
          ctx.beginPath()
          ctx.arc(x + s - r * 0.7, y + r * 0.7, r, 0, Math.PI * 2)
          ctx.fillStyle = '#0b2540'
          ctx.fill()
          ctx.fillStyle = '#fff'
          ctx.font = `700 ${r * 1.1}px system-ui, sans-serif`
          ctx.fillText(String(w.activeReports), x + s - r * 0.7, y + r * 0.75)
        }
      })

      // compass
      ctx.fillStyle = '#12304d'
      ctx.font = '700 12px system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('N ↑', 8, 14)

      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [canvasWidth, height, cell])

  function wardAt(evt) {
    const rect = canvasRef.current.getBoundingClientRect()
    const col = Math.floor((evt.clientX - rect.left) / cell)
    const row = Math.floor((evt.clientY - rect.top) / cell)
    return (summaries ?? []).find((w) => w.gridRow === row && w.gridCol === col) ?? null
  }

  return (
    <div className="map-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        style={{ width: canvasWidth, height }}
        role="img"
        aria-label="Schematic map of Chennai wards coloured by flood severity"
        onMouseMove={(e) => {
          const w = wardAt(e)
          const rect = canvasRef.current.getBoundingClientRect()
          setHover(w ? { ward: w, x: e.clientX - rect.left, y: e.clientY - rect.top } : null)
        }}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => { const w = wardAt(e); if (w) onSelect?.(w) }}
      />
      {hover && (
        <div className="map-tip" style={{ left: Math.min(hover.x + 14, canvasWidth - 190), top: hover.y + 14 }}>
          <strong>{hover.ward.name}</strong> <span className="muted">{hover.ward.code} · {hover.ward.zone}</span>
          <div>{hover.ward.activeReports} active · {hover.ward.confirmedReports} confirmed</div>
          <div>Worst: {SEVERITY[hover.ward.maxSeverity]?.label}</div>
        </div>
      )}
    </div>
  )
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrap(text, max) {
  const words = text.split(' ')
  const lines = []
  let line = ''
  words.forEach((word) => {
    if ((line + ' ' + word).trim().length > max && line) { lines.push(line); line = word }
    else line = (line + ' ' + word).trim()
  })
  if (line) lines.push(line)
  return lines.slice(0, 2)
}
