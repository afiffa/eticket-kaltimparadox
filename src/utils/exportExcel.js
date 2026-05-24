import { sanitizeFilename } from './ticket'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('id-ID')
}

export function exportOrdersToExcel(orders) {
  const rows = orders.flatMap((order) => (
    order.participants.map((participant, index) => ({
      invoice: order.noInvoice,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      buyerWhatsapp: order.buyerWhatsapp,
      participantNumber: index + 1,
      participantName: participant.participantName,
      participantEmail: participant.participantEmail,
      participantWhatsapp: participant.participantWhatsapp,
      participantBirthDate: participant.participantBirthDate || '',
      gender: participant.gender || '',
      ticketCategory: order.ticketCategory,
      ticketQuantity: order.participants.length,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      notes: order.notes || '',
      createdAt: formatDate(order.createdAt),
    }))
  ))
  const escapeCell = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  const headers = [
    'Invoice',
    'Nama Pembeli',
    'Email Pembeli',
    'WhatsApp Pembeli',
    'No Peserta',
    'Nama Peserta',
    'Email Peserta',
    'WhatsApp Peserta',
    'Tanggal Lahir',
    'Jenis Kelamin',
    'Kategori Tiket',
    'Jumlah Tiket',
    'Metode Pembayaran',
    'Status Pembayaran',
    'Catatan',
    'Tanggal Order',
  ]
  const keys = [
    'invoice',
    'buyerName',
    'buyerEmail',
    'buyerWhatsapp',
    'participantNumber',
    'participantName',
    'participantEmail',
    'participantWhatsapp',
    'participantBirthDate',
    'gender',
    'ticketCategory',
    'ticketQuantity',
    'paymentMethod',
    'paymentStatus',
    'notes',
    'createdAt',
  ]
  const tableRows = rows.map((row) => (
    `<tr>${keys.map((key) => `<td>${escapeCell(row[key])}</td>`).join('')}</tr>`
  )).join('')
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
      th, td { border: 1px solid #999; padding: 6px 8px; mso-number-format: "\\@"; }
      th { background: #063348; color: #fff; font-weight: 700; }
    </style>
  </head>
  <body>
    <table>
      <thead><tr>${headers.map((header) => `<th>${escapeCell(header)}</th>`).join('')}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </body>
</html>`
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = `${sanitizeFilename(`data-pembeli-kaltim-paradox-${date}`)}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
