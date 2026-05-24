# KALTIM PARADOX E-Ticket App

Web app responsive untuk form pembelian tiket event "KALTIM PARADOX - POLITICAL HUMOR". Data order disimpan sementara di `localStorage`, lalu e-ticket dapat diexport sebagai PDF atau JPEG.

## Instalasi

```bash
npm install
npm install html2canvas jspdf qrcode.react lucide-react
npm run dev
```

`npm run dev` menjalankan dua proses sekaligus:

- Web app Vite: `http://127.0.0.1:5173`
- API database SQLite: `http://127.0.0.1:5174`

Database dibuat otomatis di:

```text
data/tickets.sqlite
```

## Stack

- React + Vite
- Tailwind CSS
- html2canvas
- jsPDF
- qrcode.react
- lucide-react
- SQLite lokal via `node:sqlite`
- Neon/Postgres untuk deploy Vercel via `DATABASE_URL`

## Deploy Vercel

Untuk production, gunakan database Postgres/Neon karena SQLite lokal tidak permanen di Vercel.

1. Push project ke GitHub.
2. Import repository di Vercel.
3. Buat database Neon/Postgres dari Vercel Marketplace atau Neon dashboard.
4. Tambahkan environment variable production:

```text
DATABASE_URL=postgres://...
```

5. Deploy project.

QR Code pada e-ticket akan berisi link:

```text
https://domain-anda.com/#/verify?invoice=...&participant=...&token=...
```

Saat QR discan, halaman verifikasi akan mengecek invoice, peserta, dan token ke database.

## Domain

Saran domain:

- Root domain untuk landing/ticketing: `kaltimparadox.com`
- Subdomain khusus tiket: `ticket.kaltimparadox.com`
- Subdomain admin/data: tetap di path `ticket.kaltimparadox.com/#/orders`

Di Vercel, tambahkan domain dari Project Settings > Domains, lalu ikuti DNS record yang diberikan Vercel.

## Struktur

```text
src/
  App.jsx
  main.jsx
  index.css
  components/
    TicketForm.jsx
    ETicketPreview.jsx
    DownloadActions.jsx
  utils/
    ticket.js
    exportTicket.js
```
