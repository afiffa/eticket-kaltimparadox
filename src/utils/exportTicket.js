import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { getParticipantTicket, sanitizeFilename } from './ticket'

function buildFilename(ticket, extension) {
  const invoice = sanitizeFilename(ticket.noInvoice)
  const name = sanitizeFilename(ticket.participantName)
  return `eticket-${invoice}-${name}.${extension}`
}

function buildOrderFilename(ticket, extension) {
  const invoice = sanitizeFilename(ticket.noInvoice)
  return `eticket-${invoice}-all-participants.${extension}`
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

async function renderTicket(element) {
  const host = document.createElement('div')
  const clone = element.cloneNode(true)

  host.style.position = 'fixed'
  host.style.left = '0'
  host.style.top = '0'
  host.style.width = '430px'
  host.style.height = 'auto'
  host.style.overflow = 'visible'
  host.style.pointerEvents = 'none'
  host.style.zIndex = '-1'
  host.style.background = 'transparent'
  host.style.opacity = '1'
  host.style.transform = 'none'

  clone.style.width = '430px'
  clone.style.maxWidth = '430px'
  clone.style.height = 'auto'
  clone.style.minHeight = '0'
  clone.style.display = 'block'
  clone.style.transform = 'none'

  const sourceCanvases = element.querySelectorAll('canvas')
  const clonedCanvases = clone.querySelectorAll('canvas')
  sourceCanvases.forEach((sourceCanvas, index) => {
    const clonedCanvas = clonedCanvases[index]
    if (!clonedCanvas) return

    clonedCanvas.width = sourceCanvas.width
    clonedCanvas.height = sourceCanvas.height
    clonedCanvas.getContext('2d')?.drawImage(sourceCanvas, 0, 0)
  })

  host.appendChild(clone)
  document.body.appendChild(host)

  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })

  try {
    const rect = clone.getBoundingClientRect()
    const width = Math.ceil(rect.width)
    const height = Math.ceil(rect.height)

    return await html2canvas(clone, {
      backgroundColor: '#04111d',
      scale: Math.min(window.devicePixelRatio || 2, 3),
      useCORS: true,
      allowTaint: false,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
    })
  } finally {
    host.remove()
  }
}

export async function downloadTicketJpeg(element, ticket) {
  const canvas = await renderTicket(element)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.96)
  downloadDataUrl(dataUrl, buildFilename(ticket, 'jpg'))
}

export async function downloadTicketsJpeg(elements, order) {
  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index]
    if (!element) continue

    const participantTicket = getParticipantTicket(order, index)
    const canvas = await renderTicket(element)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.96)
    downloadDataUrl(dataUrl, buildFilename(participantTicket, 'jpg'))

    // Mobile browsers need a tiny pause between multiple download triggers.
    await new Promise((resolve) => {
      window.setTimeout(resolve, 250)
    })
  }
}

export async function downloadTicketPdf(element, ticket) {
  const canvas = await renderTicket(element)
  const imageData = canvas.toDataURL('image/jpeg', 0.98)
  const pdfWidth = 430
  const pdfHeight = Math.ceil((canvas.height * pdfWidth) / canvas.width) + 8
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [pdfWidth, pdfHeight],
    hotfixes: ['px_scaling'],
  })

  pdf.addImage(imageData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
  pdf.save(buildFilename(ticket, 'pdf'))
}

export async function downloadTicketsPdf(elements, order) {
  const pdfWidth = 430
  let pdf = null

  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index]
    if (!element) continue

    const canvas = await renderTicket(element)
    const imageData = canvas.toDataURL('image/jpeg', 0.98)
    const pdfHeight = Math.ceil((canvas.height * pdfWidth) / canvas.width) + 8

    if (!pdf) {
      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [pdfWidth, pdfHeight],
        hotfixes: ['px_scaling'],
      })
    } else {
      pdf.addPage([pdfWidth, pdfHeight], 'portrait')
    }
    pdf.setPage(index + 1)
    pdf.addImage(imageData, 'JPEG', 0, 0, pdfWidth, pdfHeight - 8)
  }

  pdf?.save(buildOrderFilename(order, 'pdf'))
}
