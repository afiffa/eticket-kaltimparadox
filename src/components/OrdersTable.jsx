import { ArrowLeft, CheckCircle2, Edit3, Eye, FileSpreadsheet, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { deleteTicket, getTickets, updateTicket } from '../utils/api'
import { getParticipantTicket, normalizeTicket } from '../utils/ticket'
import { exportOrdersToExcel } from '../utils/exportExcel'
import ETicketPreview from './ETicketPreview'

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function StatusBadge({ status }) {
  const isPaid = status === 'Paid'

  return (
    <span
      className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: isPaid ? '#34d399' : '#fcd34d',
        color: isPaid ? '#022c22' : '#451a03',
      }}
    >
      {isPaid ? 'PAID' : 'PENDING'}
    </span>
  )
}

export default function OrdersTable({ onBack, onEdit, onNotify }) {
  const [orders, setOrders] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [previewOrder, setPreviewOrder] = useState(null)
  const [previewIndex, setPreviewIndex] = useState(0)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const tickets = await getTickets()
      setOrders(tickets.map(normalizeTicket))
    } catch (error) {
      onNotify(error.message)
    } finally {
      setLoading(false)
    }
  }, [onNotify])

  useEffect(() => {
    Promise.resolve().then(loadOrders)
  }, [loadOrders])

  const filteredOrders = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return orders

    return orders.filter((order) => {
      const participants = order.participants.map((participant) => (
        `${participant.participantName} ${participant.participantEmail}`
      )).join(' ')
      const haystack = `${order.noInvoice} ${order.buyerName} ${order.buyerEmail} ${order.buyerWhatsapp} ${order.ticketCategory} ${order.paymentStatus} ${participants}`.toLowerCase()

      return haystack.includes(keyword)
    })
  }, [orders, query])

  const toggleStatus = async (order) => {
    setBusyId(order.id)
    try {
      const paymentStatus = order.paymentStatus === 'Paid' ? 'Pending' : 'Paid'
      const updated = normalizeTicket(await updateTicket(order.id, { paymentStatus }))
      setOrders((current) => current.map((item) => (item.id === order.id ? updated : item)))
      onNotify(`Status ${order.noInvoice} diubah ke ${paymentStatus}.`)
    } catch (error) {
      onNotify(error.message)
    } finally {
      setBusyId(null)
    }
  }

  const removeOrder = async (order) => {
    const confirmed = window.confirm(`Hapus order ${order.noInvoice}?`)
    if (!confirmed) return

    setBusyId(order.id)
    try {
      await deleteTicket(order.id)
      setOrders((current) => current.filter((item) => item.id !== order.id))
      onNotify(`Order ${order.noInvoice} dihapus.`)
    } catch (error) {
      onNotify(error.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-cyan-100/70">Database</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Data Pembeli</h1>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Form Tiket
        </button>
      </div>

      <div className="rounded-[28px] border border-white/15 bg-white/[0.08] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input
              className="w-full rounded-2xl border border-white/15 bg-white/10 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/50"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari invoice, pembeli, email, peserta..."
            />
          </label>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            type="button"
            onClick={loadOrders}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#041827] transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={!filteredOrders.length}
            onClick={() => {
              exportOrdersToExcel(filteredOrders)
              onNotify('Data pembeli berhasil diexport ke Excel.')
            }}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-[980px] w-full border-collapse text-left text-sm">
            <thead className="bg-white/10 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Pembeli</th>
                <th className="px-4 py-3 font-medium">Kontak</th>
                <th className="px-4 py-3 font-medium">Peserta</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-white/60" colSpan="8">Memuat data...</td>
                </tr>
              ) : null}
              {!loading && !filteredOrders.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-white/60" colSpan="8">Belum ada data pembeli.</td>
                </tr>
              ) : null}
              {!loading ? filteredOrders.map((order) => (
                <tr className="align-top text-white/85" key={order.id}>
                  <td className="px-4 py-4 font-mono text-xs text-white">{order.noInvoice}</td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-white">{order.buyerName}</p>
                    <p className="mt-1 text-xs text-white/55">{order.buyerEmail}</p>
                  </td>
                  <td className="px-4 py-4 text-white/70">{order.buyerWhatsapp}</td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-white">{order.participants.length} peserta</p>
                    <p className="mt-1 max-w-[220px] text-xs leading-5 text-white/55">
                      {order.participants.map((participant) => participant.participantName).join(', ')}
                    </p>
                  </td>
                  <td className="px-4 py-4 font-semibold text-white">{order.ticketCategory}</td>
                  <td className="px-4 py-4"><StatusBadge status={order.paymentStatus} /></td>
                  <td className="px-4 py-4 text-xs text-white/60">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
                        type="button"
                        title="Lihat preview"
                        onClick={() => {
                          setPreviewOrder(order)
                          setPreviewIndex(0)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
                        type="button"
                        title="Edit order"
                        onClick={() => onEdit(order)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15 disabled:opacity-50"
                        type="button"
                        title="Ubah status pembayaran"
                        disabled={busyId === order.id}
                        onClick={() => toggleStatus(order)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200/30 bg-rose-500/15 text-rose-100 transition hover:bg-rose-500/25 disabled:opacity-50"
                        type="button"
                        title="Hapus order"
                        disabled={busyId === order.id}
                        onClick={() => removeOrder(order)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : null}
            </tbody>
          </table>
        </div>
      </div>

      {previewOrder ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-[460px]">
            <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/15 bg-[#09293a] px-4 py-3 text-white shadow-2xl">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Preview E-Ticket</p>
                <p className="mt-1 text-sm font-semibold">{previewOrder.noInvoice}</p>
              </div>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 transition hover:bg-white/15"
                type="button"
                onClick={() => setPreviewOrder(null)}
                aria-label="Tutup preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ETicketPreview
              ticket={getParticipantTicket(previewOrder, previewIndex)}
              sequenceLabel={`Peserta ${previewIndex + 1} dari ${previewOrder.participants.length}`}
            />

            {previewOrder.participants.length > 1 ? (
              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-white/15 bg-[#09293a] p-3 text-sm text-white">
                <button
                  className="rounded-xl border border-white/20 px-3 py-2 font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  type="button"
                  disabled={previewIndex === 0}
                  onClick={() => setPreviewIndex((index) => Math.max(index - 1, 0))}
                >
                  Sebelumnya
                </button>
                <span className="text-xs text-white/70">{previewIndex + 1}/{previewOrder.participants.length}</span>
                <button
                  className="rounded-xl border border-white/20 px-3 py-2 font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  type="button"
                  disabled={previewIndex === previewOrder.participants.length - 1}
                  onClick={() => setPreviewIndex((index) => Math.min(index + 1, previewOrder.participants.length - 1))}
                >
                  Berikutnya
                </button>
              </div>
            ) : null}

            <button
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#041827] transition hover:bg-cyan-50"
              type="button"
              onClick={() => {
                setPreviewOrder(null)
                onEdit(previewOrder)
              }}
            >
              <Edit3 className="h-4 w-4" />
              Edit E-Ticket
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
