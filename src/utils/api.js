export async function getLatestTicket() {
  const response = await fetch('/api/tickets/latest')
  if (!response.ok) throw new Error('Gagal mengambil data tiket terakhir.')

  const data = await response.json()
  return data.ticket
}

export async function getTickets() {
  const response = await fetch('/api/tickets')
  if (!response.ok) throw new Error('Gagal mengambil data pembeli.')

  const data = await response.json()
  return data.tickets
}

export async function saveTicket(ticket) {
  const response = await fetch('/api/tickets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ticket),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Gagal menyimpan tiket.')
  }

  const data = await response.json()
  return data.ticket
}

export async function updateTicket(id, updates) {
  const response = await fetch(`/api/tickets/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Gagal memperbarui tiket.')
  }

  const data = await response.json()
  return data.ticket
}

export async function deleteTicket(id) {
  const response = await fetch(`/api/tickets/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Gagal menghapus tiket.')
  }

  return true
}

export async function verifyTicket({ invoice, participant, token }) {
  const params = new URLSearchParams({
    invoice: invoice || '',
    participant: participant || '0',
    token: token || '',
  })
  const response = await fetch(`/api/verify?${params.toString()}`)

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Gagal verifikasi tiket.')
  }

  return response.json()
}
