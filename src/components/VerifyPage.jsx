import { ArrowLeft, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { verifyTicket } from '../utils/api'

export default function VerifyPage({ onBack }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const params = useMemo(() => {
    const query = window.location.hash.split('?')[1] || ''
    return new URLSearchParams(query)
  }, [])

  useEffect(() => {
    Promise.resolve()
      .then(() => verifyTicket({
        invoice: params.get('invoice'),
        participant: params.get('participant'),
        token: params.get('token'),
      }))
      .then(setResult)
      .catch((verifyError) => setError(verifyError.message))
      .finally(() => setLoading(false))
  }, [params])

  const isValid = result?.valid
  const ticket = result?.ticket

  return (
    <section className="mx-auto flex min-h-[80vh] w-full max-w-[430px] flex-col justify-center">
      <div className="rounded-[28px] border border-white/15 bg-white/[0.08] p-6 text-center shadow-2xl shadow-black/30 backdrop-blur-xl">
        {loading ? (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-white" />
            <h1 className="mt-4 text-2xl font-semibold text-white">Memeriksa Tiket</h1>
            <p className="mt-2 text-sm text-white/65">Mohon tunggu sebentar.</p>
          </>
        ) : null}

        {!loading && isValid ? (
          <>
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-300" />
            <h1 className="mt-4 text-3xl font-semibold text-white">Tiket Valid</h1>
            <p className="mt-2 text-sm text-white/65">QR Code terdaftar di database.</p>
            <div
              className="mt-5 rounded-2xl px-4 py-4 text-center text-2xl font-bold tracking-wide"
              style={{
                backgroundColor: ticket.paymentStatus === 'Paid' ? '#34d399' : '#fcd34d',
                color: ticket.paymentStatus === 'Paid' ? '#022c22' : '#451a03',
              }}
            >
              {ticket.paymentStatus === 'Paid' ? 'PAID' : 'PENDING PAYMENT'}
            </div>
            <div className="mt-5 space-y-3 rounded-2xl border border-white/15 bg-white/[0.06] p-4 text-left text-sm">
              <p><span className="text-white/45">Invoice:</span> <span className="font-semibold text-white">{ticket.noInvoice}</span></p>
              <p><span className="text-white/45">Peserta:</span> <span className="font-semibold text-white">{ticket.participantName}</span></p>
              <p><span className="text-white/45">Email:</span> <span className="font-semibold text-white">{ticket.participantEmail}</span></p>
              <p><span className="text-white/45">Kategori:</span> <span className="font-semibold text-white">{ticket.ticketCategory}</span></p>
            </div>
          </>
        ) : null}

        {!loading && !isValid ? (
          <>
            <XCircle className="mx-auto h-14 w-14 text-rose-300" />
            <h1 className="mt-4 text-3xl font-semibold text-white">Tiket Tidak Valid</h1>
            <p className="mt-2 text-sm text-white/65">{error || result?.message || 'QR Code tidak ditemukan atau token tidak cocok.'}</p>
          </>
        ) : null}

        <button
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
      </div>
    </section>
  )
}
