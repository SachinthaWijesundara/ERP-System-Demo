import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { formatDate, formatMoney } from '../utils/format.js'
import { amountPaid, invoiceBalance, invoiceStatus } from '../data/links.js'

const INK = [31, 29, 26]
const MUTED = [138, 132, 123]
const ACCENT = [122, 92, 62]
const RULE = [235, 232, 227]

// The PDF's built-in font only covers Western characters.
const plain = (text) => String(text ?? '').replace(/•/g, '*').replace(/−/g, '-')

function letterhead(doc, title, branch, margin, right) {
  doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(...INK)
  doc.text('IMMENSE HOME', margin, margin + 4)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED)
  doc.text(`Interior studio  |  ${branch ?? ''} branch`, margin, margin + 10)
  doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(...ACCENT)
  doc.text(title, right, margin + 4, { align: 'right' })
}

function block(doc, x, y, label, lines) {
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED)
  doc.text(label.toUpperCase(), x, y)
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...INK)
  doc.text(plain(lines[0] ?? ''), x, y + 5)
  doc.setFont('helvetica', 'normal').setFontSize(9)
  doc.text(lines.slice(1).map(plain), x, y + 10, { lineHeightFactor: 1.45 })
}

// A4 invoice, downloaded as e.g. INV-0045.pdf.
export function downloadInvoicePdf(invoice, { client, project, branch }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const M = 18
  const right = doc.internal.pageSize.getWidth() - M
  let y = M

  letterhead(doc, invoice.cancelled ? 'CANCELLED INVOICE' : invoice.draft ? 'DRAFT INVOICE' : 'INVOICE', branch, M, right)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...INK)
  doc.text([`Invoice no.  ${invoice.id}`, `Date  ${formatDate(invoice.date)}`, `Due  ${formatDate(invoice.dueDate)}`], right, y + 10, {
    align: 'right',
    lineHeightFactor: 1.5,
  })

  y += 26
  doc.setDrawColor(...RULE).setLineWidth(0.3).line(M, y, right, y)
  y += 8

  const half = M + (right - M) / 2
  block(
    doc,
    M,
    y,
    'Bill to',
    client ? [client.name, client.id, client.phone, client.email].filter(Boolean) : ['Walk-in customer'],
  )
  block(
    doc,
    half,
    y,
    project ? 'Project' : 'Sale',
    project
      ? [project.name, `${project.id} | quote ${project.quoteId}`, project.site ? `${project.site.address}, ${project.site.city}` : ''].filter(Boolean)
      : [invoice.saleId ? `Counter sale ${invoice.saleId}` : '-'],
  )
  y += 32

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    margin: { left: M, right: M },
    styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: 2 },
    headStyles: { fontStyle: 'bold', textColor: MUTED, fontSize: 8, lineWidth: { bottom: 0.3 }, lineColor: RULE },
    bodyStyles: { lineWidth: { bottom: 0.1 }, lineColor: RULE },
    head: [['Description', 'Amount']],
    // Final invoices carry a breakdown; the others are one line.
    body: invoice.lines?.length
      ? invoice.lines.map((l) => [plain(l.description), plain(formatMoney(l.amount))])
      : [[`${invoice.type} invoice\n${plain(invoice.description)}`, formatMoney(invoice.amount)]],
    columnStyles: { 1: { halign: 'right', cellWidth: 40 } },
    didParseCell: (c) => {
      if (c.section === 'head' && c.column.index === 1) c.cell.styles.halign = 'right'
    },
  })
  y = doc.lastAutoTable.finalY + 10

  // Totals
  const labelX = right - 75
  const row = (label, value, bold) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(bold ? 11 : 9).setTextColor(...INK)
    doc.text(label, labelX, y)
    doc.text(value, right, y, { align: 'right' })
    y += bold ? 7 : 5.5
  }
  row('Invoice amount', formatMoney(invoice.amount))
  row('Paid to date', `- ${formatMoney(amountPaid(invoice))}`)
  doc.setDrawColor(...INK).setLineWidth(0.4).line(labelX, y - 2, right, y - 2)
  y += 4
  row(invoiceStatus(invoice) === 'Paid' ? 'Paid in full' : 'Balance due', formatMoney(invoiceBalance(invoice)), true)
  y += 6

  if (invoice.payments.length) {
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED)
    doc.text('PAYMENTS RECEIVED', M, y)
    autoTable(doc, {
      startY: y + 2,
      theme: 'plain',
      margin: { left: M, right: M },
      styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: 1.8 },
      bodyStyles: { lineWidth: { bottom: 0.1 }, lineColor: RULE },
      body: invoice.payments.map((p) => [p.id, formatDate(p.date), p.method, plain(p.reference), formatMoney(p.amount)]),
      columnStyles: { 4: { halign: 'right' } },
    })
    y = doc.lastAutoTable.finalY + 10
  }

  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...INK)
  doc.text(`Please quote ${invoice.id} with your payment. Thank you for choosing Immense Home.`, M, y)

  doc.setFontSize(8).setTextColor(...MUTED)
  doc.text(`Immense Home  |  ${invoice.id}`, M, 289)

  doc.save(`${invoice.id}.pdf`)
}

// A5 receipt for one payment, downloaded as e.g. PAY-0091.pdf.
// `nameOf(staffId)` gives the name of the staff member who took the payment.
export function downloadPaymentReceipt(invoice, payment, { client, branch, nameOf }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' })
  const M = 14
  const right = doc.internal.pageSize.getWidth() - M
  let y = M

  letterhead(doc, 'RECEIPT', branch, M, right)
  y += 20
  doc.setDrawColor(...RULE).setLineWidth(0.3).line(M, y, right, y)
  y += 8

  const row = (label, value) => {
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED)
    doc.text(label, M, y)
    doc.setTextColor(...INK)
    doc.text(plain(value), right, y, { align: 'right' })
    y += 6
  }
  row('Receipt no.', payment.id)
  row('Date', formatDate(payment.date))
  row('Received from', client?.name ?? 'Walk-in customer')
  row('For invoice', `${invoice.id} (${invoice.type})`)
  row('Method', payment.method)
  if (payment.reference) row('Reference', payment.reference)
  row('Received by', nameOf(payment.receivedById))

  y += 2
  doc.setDrawColor(...INK).setLineWidth(0.4).line(M, y, right, y)
  y += 8
  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...INK)
  doc.text('Amount received', M, y)
  doc.text(formatMoney(payment.amount), right, y, { align: 'right' })
  y += 8
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED)
  // The balance right after this payment, so an old receipt reprints the same.
  const upTo = invoice.payments.slice(0, invoice.payments.findIndex((p) => p.id === payment.id) + 1)
  const balance = invoice.amount - upTo.reduce((sum, p) => sum + p.amount, 0)
  doc.text(balance > 0 ? `Balance still due on ${invoice.id}: ${formatMoney(balance)}` : `${invoice.id} is now paid in full.`, M, y)

  doc.save(`${payment.id}.pdf`)
}
