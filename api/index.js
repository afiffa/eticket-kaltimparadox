import { neon } from '@neondatabase/serverless'

const assetMap = {
  mainLogo: 'https://ik.imagekit.io/re0bervk0/kaltim-main.png',
  topSponsor: 'https://ik.imagekit.io/re0bervk0/logologo.png',
  platformLogo: 'https://ik.imagekit.io/re0bervk0/info%20konser.png',
}

function send(response, status, data) {
  response.status(status).json(data)
}

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL belum diset. Hubungkan project ke Neon/Postgres di Vercel.')
  }
  return neon(process.env.DATABASE_URL)
}

async function ensureSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS ticket_orders (
      id SERIAL PRIMARY KEY,
      no_invoice TEXT NOT NULL UNIQUE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `
}

function mapRow(row) {
  if (!row) return null
  return {
    id: row.id,
    ...row.payload,
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

function verifyOrder(order, participantIndex, token) {
  const participant = order?.participants?.[participantIndex]
  if (!order) return { valid: false, message: 'Invoice tidak ditemukan.' }
  if (!participant) return { valid: false, message: 'Peserta tidak ditemukan.' }
  const expectedToken = participant.ticketToken || getFallbackTicketToken(order.noInvoice, participantIndex, participant.participantEmail)
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

async function proxyAsset(request, response) {
  const name = request.query.name
  const assetUrl = assetMap[name]
  if (!assetUrl) {
    send(response, 404, { message: 'Asset tidak ditemukan.' })
    return
  }

  const assetResponse = await fetch(assetUrl)
  if (!assetResponse.ok) {
    send(response, 502, { message: 'Gagal mengambil asset.' })
    return
  }

  const buffer = Buffer.from(await assetResponse.arrayBuffer())
  response.setHeader('Content-Type', assetResponse.headers.get('content-type') || 'image/png')
  response.setHeader('Cache-Control', 'public, max-age=86400')
  response.status(200).send(buffer)
}

export default async function handler(request, response) {
  try {
    const path = request.url.split('?')[0].replace(/^\/api/, '') || '/'

    if (path === '/asset' && request.method === 'GET') {
      await proxyAsset(request, response)
      return
    }

    if (path === '/health' && request.method === 'GET') {
      send(response, 200, { ok: true })
      return
    }

    const sql = getSql()
    await ensureSchema(sql)

    if (path === '/tickets/latest' && request.method === 'GET') {
      const rows = await sql`SELECT id, payload, created_at FROM ticket_orders ORDER BY id DESC LIMIT 1`
      send(response, 200, { ticket: mapRow(rows[0]) })
      return
    }

    if (path === '/tickets' && request.method === 'GET') {
      const rows = await sql`SELECT id, payload, created_at FROM ticket_orders ORDER BY id DESC`
      send(response, 200, { tickets: rows.map(mapRow) })
      return
    }

    if (path === '/tickets' && request.method === 'POST') {
      const ticket = request.body || {}
      const createdAt = ticket.createdAt || new Date().toISOString()
      const rows = await sql`
        INSERT INTO ticket_orders (no_invoice, payload, created_at)
        VALUES (${ticket.noInvoice}, ${JSON.stringify({ ...ticket, createdAt })}, ${createdAt})
        RETURNING id, payload, created_at
      `
      send(response, 201, { ticket: mapRow(rows[0]) })
      return
    }

    if (path === '/verify' && request.method === 'GET') {
      const invoice = request.query.invoice
      const participantIndex = Number(request.query.participant || 0)
      const token = request.query.token
      const rows = await sql`SELECT id, payload, created_at FROM ticket_orders WHERE no_invoice = ${invoice} LIMIT 1`
      send(response, 200, verifyOrder(mapRow(rows[0]), participantIndex, token))
      return
    }

    const ticketMatch = path.match(/^\/tickets\/(\d+)$/)
    if (ticketMatch && request.method === 'PATCH') {
      const id = Number(ticketMatch[1])
      const rows = await sql`SELECT id, payload, created_at FROM ticket_orders WHERE id = ${id} LIMIT 1`
      const current = mapRow(rows[0])
      if (!current) {
        send(response, 404, { message: 'Data tiket tidak ditemukan.' })
        return
      }

      const next = { ...current, ...(request.body || {}), id: current.id, createdAt: current.createdAt }
      const updated = await sql`
        UPDATE ticket_orders SET payload = ${JSON.stringify(next)} WHERE id = ${id}
        RETURNING id, payload, created_at
      `
      send(response, 200, { ticket: mapRow(updated[0]) })
      return
    }

    if (ticketMatch && request.method === 'DELETE') {
      const id = Number(ticketMatch[1])
      await sql`DELETE FROM ticket_orders WHERE id = ${id}`
      send(response, 200, { ok: true })
      return
    }

    send(response, 404, { message: 'Route tidak ditemukan.' })
  } catch (error) {
    send(response, 500, { message: error?.message || 'Terjadi kesalahan server.' })
  }
}
