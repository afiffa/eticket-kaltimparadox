import { createServer } from 'node:http'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const dataDir = join(rootDir, 'data')
const dbPath = join(dataDir, 'tickets.sqlite')
const port = Number(process.env.API_PORT || 5174)

const assetMap = {
  mainLogo: 'https://ik.imagekit.io/re0bervk0/kaltim-main.png',
  topSponsor: 'https://ik.imagekit.io/re0bervk0/logologo.png',
  bottomSponsor: 'https://ik.imagekit.io/re0bervk0/logo-sp-nrys.png',
  platformLogo: 'https://ik.imagekit.io/re0bervk0/info%20konser.png',
}

mkdirSync(dataDir, { recursive: true })

const db = new DatabaseSync(dbPath)
db.exec(`
  CREATE TABLE IF NOT EXISTS ticket_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    no_invoice TEXT NOT NULL UNIQUE,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`)

function sendJson(response, status, data) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  })
  response.end(JSON.stringify(data))
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
      if (body.length > 1_000_000) {
        request.destroy()
        reject(new Error('Payload terlalu besar.'))
      }
    })
    request.on('end', () => resolve(body))
    request.on('error', reject)
  })
}

function mapRow(row) {
  if (!row) return null
  return {
    id: row.id,
    ...JSON.parse(row.payload),
    createdAt: row.created_at,
  }
}

function sanitizeTokenPart(value) {
  return String(value || 'ticket')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function getFallbackTicketToken(invoice, participantIndex, email) {
  return `legacy-${sanitizeTokenPart(invoice)}-${participantIndex}-${sanitizeTokenPart(email)}`
}

function verifyTicketFromRows(rows, invoice, participantIndex, token) {
  const row = rows.find((item) => item.no_invoice === invoice)
  if (!row) return { valid: false, message: 'Invoice tidak ditemukan.' }

  const order = mapRow(row)
  const participant = order.participants?.[participantIndex]
  if (!participant) return { valid: false, message: 'Peserta tidak ditemukan.' }
  const expectedToken = participant.ticketToken || getFallbackTicketToken(invoice, participantIndex, participant.participantEmail)
  if (expectedToken !== token) {
    return { valid: false, message: 'Token tiket tidak cocok.' }
  }

  return {
    valid: true,
    ticket: {
      noInvoice: order.noInvoice,
      participantName: participant.participantName,
      participantEmail: participant.participantEmail,
      ticketCategory: order.ticketCategory,
      paymentStatus: order.paymentStatus,
      participantNumber: participantIndex + 1,
    },
  }
}

async function proxyAsset(request, response, url) {
  const name = url.searchParams.get('name')
  const assetUrl = assetMap[name]

  if (!assetUrl) {
    sendJson(response, 404, { message: 'Asset tidak ditemukan.' })
    return
  }

  const assetResponse = await fetch(assetUrl)
  if (!assetResponse.ok) {
    sendJson(response, 502, { message: 'Gagal mengambil asset.' })
    return
  }

  const buffer = Buffer.from(await assetResponse.arrayBuffer())
  response.writeHead(200, {
    'Content-Type': assetResponse.headers.get('content-type') || 'image/png',
    'Cache-Control': 'public, max-age=86400',
    'Access-Control-Allow-Origin': '*',
  })
  response.end(buffer)
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`)

    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      })
      response.end()
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, { ok: true })
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/asset') {
      await proxyAsset(request, response, url)
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/tickets/latest') {
      const row = db
        .prepare('SELECT id, payload, created_at FROM ticket_orders ORDER BY id DESC LIMIT 1')
        .get()
      sendJson(response, 200, { ticket: mapRow(row) })
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/tickets') {
      const rows = db
        .prepare('SELECT id, payload, created_at FROM ticket_orders ORDER BY id DESC')
        .all()
      sendJson(response, 200, { tickets: rows.map(mapRow) })
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/verify') {
      const invoice = url.searchParams.get('invoice')
      const participantIndex = Number(url.searchParams.get('participant') || 0)
      const token = url.searchParams.get('token')
      const rows = db.prepare('SELECT id, no_invoice, payload, created_at FROM ticket_orders WHERE no_invoice = ?').all(invoice)
      sendJson(response, 200, verifyTicketFromRows(rows, invoice, participantIndex, token))
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/tickets') {
      const body = await readBody(request)
      const ticket = JSON.parse(body || '{}')
      const createdAt = ticket.createdAt || new Date().toISOString()

      db.prepare(
        'INSERT INTO ticket_orders (no_invoice, payload, created_at) VALUES (?, ?, ?)',
      ).run(ticket.noInvoice, JSON.stringify({ ...ticket, createdAt }), createdAt)

      const row = db
        .prepare('SELECT id, payload, created_at FROM ticket_orders WHERE no_invoice = ?')
        .get(ticket.noInvoice)
      sendJson(response, 201, { ticket: mapRow(row) })
      return
    }

    const ticketMatch = url.pathname.match(/^\/api\/tickets\/(\d+)$/)

    if (ticketMatch && request.method === 'PATCH') {
      const id = Number(ticketMatch[1])
      const body = await readBody(request)
      const updates = JSON.parse(body || '{}')
      const row = db
        .prepare('SELECT id, payload, created_at FROM ticket_orders WHERE id = ?')
        .get(id)

      if (!row) {
        sendJson(response, 404, { message: 'Data tiket tidak ditemukan.' })
        return
      }

      const current = mapRow(row)
      const next = {
        ...current,
        ...updates,
        id: current.id,
        createdAt: current.createdAt,
      }

      db.prepare('UPDATE ticket_orders SET payload = ? WHERE id = ?').run(JSON.stringify(next), id)
      const updatedRow = db
        .prepare('SELECT id, payload, created_at FROM ticket_orders WHERE id = ?')
        .get(id)
      sendJson(response, 200, { ticket: mapRow(updatedRow) })
      return
    }

    if (ticketMatch && request.method === 'DELETE') {
      const id = Number(ticketMatch[1])
      const result = db.prepare('DELETE FROM ticket_orders WHERE id = ?').run(id)

      if (!result.changes) {
        sendJson(response, 404, { message: 'Data tiket tidak ditemukan.' })
        return
      }

      sendJson(response, 200, { ok: true })
      return
    }

    sendJson(response, 404, { message: 'Route tidak ditemukan.' })
  } catch (error) {
    const message = error?.message || 'Terjadi kesalahan server.'
    sendJson(response, 500, { message })
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`API database ready at http://127.0.0.1:${port}`)
})
