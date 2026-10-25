import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { formatDate, formatMoney } from '../utils/format.js'
import { itemTotal, labourTotal, quoteTotals } from './quoteFields.js'
import { branches } from '../modules.js'

const INK = [31, 29, 26]
const MUTED = [138, 132, 123]
const ACCENT = [122, 92, 62]
const RULE = [235, 232, 227]
const MARGIN = 18

// Builds an A4 PDF of the quote and downloads it as e.g. QT-0012.pdf.
export function downloadQuotePdf(quote, client) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const right = pageWidth - MARGIN
  let y = MARGIN

  // --- Letterhead ---
  doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(...INK)
  doc.text('IMMENSE HOME', MARGIN, y + 4)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED)
  doc.text(`Interior studio  |  ${branches.join('  |  ')}`, MARGIN, y + 10)

  doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(...ACCENT)
  doc.text('QUOTATION', right, y + 4, { align: 'right' })
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...INK)
  doc.text(
    [`Quote no.  ${quote.id}`, `Date  ${formatDate(quote.date)}`, `Valid until  ${formatDate(quote.validUntil)}`],
    right,
    y + 10,
    { align: 'right', lineHeightFactor: 1.5 },
  )

  y += 26
  doc.setDrawColor(...RULE).setLineWidth(0.3).line(MARGIN, y, right, y)
  y += 8

  // --- Client and site ---
  const half = MARGIN + (right - MARGIN) / 2
  const block = (x, label, lines) => {
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED)
    doc.text(label.toUpperCase(), x, y)
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...INK)
    doc.text(lines[0] ?? '', x, y + 5)
    doc.setFont('helvetica', 'normal').setFontSize(9)
    doc.text(lines.slice(1), x, y + 10, { lineHeightFactor: 1.45 })
  }
  block(MARGIN, 'Quotation for', [
    client?.name ?? quote.clientId,
    quote.clientId,
    client?.phone ?? '',
    client?.email ?? '',
  ].filter(Boolean))
  block(half, 'Site', quote.site ? [quote.site.label, quote.site.address, quote.site.city] : ['Not set'])

  y += 30
  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...INK)
  doc.text(quote.title, MARGIN, y)
  y += 4

  // --- Line tables ---
  const tableStyle = {
    theme: 'plain',
    margin: { left: MARGIN, right: MARGIN },
    styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: { top: 2, bottom: 2, left: 2, right: 2 } },
    headStyles: { fontStyle: 'bold', textColor: MUTED, fontSize: 8, lineWidth: { bottom: 0.3 }, lineColor: RULE },
    bodyStyles: { lineWidth: { bottom: 0.1 }, lineColor: RULE },
  }
  const numCol = { halign: 'right' }
  // Right-align the headings of number columns to match their values.
  const alignHeads = (numeric) => ({
    didParseCell: (cell) => {
      if (cell.section === 'head' && numeric.includes(cell.column.index)) cell.cell.styles.halign = 'right'
    },
  })

  if (quote.items.length) {
    autoTable(doc, {
      ...tableStyle,
      startY: y + 2,
      head: [['Products and materials', 'Qty', 'Unit', 'Unit price', 'Disc.', 'Amount']],
      body: quote.items.map((i) => [
        i.description ? `${i.product}\n${i.description}` : i.product,
        i.qty.toLocaleString('en-LK'),
        i.unit,
        formatMoney(i.price),
        i.discount ? `${i.discount}%` : '-',
        formatMoney(itemTotal(i)),
      ]),
      columnStyles: { 0: { cellWidth: 70 }, 1: numCol, 3: numCol, 4: numCol, 5: numCol },
      ...alignHeads([1, 3, 4, 5]),
    })
    y = doc.lastAutoTable.finalY + 4
  }

  if (quote.labour.length) {
    autoTable(doc, {
      ...tableStyle,
      startY: y + 2,
      head: [['Labour and installation', 'Qty', 'Unit', 'Rate', 'Amount']],
      body: quote.labour.map((l) => [
        l.description,
        l.qty.toLocaleString('en-LK'),
        l.unit,
        formatMoney(l.price),
        formatMoney(labourTotal(l)),
      ]),
      columnStyles: { 0: { cellWidth: 85 }, 1: numCol, 3: numCol, 4: numCol },
      ...alignHeads([1, 3, 4]),
    })
    y = doc.lastAutoTable.finalY + 4
  }

  // --- Totals ---
  const t = quoteTotals(quote)
  const rows = [
    ['Products and materials', formatMoney(t.materials)],
    ['Labour and installation', formatMoney(t.labour)],
    ['Subtotal', formatMoney(t.subtotal)],
  ]
  if (t.discount > 0) {
    const label = quote.discount.type === 'percent' ? `Discount (${quote.discount.value}%)` : 'Discount'
    rows.push([label, `- ${formatMoney(t.discount)}`])
  }
  if (t.tax > 0) rows.push([`VAT (${quote.taxRate}%)`, formatMoney(t.tax)])

  if (y > 240) {
    doc.addPage()
    y = MARGIN
  }
  y += 4
  const labelX = right - 75
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...INK)
  rows.forEach(([label, value]) => {
    doc.text(label, labelX, y)
    doc.text(value, right, y, { align: 'right' })
    y += 5.5
  })
  doc.setDrawColor(...INK).setLineWidth(0.4).line(labelX, y - 2, right, y - 2)
  y += 4
  doc.setFont('helvetica', 'bold').setFontSize(11)
  doc.text('Total', labelX, y)
  doc.text(formatMoney(t.total), right, y, { align: 'right' })
  y += 12

  // --- Notes and terms ---
  const paragraph = (label, text) => {
    if (!text) return
    const lines = doc.splitTextToSize(text, right - MARGIN)
    if (y + 8 + lines.length * 4.5 > 280) {
      doc.addPage()
      y = MARGIN
    }
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED)
    doc.text(label.toUpperCase(), MARGIN, y)
    doc.setFontSize(9).setTextColor(...INK)
    doc.text(lines, MARGIN, y + 5, { lineHeightFactor: 1.45 })
    y += 9 + lines.length * 4.5
  }
  paragraph('Notes', quote.notes)
  paragraph('Terms', quote.terms)

  // --- Footer on every page ---
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED)
    doc.text(`Immense Home  |  ${quote.id}`, MARGIN, 289)
    doc.text(`Page ${p} of ${pages}`, right, 289, { align: 'right' })
  }

  doc.save(`${quote.id}.pdf`)
}
