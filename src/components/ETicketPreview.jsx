import { forwardRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { ASSETS, getQrPayload } from '../utils/ticket'

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {label}
      </p>
      <p className="mt-0.5 break-words text-[12px] font-medium leading-snug" style={{ color: '#ffffff' }}>
        {value || '-'}
      </p>
    </div>
  )
}

const ETicketPreview = forwardRef(function ETicketPreview({ ticket, sequenceLabel }, ref) {
  const isPaid = ticket.paymentStatus === 'Paid'

  return (
    <article
      ref={ref}
      data-ticket-card="true"
      className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[26px] border p-4"
      style={{
        background: 'linear-gradient(160deg,#04111d 0%,#063348 48%,#04111d 100%)',
        borderColor: 'rgba(255,255,255,0.2)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.35)',
        color: '#ffffff',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="text-[9px] uppercase tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
          13 Juni 2026
        </div>
        <img crossOrigin="anonymous" src={ASSETS.topSponsor} alt="Sponsor" className="max-h-8 max-w-[118px] object-contain" />
      </div>

      <div className="mt-2 flex flex-col items-center text-center">
        <img crossOrigin="anonymous" src={ASSETS.mainLogo} alt="Kaltim Paradox" className="max-h-24 w-full max-w-[220px] object-contain" />
        <h2 className="mt-2 text-[30px] font-semibold leading-none tracking-[0.08em]">E-TICKET</h2>
        <span
          className="mt-2 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.1em]"
          style={{
            backgroundColor: isPaid ? '#34d399' : '#fcd34d',
            color: isPaid ? '#022c22' : '#451a03',
          }}
        >
          {isPaid ? 'PAID' : 'PENDING PAYMENT'}
        </span>
        {sequenceLabel ? (
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {sequenceLabel}
          </p>
        ) : null}
      </div>

      <div
        className="mt-4 rounded-[20px] border p-3"
        style={{
          backgroundColor: 'rgba(255,255,255,0.07)',
          borderColor: 'rgba(255,255,255,0.15)',
        }}
      >
        <div className="grid grid-cols-[108px_minmax(0,1fr)] items-center gap-3">
          <div
            className="rounded-2xl p-2"
            style={{ backgroundColor: '#ffffff', boxShadow: '0 16px 28px rgba(0,0,0,0.25)' }}
          >
            <QRCodeCanvas value={getQrPayload(ticket)} size={92} bgColor="#ffffff" fgColor="#04111d" includeMargin />
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-2">
            <Detail label="No Invoice" value={ticket.noInvoice} />
            <Detail label="Kategori" value={ticket.ticketCategory} />
            <Detail label="Nama Peserta" value={ticket.participantName} />
            <Detail label="Email Peserta" value={ticket.participantEmail} />
          </div>
        </div>
      </div>

      <section
        className="mt-3 rounded-[20px] border p-3"
        style={{
          backgroundColor: 'rgba(0,0,0,0.1)',
          borderColor: 'rgba(255,255,255,0.15)',
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Detail label="Jumlah Tiket" value={ticket.ticketQuantity} />
          <Detail label="Tanggal Event" value="13 Juni 2026" />
        </div>
        <p className="mt-2 text-[12px] font-semibold leading-snug">KALTIM PARADOX - POLITICAL HUMOR</p>
        <p className="mt-1 text-[11px] leading-4" style={{ color: 'rgba(255,255,255,0.75)' }}>
          Samarinda Convention-Plenary Hall<br />
          Sempaja, Kota Samarinda
        </p>
      </section>

      <section
        className="mt-3 rounded-[20px] border p-3"
        style={{
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderColor: 'rgba(255,255,255,0.15)',
        }}
      >
        <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: 'rgba(207,250,254,0.6)' }}>
          Data Pembeli
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2">
          <Detail label="Nama Pembeli" value={ticket.buyerName} />
          <Detail label="Email Pembeli" value={ticket.buyerEmail} />
          <Detail label="No WhatsApp Pembeli" value={ticket.buyerWhatsapp} />
        </div>
      </section>

      <p
        className="mt-3 rounded-2xl border px-3 py-2 text-center text-[10px] leading-4"
        style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderColor: 'rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.65)',
        }}
      >
        Tiket ini wajib ditunjukkan saat masuk venue. QR Code akan diverifikasi oleh panitia.
      </p>

      <div className="mt-3 border-t pt-3 text-center" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <p className="text-[9px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Ticketing Partner
        </p>
        <img crossOrigin="anonymous" src={ASSETS.platformLogo} alt="Info Konser" className="mx-auto mt-1.5 max-h-10 max-w-[150px] object-contain" />
        <p className="mt-2 text-[8px] uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.38)' }}>
          Copyright BEE EPIC EVENT ORGANIZER
        </p>
      </div>
    </article>
  )
})

export default ETicketPreview
