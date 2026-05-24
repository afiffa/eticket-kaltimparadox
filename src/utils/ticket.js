export const ASSETS = {
  mainLogo: '/api/asset?name=mainLogo',
  topSponsor: '/api/asset?name=topSponsor',
  platformLogo: '/api/asset?name=platformLogo',
}

export const TICKET_CATEGORIES = ['CAT 1', 'CAT 2', 'CAT 3', 'VIP']
export const PAYMENT_METHODS = ['Transfer Bank', 'QRIS', 'E-Wallet']
export const PAYMENT_STATUSES = ['Pending', 'Paid']
export const GENDERS = ['Laki-laki', 'Perempuan']

export const DEFAULT_PARTICIPANT = {
  participantName: 'Muhammad Arjuna',
  participantEmail: 'peserta@example.com',
  participantWhatsapp: '08123456788',
  participantBirthDate: '',
  gender: '',
}

export const DEFAULT_FORM = {
  noInvoice: '',
  buyerName: 'Afif Arjuna',
  buyerEmail: 'af.creative99@gmail.com',
  buyerWhatsapp: '08123456789',
  participants: [DEFAULT_PARTICIPANT],
  ticketCategory: 'VIP',
  ticketQuantity: 1,
  paymentMethod: 'Transfer Bank',
  paymentStatus: 'Paid',
  notes: '',
}

export function generateInvoice() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')

  return `INV-KPH-${yyyy}${mm}${dd}-${random}`
}

export function createInitialForm() {
  return {
    ...DEFAULT_FORM,
    noInvoice: generateInvoice(),
  }
}

export function createBlankParticipant(index) {
  return {
    participantName: index === 0 ? DEFAULT_PARTICIPANT.participantName : '',
    participantEmail: index === 0 ? DEFAULT_PARTICIPANT.participantEmail : '',
    participantWhatsapp: index === 0 ? DEFAULT_PARTICIPANT.participantWhatsapp : '',
    participantBirthDate: '',
    gender: '',
  }
}

export function generateTicketToken() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function getFallbackTicketToken(invoice, participantIndex, email) {
  return `legacy-${sanitizeFilename(invoice)}-${participantIndex}-${sanitizeFilename(email)}`
}

export function ensureParticipantTokens(participants, invoice = '', useFallback = false) {
  return participants.map((participant, index) => ({
    ...participant,
    ticketToken: participant.ticketToken || (
      useFallback ? getFallbackTicketToken(invoice, index, participant.participantEmail) : generateTicketToken()
    ),
  }))
}

export function sanitizeFilename(value) {
  return String(value || 'ticket')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

export function normalizeTicket(ticket) {
  if (!ticket) return null
  if (Array.isArray(ticket.participants) && ticket.participants.length) {
    return {
      ...ticket,
      participants: ensureParticipantTokens(ticket.participants, ticket.noInvoice, true),
      ticketQuantity: ticket.participants.length,
    }
  }

  return {
    ...ticket,
    ticketQuantity: Number(ticket.ticketQuantity) || 1,
    participants: [
      {
        participantName: ticket.participantName || '',
        participantEmail: ticket.participantEmail || '',
        participantWhatsapp: ticket.participantWhatsapp || '',
        participantBirthDate: ticket.participantBirthDate || '',
        gender: ticket.gender || '',
        ticketToken: ticket.ticketToken || generateTicketToken(),
      },
    ],
  }
}

export function getParticipantTicket(order, participantIndex = 0) {
  const normalized = normalizeTicket(order)
  const participant = normalized.participants[participantIndex] || normalized.participants[0]

  return {
    ...normalized,
    ...participant,
    participantIndex,
    ticketQuantity: normalized.participants.length,
  }
}

export function getQrPayload(ticket) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const params = new URLSearchParams({
    invoice: ticket.noInvoice,
    participant: String(Number(ticket.participantIndex ?? 0)),
    token: ticket.ticketToken || '',
  })

  return `${origin}/#/verify?${params.toString()}`
}

export function validateTicketForm(values) {
  const errors = {}
  const participants = values.participants || []
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!values.buyerName.trim()) errors.buyerName = 'Nama pembeli wajib diisi.'
  if (!values.buyerEmail.trim()) {
    errors.buyerEmail = 'Email pembeli wajib diisi.'
  } else if (!emailRegex.test(values.buyerEmail)) {
    errors.buyerEmail = 'Format email pembeli tidak valid.'
  }
  if (!values.buyerWhatsapp.trim()) errors.buyerWhatsapp = 'No WhatsApp pembeli wajib diisi.'
  errors.participants = participants.map((participant) => {
    const participantErrors = {}
    if (!participant.participantName.trim()) participantErrors.participantName = 'Nama peserta wajib diisi.'
    if (!participant.participantEmail.trim()) {
      participantErrors.participantEmail = 'Email peserta wajib diisi.'
    } else if (!emailRegex.test(participant.participantEmail)) {
      participantErrors.participantEmail = 'Format email peserta tidak valid.'
    }
    return participantErrors
  })
  if (!errors.participants.some((participant) => Object.keys(participant).length)) {
    delete errors.participants
  }
  if (!values.ticketCategory) errors.ticketCategory = 'Kategori tiket wajib dipilih.'
  if (!participants.length || Number(values.ticketQuantity) < 1) {
    errors.ticketQuantity = 'Jumlah tiket minimal 1.'
  }
  if (!values.paymentStatus) errors.paymentStatus = 'Status pembayaran wajib dipilih.'

  return errors
}
