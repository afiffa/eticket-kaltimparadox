import { CalendarDays, CreditCard, Mail, MessageCircle, Plus, Trash2, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  GENDERS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  TICKET_CATEGORIES,
} from '../utils/ticket'

function Field({ label, error, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/70">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </span>
      {children}
      {error ? <span className="mt-1.5 block text-xs text-rose-200">{error}</span> : null}
    </label>
  )
}

const inputClass =
  'w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/50 focus:bg-white/15'

export default function TicketForm({
  values,
  errors,
  onChange,
  onParticipantChange,
  onAddParticipant,
  onRemoveParticipant,
  onSubmit,
  saving,
  isEditing,
}) {
  const [step, setStep] = useState(0)
  const steps = useMemo(() => [
    'Pembeli',
    'Peserta',
    'Tiket',
    'Final',
  ], [])

  const update = (event) => {
    const { name, value } = event.target
    onChange(name, value)
  }

  const updateParticipant = (index, event) => {
    const { name, value } = event.target
    onParticipantChange(index, name, value)
  }

  const isLastStep = step === steps.length - 1
  const goNext = () => setStep((current) => Math.min(current + 1, steps.length - 1))
  const goBack = () => setStep((current) => Math.max(current - 1, 0))

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[28px] border border-white/15 bg-white/[0.08] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6"
    >
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.28em] text-cyan-100/70">Ticket Order</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">KALTIM PARADOX</h1>
        <p className="mt-1 text-sm text-white/65">POLITICAL HUMOR - Form Pembelian Tiket</p>
      </div>

      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between text-xs text-white/60">
          <span>Step {step + 1} dari {steps.length}</span>
          <span>{steps[step]}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {steps.map((item, index) => (
            <button
              className="h-2 rounded-full transition"
              key={item}
              type="button"
              onClick={() => setStep(index)}
              style={{ backgroundColor: index <= step ? '#ffffff' : 'rgba(255,255,255,0.18)' }}
              aria-label={`Buka step ${item}`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {step === 0 ? (
          <>
        <Field label="No Invoice" icon={CreditCard}>
          <input className={`${inputClass} font-mono text-xs`} name="noInvoice" value={values.noInvoice} readOnly />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama Pembeli" error={errors.buyerName} icon={UserRound}>
            <input className={inputClass} name="buyerName" value={values.buyerName} onChange={update} placeholder="Nama lengkap" />
          </Field>
          <Field label="Email Pembeli" error={errors.buyerEmail} icon={Mail}>
            <input className={inputClass} type="email" name="buyerEmail" value={values.buyerEmail} onChange={update} placeholder="email@domain.com" />
          </Field>
        </div>

        <Field label="No WhatsApp Pembeli" error={errors.buyerWhatsapp} icon={MessageCircle}>
          <input className={inputClass} name="buyerWhatsapp" value={values.buyerWhatsapp} onChange={update} placeholder="08xxxxxxxxxx" />
        </Field>
          </>
        ) : null}

        {step === 1 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-white/70">Data Peserta</p>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
              type="button"
              onClick={onAddParticipant}
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Peserta
            </button>
          </div>

          {values.participants.map((participant, index) => {
            const participantErrors = errors.participants?.[index] || {}

            return (
              <div key={index} className="rounded-2xl border border-white/15 bg-white/[0.05] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">Peserta {index + 1}</p>
                  {values.participants.length > 1 ? (
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
                      type="button"
                      onClick={() => onRemoveParticipant(index)}
                      aria-label={`Hapus peserta ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nama Peserta" error={participantErrors.participantName} icon={UserRound}>
                      <input className={inputClass} name="participantName" value={participant.participantName} onChange={(event) => updateParticipant(index, event)} placeholder="Nama peserta" />
                    </Field>
                    <Field label="Email Peserta" error={participantErrors.participantEmail} icon={Mail}>
                      <input className={inputClass} type="email" name="participantEmail" value={participant.participantEmail} onChange={(event) => updateParticipant(index, event)} placeholder="peserta@domain.com" />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="No WhatsApp Peserta" icon={MessageCircle}>
                      <input className={inputClass} name="participantWhatsapp" value={participant.participantWhatsapp} onChange={(event) => updateParticipant(index, event)} placeholder="08xxxxxxxxxx" />
                    </Field>
                    <Field label="Tanggal Lahir Peserta" icon={CalendarDays}>
                      <input className={inputClass} type="date" name="participantBirthDate" value={participant.participantBirthDate} onChange={(event) => updateParticipant(index, event)} />
                    </Field>
                  </div>

                  <Field label="Jenis Kelamin">
                    <select className={inputClass} name="gender" value={participant.gender} onChange={(event) => updateParticipant(index, event)}>
                      <option value="">Pilih jenis kelamin</option>
                      {GENDERS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
            )
          })}
        </div>
        ) : null}

        {step === 2 ? (
          <>
        <Field label="Kategori Tiket" error={errors.ticketCategory}>
          <select className={inputClass} name="ticketCategory" value={values.ticketCategory} onChange={update}>
            <option value="">Pilih kategori</option>
            {TICKET_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jumlah Tiket" error={errors.ticketQuantity}>
            <input className={inputClass} name="ticketQuantity" value={values.participants.length} readOnly />
          </Field>
          <Field label="Metode Pembayaran">
            <select className={inputClass} name="paymentMethod" value={values.paymentMethod} onChange={update}>
              {PAYMENT_METHODS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Status Pembayaran" error={errors.paymentStatus}>
          <select className={inputClass} name="paymentStatus" value={values.paymentStatus} onChange={update}>
            {PAYMENT_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
          </>
        ) : null}

        {step === 3 ? (
        <Field label="Catatan Tambahan">
          <textarea className={`${inputClass} min-h-24 resize-y`} name="notes" value={values.notes} onChange={update} placeholder="Catatan opsional" />
        </Field>
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          className="rounded-2xl border border-white/20 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
          disabled={step === 0 || saving}
          onClick={goBack}
        >
          Kembali
        </button>
        {isLastStep ? (
          <button disabled={saving} className="rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-[#041827] shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60" type="submit">
            {saving ? 'Menyimpan...' : isEditing ? 'Update E-Ticket' : 'Generate E-Ticket'}
          </button>
        ) : (
          <button
            className="rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-[#041827] shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-50"
            type="button"
            onClick={goNext}
          >
            Lanjut
          </button>
        )}
      </div>
    </form>
  )
}
