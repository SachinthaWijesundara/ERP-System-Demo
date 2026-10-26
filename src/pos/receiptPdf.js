import { jsPDF } from 'jspdf'
import { formatDate, formatMoney } from '../utils/format.js'
import { lineTotal, saleTotals } from './posFields.js'

const WIDTH = 80 // mm, a standard till-roll receipt
const M = 6
const LINE = 4.6

// The PDF's built-in font only covers Western characters, so swap the few
// symbols our data uses for plain ones.
const plain = (text) => String(text).replace(/•/g, '*').replace(/−/g, '-')

// Builds a till-roll PDF of the sale and downloads it as e.g. SL-0312.pdf.
// `cashierName` is the registered staff member who rang the sale up.
export function downloadReceiptPdf(sale, cashierName) {
  const t = saleTotals(sale)

  const right = WIDTH - M

  // Work out the height first, so the page is exactly as long as the receipt.
  // Long item names wrap, so measure them with a scratch document.
  const measure = new jsPDF({ unit: 'mm', format: [WIDTH, 200] }).setFont('helvetica', 'bold').setFontSize(8)
  const nameLines = sale.items.map((i) => measure.splitTextToSize(plain(i.name), right - M))
  const extraRows = (t.discount > 0 ? 2 : 0) + (sale.payment.method === 'Cash' ? 2 : sale.payment.reference ? 1 : 0)
  const itemRows = nameLines.reduce((sum, lines) => sum + lines.length + 1, 0)
  const height = 62 + itemRows * LINE + (sale.customer?.name ? LINE : 0) + extraRows * LINE + 6

  const doc = new jsPDF({ unit: 'mm', format: [WIDTH, height] })
  let y = 10

  const row = (left, value, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(plain(left), M, y)
    doc.text(plain(value), right, y, { align: 'right' })
    y += LINE
  }
  const rule = () => {
    doc.setLineDashPattern([0.8, 0.8], 0).setDrawColor(150).setLineWidth(0.2).line(M, y - 2, right, y - 2)
    y += 2
  }

  doc.setFont('helvetica', 'bold').setFontSize(12)
  doc.text('IMMENSE HOME', WIDTH / 2, y, { align: 'center' })
  y += 5
  doc.setFont('helvetica', 'normal').setFontSize(8)
  doc.text(`Interior studio | ${sale.branch} branch`, WIDTH / 2, y, { align: 'center' })
  y += 7
  rule()

  doc.setFontSize(8)
  row('Receipt', sale.id)
  row('Date', `${formatDate(sale.date)}, ${sale.time}`)
  row('Cashier', cashierName)
  if (sale.customer?.name) row('Customer', sale.customer.name)
  y += 1
  rule()

  sale.items.forEach((item, i) => {
    doc.setFont('helvetica', 'bold')
    doc.text(nameLines[i], M, y, { lineHeightFactor: 1.15 })
    y += LINE * nameLines[i].length
    const detail = `${item.qty} ${item.unit} x ${formatMoney(item.price)}${item.discount ? ` | ${item.discount}% off` : ''}`
    row(detail, formatMoney(lineTotal(item)))
  })
  y += 1
  rule()

  if (t.discount > 0) {
    row('Subtotal', formatMoney(t.gross))
    row('Discount', `- ${formatMoney(t.discount)}`)
  }
  doc.setFontSize(10)
  row('TOTAL', formatMoney(t.total), true)
  doc.setFontSize(8)
  row('Paid by', sale.payment.method)
  if (sale.payment.method === 'Cash') {
    row('Cash received', formatMoney(sale.payment.tendered))
    row('Change', formatMoney(t.change))
  } else if (sale.payment.reference) {
    row('Ref.', sale.payment.reference)
  }
  y += 1
  rule()

  doc.setFont('helvetica', 'normal')
  doc.text(`${t.itemCount} items`, WIDTH / 2, y + 1, { align: 'center' })
  doc.text('Thank you for shopping with Immense Home.', WIDTH / 2, y + 6, { align: 'center' })

  doc.save(`${sale.id}.pdf`)
}
