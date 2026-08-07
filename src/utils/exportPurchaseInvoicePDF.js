// src/utils/exportPurchaseInvoicePDF.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { montserratRegularBase64, montserratBoldBase64 } from './fonts'

// ---------- Number to Words Converter ----------
const numberToWords = (num) => {
  if (num === 0) return 'Zero'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const scales = ['', 'Thousand', 'Lakh', 'Crore']
  const convertBelow1000 = (n) => {
    if (n === 0) return ''
    if (n < 20) return ones[n] + ' '
    if (n < 100) return tens[Math.floor(n / 10)] + ' ' + ones[n % 10] + ' '
    return ones[Math.floor(n / 100)] + ' Hundred ' + convertBelow1000(n % 100)
  }
  let integerPart = Math.floor(Math.abs(num))
  let decimalPart = Math.round((Math.abs(num) - integerPart) * 100)
  let words = ''
  if (integerPart === 0) words = 'Zero'
  else {
    const groups = []
    groups.push(integerPart % 1000)
    integerPart = Math.floor(integerPart / 1000)
    while (integerPart > 0) {
      groups.push(integerPart % 100)
      integerPart = Math.floor(integerPart / 100)
    }
    for (let i = groups.length - 1; i >= 0; i--)
      if (groups[i] !== 0) words += convertBelow1000(groups[i]) + scales[i] + ' '
  }
  words = words.trim() + ' Rupees'
  if (decimalPart > 0) words += ' and ' + convertBelow1000(decimalPart).trim() + ' Paise'
  words += ' Only'
  return words
}

export const exportPurchaseInvoicePDF = (invoice, org, theme, options = {}) => {
  const doc = new jsPDF('p', 'mm', 'a4')

  // ---------- Register Montserrat fonts ----------
  if (!doc.getFontList()?.Montserrat) {
    doc.addFileToVFS('Montserrat-Regular.ttf', montserratRegularBase64)
    doc.addFont('Montserrat-Regular.ttf', 'Montserrat', 'normal')
  }
  if (!doc.getFontList()?.MontserratBold) {
    doc.addFileToVFS('Montserrat-Bold.ttf', montserratBoldBase64)
    doc.addFont('Montserrat-Bold.ttf', 'Montserrat', 'bold')
  }

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 10
  const topMargin = 35
  let y = topMargin

  const safe = (val) => (val ? String(val) : '')

  // Use Montserrat – your theme already uses Montserrat
  const fontHeading = 'Montserrat'
  const fontBody = 'Montserrat'
  const primaryColor = theme?.primary_color || '#0D47A1'

  // ---- Letterhead ----
  if (org?.letterhead_url) {
    try { doc.addImage(org.letterhead_url, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST') } catch (e) {}
  }

  // ---- Title ----
  doc.setFontSize(20)
  doc.setTextColor(0)
  doc.setFont(fontHeading, 'bold')
  doc.text('PURCHASE INVOICE', pageWidth / 2, y + 10, { align: 'center' })
  y += 20

  // ===================== FIRST BOX =====================
  const box1X = margin
  const box1Y = y
  const box1Width = pageWidth - 2 * margin
  const box1Height = 22
  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.rect(box1X, box1Y, box1Width, box1Height)
  const midX1 = box1X + box1Width * 0.525
  doc.line(midX1, box1Y, midX1, box1Y + box1Height)

  // Company Details (left)
  const left1X = box1X + 5
  let left1Y = box1Y + 6
  doc.setFontSize(10)
  doc.setFont(fontHeading, 'bold')
  doc.text(safe(org?.company_name), left1X, left1Y)
  left1Y += 5
  doc.setFontSize(8)
  doc.setFont(fontBody, 'normal')
  if (org?.address) {
    const addressLines = doc.splitTextToSize(safe(org.address), 65)
    doc.text(addressLines.slice(0, 2), left1X, left1Y)
    left1Y += addressLines.slice(0, 2).length * 4
  }
  const extras = []
  if (org?.phone) extras.push(`Phone: ${org.phone}`)
  if (org?.email) extras.push(`Email: ${org.email}`)
  if (org?.gstin) extras.push(`GSTIN: ${org.gstin}`)
  doc.text(extras.join(' | '), left1X, left1Y)

  // Invoice Details (right)
  const right1X = box1X + box1Width - 5
  let right1Y = box1Y + 4
  doc.setFontSize(8)
  doc.setFont(fontBody, 'normal')
  doc.text(`Invoice No: ${safe(invoice?.invoice_number)}`, right1X, right1Y, { align: 'right' })
  right1Y += 4
  doc.text(`Date: ${safe(invoice?.invoice_date)}`, right1X, right1Y, { align: 'right' })
  right1Y += 4
  if (invoice?.due_date) {
    doc.text(`Due Date: ${safe(invoice.due_date)}`, right1X, right1Y, { align: 'right' })
    right1Y += 4
  }
  doc.text(`Status: ${safe(invoice?.status)}`, right1X, right1Y, { align: 'right' })

  y = box1Y + box1Height

  // ===================== SECOND BOX (Vendor Info + Payment) =====================
  const box2X = margin
  const box2Y = y
  const box2Width = pageWidth - 2 * margin
  const box2Height = 30
  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.rect(box2X, box2Y, box2Width, box2Height)
  const midX2 = box2X + box2Width * 0.525
  doc.line(midX2, box2Y, midX2, box2Y + box2Height)

  // Vendor Details (left)
  const vendor = invoice?.vendors || {}
  const vendorX = box2X + 5
  let vendorY = box2Y + 6
  doc.setFontSize(8)
  doc.setFont(fontHeading, 'bold')
  doc.text('Supplier (Vendor)', vendorX, vendorY)
  vendorY += 4
  doc.setFont(fontBody, 'normal')
  doc.text(`Name: ${safe(vendor.vendor_name)}`, vendorX, vendorY)
  vendorY += 4
  doc.text(`Address: ${safe(vendor.address || '-')}`, vendorX, vendorY)
  vendorY += 4
  doc.text(`GSTIN: ${safe(vendor.gstin || '-')}`, vendorX, vendorY)
  vendorY += 4
  doc.text(`State Code: ${safe(vendor.state_code || '-')}`, vendorX, vendorY)

  // Payment Details (right)
  const paymentX = box2X + box2Width - 5
  let paymentY = box2Y + 6
  doc.setFontSize(8)
  doc.setFont(fontHeading, 'bold')
  doc.text('Payment Details', paymentX, paymentY, { align: 'right' })
  paymentY += 5
  doc.setFont(fontBody, 'normal')
  doc.text(`Paid Amount: Rs. ${(invoice?.paid_amount || 0).toFixed(2)}`, paymentX, paymentY, { align: 'right' })
  paymentY += 4
  doc.text(`Balance Due: Rs. ${((invoice?.grand_total || 0) - (invoice?.paid_amount || 0)).toFixed(2)}`, paymentX, paymentY, { align: 'right' })

  y = box2Y + box2Height

  // ===================== ITEMS TABLE (with GST) =====================
  const tableHeaders = [
    'Sr', 'Item Description', 'HSN', 'Qty',
    'Taxable', 'CGST', 'SGST', 'IGST', 'Total'
  ]

  const items = invoice?.purchase_invoice_items || []
  const tableRows = items.map((item, idx) => {
    const inv = item.inventory_items || {}
    return [
      idx + 1,
      inv.item_name || item.description || '-',
      item.hsn_sac_code || '-',
      item.quantity || 1,
      `Rs. ${(item.taxable_amount || 0).toFixed(2)}`,
      `Rs. ${(item.cgst_amount || 0).toFixed(2)}`,
      `Rs. ${(item.sgst_amount || 0).toFixed(2)}`,
      `Rs. ${(item.igst_amount || 0).toFixed(2)}`,
      `Rs. ${(item.total_amount || 0).toFixed(2)}`,
    ]
  })

  const totalTaxable = Number(invoice?.total_taxable_amount) || items.reduce((s, i) => s + Number(i.taxable_amount || 0), 0)
  const totalCGST = Number(invoice?.total_cgst) || items.reduce((s, i) => s + Number(i.cgst_amount || 0), 0)
  const totalSGST = Number(invoice?.total_sgst) || items.reduce((s, i) => s + Number(i.sgst_amount || 0), 0)
  const totalIGST = Number(invoice?.total_igst) || items.reduce((s, i) => s + Number(i.igst_amount || 0), 0)
  const grandTotal = Number(invoice?.grand_total) || totalTaxable + totalCGST + totalSGST + totalIGST

  const subtotalRow = [
    '', 'Sub-Total:', '', '',
    `Rs. ${totalTaxable.toFixed(2)}`,
    `Rs. ${totalCGST.toFixed(2)}`,
    `Rs. ${totalSGST.toFixed(2)}`,
    `Rs. ${totalIGST.toFixed(2)}`,
    `Rs. ${grandTotal.toFixed(2)}`,
  ]

  const allRows = [...tableRows, subtotalRow]

  autoTable(doc, {
    startY: y,
    head: [tableHeaders],
    body: allRows,
    margin: { left: margin, right: margin },
    styles: { font: fontBody, fontSize: 8, cellPadding: 1.5, textColor: 0, lineColor: 0, lineWidth: 0.1 },
    headStyles: { fillColor: false, textColor: 0, fontStyle: 'bold', lineColor: 0, lineWidth: 0.2 },
    bodyStyles: { fillColor: false, textColor: 0, lineColor: 0, lineWidth: 0.1 },
    rowStyles: (row, data) => {
      if (row === data.table.body.length - 1) return { fontStyle: 'bold', lineWidth: 0.2 }
      return {}
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
      8: { cellWidth: 24, halign: 'right' },
    },
    theme: 'plain',
    didDrawPage: (data) => { y = data.cursor.y + 2 },
  })

  // ===================== THIRD BOX (Bank + Tax Summary) =====================
  const box3X = margin
  const box3Y = y
  const box3Width = pageWidth - 2 * margin
  const box3Height = 50
  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.rect(box3X, box3Y, box3Width, box3Height)
  const midX3 = box3X + box3Width * 0.525
  doc.line(midX3, box3Y, midX3, box3Y + box3Height)

  // Bank Details (left)
  const bankX = box3X + 5
  let bankY = box3Y + 4
  doc.setFontSize(8)
  doc.setFont(fontHeading, 'bold')
  doc.text('Bank Details', bankX, bankY)
  bankY += 4
  doc.setFont(fontBody, 'normal')
  doc.text(`Bank Name: ${safe(org?.bank_name || 'N/A')}`, bankX, bankY)
  bankY += 4
  doc.text(`Branch: ${safe(org?.branch_name || 'N/A')}`, bankX, bankY)
  bankY += 4
  doc.text(`Account No: ${safe(org?.account_number || 'N/A')}`, bankX, bankY)
  bankY += 4
  doc.text(`IFSC Code: ${safe(org?.ifsc_code || 'N/A')}`, bankX, bankY)
  bankY += 4
  doc.text(`UPI ID: ${safe(org?.upi_id || 'N/A')}`, bankX, bankY)

  // Amount in Words (left, below bank details)
  bankY += 4
  doc.setFont(fontHeading, 'bold')
  doc.text('Amount in Words:', bankX, bankY)
  bankY += 4
  doc.setFont(fontBody, 'normal')
  doc.text(numberToWords(grandTotal), bankX, bankY)

  // Tax Summary (right)
  const taxRows = [
    ['Taxable Amount', `Rs. ${totalTaxable.toFixed(2)}`],
    ['CGST', `Rs. ${totalCGST.toFixed(2)}`],
    ['SGST', `Rs. ${totalSGST.toFixed(2)}`],
    ['IGST', `Rs. ${totalIGST.toFixed(2)}`],
    ['Round Off', 'Rs. 0.00'],
    ['Grand Total', `Rs. ${grandTotal.toFixed(2)}`],
  ]

  const taxTableX = midX3 + 2
  const taxTableWidth = box3Width - (taxTableX - box3X) - 5

  autoTable(doc, {
    startY: box3Y + 2,
    body: taxRows,
    margin: { left: taxTableX, right: margin },
    styles: { font: fontBody, fontSize: 7, cellPadding: 1, textColor: 0, lineColor: 0, lineWidth: 0.1, halign: 'right' },
    columnStyles: {
      0: { cellWidth: taxTableWidth * 0.5, halign: 'right' },
      1: { cellWidth: taxTableWidth * 0.5, halign: 'right' },
    },
    tableWidth: taxTableWidth,
    theme: 'plain',
    bodyStyles: { fillColor: false },
  })

  y = box3Y + box3Height

  // ===================== FOURTH BOX (Terms + Signature) =====================
  const box4X = margin
  const box4Y = y
  const box4Width = pageWidth - 2 * margin
  const box4Height = 28
  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.rect(box4X, box4Y, box4Width, box4Height)
  const midX4 = box4X + box4Width * 0.525
  doc.line(midX4, box4Y, midX4, box4Y + box4Height)

  // Terms (left)
  const termsX = box4X + 5
  let termsY = box4Y + 4
  doc.setFontSize(8)
  doc.setFont(fontHeading, 'bold')
  doc.text('Terms & Conditions', termsX, termsY)
  termsY += 4
  doc.setFont(fontBody, 'normal')
  const termsList = [
    '1. Payment due within 30 days.',
    '2. Discrepancies must be reported within 7 days.',
    '3. Subject to jurisdiction of local courts.',
  ]
  termsList.forEach(line => {
    doc.text(line, termsX + 2, termsY)
    termsY += 4
  })

  // Signature (right)
  const signX = midX4 + 5
  let signY = box4Y + 12
  doc.setFontSize(8)
  doc.setFont(fontHeading, 'bold')
  doc.text('Authorised Signatory', signX, signY)
  signY += 6
  doc.setFont(fontBody, 'normal')
  doc.text('____________________', signX, signY)

  // Output
  if (options?.returnBlob === true) {
    return doc.output('blob')
  } else {
    doc.save(`PurchaseInvoice_${invoice?.invoice_number || 'invoice'}.pdf`)
    return null
  }
}