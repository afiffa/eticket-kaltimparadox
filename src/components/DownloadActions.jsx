import { Download, FileImage, FileText, Plus } from 'lucide-react'

export default function DownloadActions({ onDownloadPdf, onDownloadJpeg, onNewTicket, loading }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <button
        onClick={onDownloadPdf}
        disabled={Boolean(loading)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#041827] transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
      >
        {loading === 'pdf' ? <Download className="h-4 w-4 animate-bounce" /> : <FileText className="h-4 w-4" />}
        PDF
      </button>
      <button
        onClick={onDownloadJpeg}
        disabled={Boolean(loading)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
      >
        {loading === 'jpeg' ? <Download className="h-4 w-4 animate-bounce" /> : <FileImage className="h-4 w-4" />}
        JPEG
      </button>
      <button
        onClick={onNewTicket}
        disabled={Boolean(loading)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-transparent px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
      >
        <Plus className="h-4 w-4" />
        Tiket Baru
      </button>
    </div>
  )
}
