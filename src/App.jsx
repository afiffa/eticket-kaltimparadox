import { useEffect, useRef, useState } from 'react'
import DownloadActions from './components/DownloadActions'
import ETicketPreview from './components/ETicketPreview'
import OrdersTable from './components/OrdersTable'
import TicketForm from './components/TicketForm'
import LoginPage from './components/LoginPage'
import {
  createBlankParticipant,
  createInitialForm,
  ensureParticipantTokens,
  getParticipantTicket,
  normalizeTicket,
  validateTicketForm,
} from './utils/ticket'
import { downloadTicketsJpeg, downloadTicketsPdf } from './utils/exportTicket'
import { getLatestTicket, saveTicket, updateTicket } from './utils/api'
import VerifyPage from './components/VerifyPage'

function App() {
  const exportRefs = useRef([])
  const [form, setForm] = useState(() => createInitialForm())
  const [errors, setErrors] = useState({})
  const [latestTicket, setLatestTicket] = useState(null)
  const [toast, setToast] = useState('')
  const [exporting, setExporting] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTicketIndex, setActiveTicketIndex] = useState(0)
  const [page, setPage] = useState(() => {
    if (window.location.hash.startsWith('#/verify')) return 'verify'
    return window.location.hash === '#/orders' ? 'orders' : 'form'
  })
  const [editingOrderId, setEditingOrderId] = useState(null)
  const [session, setSession] = useState(() => {
    const stored = localStorage.getItem('ticketAuthSession')
    return stored ? JSON.parse(stored) : null
  })
  const isAdmin = session?.role === 'admin'

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash.startsWith('#/verify')) {
        setPage('verify')
        return
      }
      setPage(window.location.hash === '#/orders' ? 'orders' : 'form')
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    getLatestTicket()
      .then((ticket) => {
        if (ticket) setLatestTicket(normalizeTicket(ticket))
      })
      .catch(() => {
        setToast('Database belum tersambung. Jalankan npm run dev.')
      })
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    exportRefs.current = []
  }, [latestTicket?.noInvoice])

  const updateForm = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const updateParticipant = (index, name, value) => {
    setForm((current) => {
      const participants = current.participants.map((participant, participantIndex) => (
        participantIndex === index ? { ...participant, [name]: value } : participant
      ))

      return {
        ...current,
        participants,
        ticketQuantity: participants.length,
      }
    })
    setErrors((current) => {
      const nextParticipants = [...(current.participants || [])]
      nextParticipants[index] = {
        ...(nextParticipants[index] || {}),
        [name]: undefined,
      }
      return { ...current, participants: nextParticipants }
    })
  }

  const addParticipant = () => {
    setForm((current) => {
      const participants = [
        ...current.participants,
        createBlankParticipant(current.participants.length),
      ]

      return {
        ...current,
        participants,
        ticketQuantity: participants.length,
      }
    })
  }

  const removeParticipant = (index) => {
    setForm((current) => {
      const participants = current.participants.filter((_, participantIndex) => participantIndex !== index)

      return {
        ...current,
        participants,
        ticketQuantity: participants.length,
      }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const payload = {
      ...form,
      participants: ensureParticipantTokens(form.participants, form.noInvoice),
      ticketQuantity: form.participants.length,
    }
    const nextErrors = validateTicketForm(payload)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setToast('Lengkapi data wajib terlebih dahulu.')
      return
    }

    const ticket = {
      ...payload,
      createdAt: new Date().toISOString(),
    }
    setSaving(true)
    try {
      const savedTicket = editingOrderId
        ? await updateTicket(editingOrderId, ticket)
        : await saveTicket(ticket)
      setLatestTicket(normalizeTicket(savedTicket))
      setActiveTicketIndex(0)
      setEditingOrderId(null)
      setToast(editingOrderId ? 'E-ticket berhasil diperbarui.' : 'E-ticket berhasil dibuat dan tersimpan ke database.')
    } catch (error) {
      setToast(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async (type) => {
    if (!latestTicket) return
    const elements = exportRefs.current.slice(0, latestTicket.participants.length).filter(Boolean)
    if (!elements.length) return

    setExporting(type)
    try {
      if (type === 'pdf') {
        await downloadTicketsPdf(elements, latestTicket)
      } else {
        await downloadTicketsJpeg(elements, latestTicket)
      }
      setToast(`Download ${type.toUpperCase()} berhasil.`)
    } catch (error) {
      setToast('Download gagal. Coba refresh halaman lalu ulangi export.')
      console.error(error)
    } finally {
      setExporting('')
    }
  }

  const handleNewTicket = () => {
    setForm(createInitialForm())
    setErrors({})
    setLatestTicket(null)
    setEditingOrderId(null)
    setActiveTicketIndex(0)
    setToast('Form tiket baru siap diisi.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openOrdersPage = () => {
    if (!isAdmin) {
      setToast('Akses Data Pembeli hanya untuk Admin.')
      return
    }
    window.location.hash = '#/orders'
    setPage('orders')
  }

  const openFormPage = () => {
    window.location.hash = '#/'
    setPage('form')
  }

  const editOrder = (order) => {
    const normalized = normalizeTicket(order)
    setForm({
      noInvoice: normalized.noInvoice,
      buyerName: normalized.buyerName,
      buyerEmail: normalized.buyerEmail,
      buyerWhatsapp: normalized.buyerWhatsapp,
      participants: normalized.participants,
      ticketCategory: normalized.ticketCategory,
      ticketQuantity: normalized.participants.length,
      paymentMethod: normalized.paymentMethod,
      paymentStatus: normalized.paymentStatus,
      notes: normalized.notes || '',
    })
    setLatestTicket(normalized)
    setEditingOrderId(normalized.id)
    setActiveTicketIndex(0)
    setPage('form')
    window.location.hash = '#/'
    setToast(`Mode edit ${order.noInvoice}.`)
  }

  const participantCount = latestTicket?.participants?.length || 0
  const activeTicket = latestTicket ? getParticipantTicket(latestTicket, activeTicketIndex) : null

  const handleLogin = (account) => {
    localStorage.setItem('ticketAuthSession', JSON.stringify(account))
    setSession(account)
    setToast(`Login sebagai ${account.label}.`)
    if (account.role !== 'admin' && window.location.hash === '#/orders') {
      window.location.hash = '#/'
      setPage('form')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('ticketAuthSession')
    setSession(null)
    setLatestTicket(null)
    setEditingOrderId(null)
    window.location.hash = '#/'
    setPage('form')
  }

  if (!session && page !== 'verify') {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <main className="min-h-screen bg-[#04111d] bg-[radial-gradient(circle_at_top_left,rgba(24,160,178,0.28),transparent_34%),linear-gradient(145deg,#04111d_0%,#063348_48%,#04111d_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-[430px] -translate-x-1/2 rounded-2xl border border-white/15 bg-[#09293a]/95 px-4 py-3 text-center text-sm text-white shadow-2xl shadow-black/35 backdrop-blur">
          {toast}
        </div>
      ) : null}

      <div className="mx-auto mb-4 flex w-full max-w-6xl items-center justify-between rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white">
        <span>{session ? `${session.label}: ${session.username}` : 'QR Verification'}</span>
        {session ? (
          <button
            className="rounded-xl border border-white/20 px-3 py-2 font-semibold transition hover:bg-white/10"
            type="button"
            onClick={handleLogout}
          >
            Logout
          </button>
        ) : null}
      </div>

      {page === 'verify' ? (
        <VerifyPage onBack={openFormPage} />
      ) : page === 'orders' && isAdmin ? (
        <OrdersTable onBack={openFormPage} onEdit={editOrder} onNotify={setToast} />
      ) : (
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,430px)_minmax(0,430px)] lg:items-start lg:justify-center">
        <section className="mx-auto w-full max-w-[430px]">
          <div className="mb-4 flex justify-end">
            {editingOrderId ? (
              <span className="mr-auto rounded-2xl border border-amber-300/30 bg-amber-300/15 px-4 py-2.5 text-sm font-semibold text-amber-100">
                Mode Edit
              </span>
            ) : null}
            {isAdmin ? (
            <button
              className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              type="button"
              onClick={openOrdersPage}
            >
              Data Pembeli
            </button>
            ) : null}
          </div>
          <TicketForm
            values={form}
            errors={errors}
            onChange={updateForm}
            onParticipantChange={updateParticipant}
            onAddParticipant={addParticipant}
            onRemoveParticipant={removeParticipant}
            onSubmit={handleSubmit}
            saving={saving}
            isEditing={Boolean(editingOrderId)}
          />
        </section>

        <section className="mx-auto w-full max-w-[430px] space-y-4">
          {activeTicket ? (
            <>
              <ETicketPreview
                ticket={activeTicket}
                sequenceLabel={`Peserta ${activeTicketIndex + 1} dari ${participantCount}`}
              />
              {participantCount > 1 ? (
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.06] p-3 text-sm text-white">
                  <button
                    className="rounded-xl border border-white/20 px-3 py-2 font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    type="button"
                    disabled={activeTicketIndex === 0}
                    onClick={() => setActiveTicketIndex((index) => Math.max(index - 1, 0))}
                  >
                    Sebelumnya
                  </button>
                  <span className="text-xs text-white/70">{activeTicketIndex + 1}/{participantCount}</span>
                  <button
                    className="rounded-xl border border-white/20 px-3 py-2 font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    type="button"
                    disabled={activeTicketIndex === participantCount - 1}
                    onClick={() => setActiveTicketIndex((index) => Math.min(index + 1, participantCount - 1))}
                  >
                    Berikutnya
                  </button>
                </div>
              ) : null}
              <DownloadActions
                loading={exporting}
                onDownloadPdf={() => handleDownload('pdf')}
                onDownloadJpeg={() => handleDownload('jpeg')}
                onNewTicket={handleNewTicket}
              />
            </>
          ) : (
            <div className="rounded-[28px] border border-dashed border-white/20 bg-white/[0.06] p-6 text-center text-sm leading-6 text-white/65 backdrop-blur-xl">
              Preview e-ticket akan muncul di sini setelah form disubmit.
            </div>
          )}
        </section>
      </div>
      )}

      {latestTicket && page === 'form' ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 h-0 w-[430px] overflow-hidden"
          style={{ zIndex: -1 }}
        >
          {latestTicket.participants.map((_, index) => (
            <div className="mb-6" key={`${latestTicket.noInvoice}-${index}`}>
              <ETicketPreview
                ref={(node) => {
                  exportRefs.current[index] = node
                }}
                ticket={getParticipantTicket(latestTicket, index)}
                sequenceLabel={`Peserta ${index + 1} dari ${participantCount}`}
              />
            </div>
          ))}
        </div>
      ) : null}
    </main>
  )
}

export default App
