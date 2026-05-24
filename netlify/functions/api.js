import { neon } from '@neondatabase/serverless'

const assetMap = {
  mainLogo: 'https://ik.imagekit.io/re0bervk0/kaltim-main.png',
  topSponsor: 'https://ik.imagekit.io/re0bervk0/logologo.png',
  platformLogo: 'https://ik.imagekit.io/re0bervk0/info%20konser.png',
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }
}

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL belum diset. Tambahkan environment variable di Netlify.')
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

async function proxyAsset(event) {
  const assetUrl = assetMap[event.queryStringParameters?.name]
  if (!assetUrl) return json(404, { message: 'Asset tidak ditemukan.' })

  const assetResponse = await fetch(assetUrl)
  if (!assetResponse.ok) return json(502, { message: 'Gagal mengambil asset.' })

  const buffer = Buffer.from(await assetResponse.arrayBuffer())
  return {
    statusCode: 200,
    isBase64Encoded: true,
    headers: {
      'Content-Type': assetResponse.headers.get('content-type') || 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
    body: buffer.toString('base64'),
  }
}

export async function handler(event) {
  try {
    const path = event.path.replace(/^\/api/, '') || '/'
    const method = event.httpMethod

    if (path === '/asset' && method === 'GET') {
      return proxyAsset(event)
    }

    if (path === '/health' && method === 'GET') {
      return json(200, { ok: true })
    }

    const sql = getSql()
    await ensureSchema(sql)

    if (path === '/tickets/latest' && method === 'GET') {
      const rows = await sql`SELECT id, payload, created_at FROM ticket_orders ORDER BY id DESC LIMIT 1`
      return json(200, { ticket: mapRow(rows[0]) })
    }

    if (path === '/tickets' && method === 'GET') {
      const rows = await sql`SELECT id, payload, created_at FROM ticket_orders ORDER BY id DESC`
      return json(200, { tickets: rows.map(mapRow) })
    }

    if (path === '/tickets' && method === 'POST') {
      const ticket = JSON.parse(event.body || '{}')
      const createdAt = ticket.createdAt || new Date().toISOString()
      const rows = await sql`
        INSERT INTO ticket_orders (no_invoice, payload, created_at)
        VALUES (${ticket.noInvoice}, ${JSON.stringify({ ...ticket, createdAt })}, ${createdAt})
        RETURNING id, payload, created_at
      `
      return json(201, { ticket: mapRow(rows[0]) })
    }

    if (path === '/verify' && method === 'GET') {
      const invoice = event.queryStringParameters?.invoice
      const participantIndex = Number(event.queryStringParameters?.participant || 0)
      const token = event.queryStringParameters?.token
      const rows = await sql`SELECT id, payload, created_at FROM ticket_orders WHERE no_invoice = ${invoice} LIMIT 1`
      return json(200, verifyOrder(mapRow(rows[0]), participantIndex, token))
    }

    const ticketMatch = path.match(/^\/tickets\/(\d+)$/)
    if (ticketMatch && method === 'PATCH') {
      const id = Number(ticketMatch[1])
      const rows = await sql`SELECT id, payload, created_at FROM ticket_orders WHERE id = ${id} LIMIT 1`
      const current = mapRow(rows[0])

      if (!current) return json(404, { message: 'Data tiket tidak ditemukan.' })

      const updates = JSON.parse(event.body || '{}')
      const next = { ...current, ...updates, id: current.id, createdAt: current.createdAt }
      const updated = await sql`
        UPDATE ticket_orders SET payload = ${JSON.stringify(next)} WHERE id = ${id}
        RETURNING id, payload, created_at
      `
      return json(200, { ticket: mapRow(updated[0]) })
    }

    if (ticketMatch && method === 'DELETE') {
      const id = Number(ticketMatch[1])
      await sql`DELETE FROM ticket_orders WHERE id = ${id}`
      return json(200, { ok: true })
    }

    return json(404, { message: 'Route tidak ditemukan.' })
  } catch (error) {
    return json(500, { message: error?.message || 'Terjadi kesalahan server.' })
  }
}
