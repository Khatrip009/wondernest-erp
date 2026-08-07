// src/utils/exportInvoicePDF.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ----- Corrected Indian Number to Words Converter -----
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

  if (integerPart === 0) {
    words = 'Zero'
  } else {
    const groups = []
    groups.push(integerPart % 1000)
    integerPart = Math.floor(integerPart / 1000)
    while (integerPart > 0) {
      groups.push(integerPart % 100)
      integerPart = Math.floor(integerPart / 100)
    }
    for (let i = groups.length - 1; i >= 0; i--) {
      if (groups[i] !== 0) {
        words += convertBelow1000(groups[i]) + scales[i] + ' '
      }
    }
  }

  words = words.trim() + ' Rupees'
  if (decimalPart > 0) {
    words += ' and ' + convertBelow1000(decimalPart).trim() + ' Paise'
  }
  words += ' Only'
  return words
}

export const exportInvoicePDF = (invoice, org, theme, options = {}) => {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 10
  const topMargin = 35
  let y = topMargin

  const safe = (val) => (val ? String(val) : '')

  // ---- Letterhead ----
  if (org?.letterhead_url) {
    try {
      doc.addImage(org.letterhead_url, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
    } catch (e) {}
  }

  // ---- Title ----
  doc.setFontSize(20)
  doc.setTextColor(0)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', pageWidth / 2, y + 10, { align: 'center' })
  y += 20

  // ===================== FIRST BOX =====================
  const box1X = margin
  const box1Y = y
  const box1Width = pageWidth - 2 * margin
  const box1Height = 25

  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.rect(box1X, box1Y, box1Width, box1Height)

  const midX1 = box1X + box1Width * 0.65
  doc.setDrawColor(0)
  doc.setLineWidth(0.2)
  doc.line(midX1, box1Y, midX1, box1Y + box1Height)

  // Left: Company Details
  const left1X = box1X + 5
  let left1Y = box1Y + 4
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(safe(org?.company_name), left1X, left1Y)
  left1Y += 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  if (org?.address) {
    doc.text(safe(org.address), left1X, left1Y)
    left1Y += 4
  }
  if (org?.phone) {
    doc.text(`Phone: ${safe(org.phone)}`, left1X, left1Y)
    left1Y += 4
  }
  if (org?.email) {
    doc.text(`Email: ${safe(org.email)}`, left1X, left1Y)
    left1Y += 4
  }
  if (org?.gstin) {
    doc.text(`GSTIN: ${safe(org.gstin)}`, left1X, left1Y)
  }

  // Right: Invoice Details
  const right1X = box1X + box1Width - 5
  let right1Y = box1Y + 4
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Invoice No: ${safe(invoice?.invoice_number)}`, right1X, right1Y, { align: 'right' })
  right1Y += 4
  doc.text(`Date: ${safe(invoice?.invoice_date)}`, right1X, right1Y, { align: 'right' })
  right1Y += 4
  if (invoice?.due_date) {
    doc.text(`Due Date: ${safe(invoice.due_date)}`, right1X, right1Y, { align: 'right' })
    right1Y += 4
  }
  doc.text(`Status: ${safe(invoice?.status)}`, right1X, right1Y, { align: 'right' })
  right1Y += 4
  // Payment mode – use last_payment_mode or payment_mode
  const paymentMode = invoice?.last_payment_mode || invoice?.payment_mode || 'N/A'
  doc.text(`Payment Mode: ${safe(paymentMode)}`, right1X, right1Y, { align: 'right' })

  y = box1Y + box1Height

  // ===================== SECOND BOX (height 35) =====================
  const box2X = margin
  const box2Y = y
  const box2Width = pageWidth - 2 * margin
  const box2Height = 35

  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.rect(box2X, box2Y, box2Width, box2Height)

  const midX2 = box2X + box2Width * 0.65
  doc.setDrawColor(0)
  doc.setLineWidth(0.2)
  doc.line(midX2, box2Y, midX2, box2Y + box2Height)

  const leftColWidth = midX2 - box2X
  const subMid = box2X + leftColWidth * 0.5
  doc.setDrawColor(0)
  doc.setLineWidth(0.1)
  doc.line(subMid, box2Y, subMid, box2Y + box2Height)

  // Bill To
  const billX = box2X + 3
  let billY = box2Y + 3
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Bill To:', billX, billY)
  billY += 4
  doc.setFont('helvetica', 'normal')
  doc.text(`Name: ${safe(invoice?.student_name)}`, billX, billY)
  billY += 4
  const addressLines = doc.splitTextToSize(safe(invoice?.student_address || '-'), 45)
  doc.text(`Address: ${addressLines[0]}`, billX, billY)
  billY += 4
  for (let i = 1; i < addressLines.length; i++) {
    doc.text(addressLines[i], billX, billY)
    billY += 4
  }
  const cityState = `${safe(invoice?.student_city)} ${safe(invoice?.student_state)} - ${safe(invoice?.student_pincode)}`.trim()
  doc.text(cityState, billX, billY)
  billY += 4
  doc.text(`Mobile: ${safe(invoice?.student_mobile)}`, billX, billY)
  billY += 4
  doc.text(`GSTIN: ${safe(invoice?.student_gstin || '-')}`, billX, billY)

  // Ship To
  const shipX = subMid + 3
  let shipY = box2Y + 3
  doc.setFont('helvetica', 'bold')
  doc.text('Ship To:', shipX, shipY)
  shipY += 4
  doc.setFont('helvetica', 'normal')
  doc.text(`Name: ${safe(invoice?.student_name)}`, shipX, shipY)
  shipY += 4
  for (let i = 0; i < addressLines.length; i++) {
    doc.text(addressLines[i], shipX, shipY)
    shipY += 4
  }
  doc.text(cityState, shipX, shipY)
  shipY += 4
  doc.text(`State: ${safe(invoice?.student_state)}`, shipX, shipY)
  shipY += 4
  doc.text(`GSTIN: ${safe(invoice?.student_gstin || '-')}`, shipX, shipY)

  // Right: Payment Details (using last_payment fields)
  const right2X = box2X + box2Width - 5
  let right2Y = box2Y + 4
  const receiptNo = invoice?.last_receipt_no || invoice?.receipt_number || 'N/A'
  const receiptDate = invoice?.last_payment_date || invoice?.receipt_date || 'N/A'
  const refNo = invoice?.transaction_no || invoice?.payment_reference || 'N/A'

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Payment Details', right2X, right2Y, { align: 'right' })
  right2Y += 5
  doc.setFont('helvetica', 'normal')
  doc.text(`Reference No: ${safe(refNo)}`, right2X, right2Y, { align: 'right' })
  right2Y += 4
  doc.text(`Receipt No: ${safe(receiptNo)}`, right2X, right2Y, { align: 'right' })
  right2Y += 4
  doc.text(`Receipt Date: ${safe(receiptDate)}`, right2X, right2Y, { align: 'right' })

  y = box2Y + box2Height

  // ===================== ITEMS TABLE =====================
  const tableHeaders = [
    'Sr',
    'Goods & Service Description',
    'HSN',
    'Qty',
    'Taxable',
    'CGST',
    'SGST',
    'IGST',
    'Total'
  ]

  const items = invoice?.items || []
  const tableRows = items.map((item, idx) => {
    const taxable = Number(item?.taxable_amount || 0)
    const qty = Number(item?.quantity || 1)
    const cgst = Number(item?.cgst_amount || 0)
    const sgst = Number(item?.sgst_amount || 0)
    const igst = Number(item?.igst_amount || 0)
    const total = Number(item?.total_amount || 0)

    return [
      idx + 1,
      item?.description || '',
      item?.hsn_sac_code || '-',
      qty.toFixed(0),
      `Rs. ${taxable.toFixed(2)}`,
      `Rs. ${cgst.toFixed(2)}`,
      `Rs. ${sgst.toFixed(2)}`,
      `Rs. ${igst.toFixed(2)}`,
      `Rs. ${total.toFixed(2)}`,
    ]
  })

  // Sub‑total
  const totalItems = items.length
  const totalTaxable = Number(invoice?.total_taxable_amount) ||
    items.reduce((s, i) => s + Number(i.taxable_amount || 0), 0)
  const totalCGST = Number(invoice?.total_cgst) ||
    items.reduce((s, i) => s + Number(i.cgst_amount || 0), 0)
  const totalSGST = Number(invoice?.total_sgst) ||
    items.reduce((s, i) => s + Number(i.sgst_amount || 0), 0)
  const totalIGST = Number(invoice?.total_igst) ||
    items.reduce((s, i) => s + Number(i.igst_amount || 0), 0)
  const totalGST = totalCGST + totalSGST + totalIGST
  const grandTotal = Number(invoice?.grand_total) || totalTaxable + totalGST

  const subtotalRow = [
    '',
    'Sub-Total:',
    '',
    totalItems.toString(),
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
    styles: { fontSize: 8, cellPadding: 1.5, textColor: 0, lineColor: 0, lineWidth: 0.1 },
    headStyles: { fillColor: false, textColor: 0, fontStyle: 'bold', lineColor: 0, lineWidth: 0.2 },
    bodyStyles: { fillColor: false, textColor: 0, lineColor: 0, lineWidth: 0.1 },
    rowStyles: (row, data) => {
      if (row === data.table.body.length - 1) {
        return { fontStyle: 'bold', lineWidth: 0.2 }
      }
      return {}
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 24, halign: 'right' },
      7: { cellWidth: 24, halign: 'right' },
      8: { cellWidth: 25, halign: 'right' },
    },
    theme: 'plain',
    didDrawPage: (data) => {
      y = data.cursor.y + 2
    },
  })

  // ===================== THIRD BOX =====================
  const box3X = margin
  const box3Y = y
  const box3Width = pageWidth - 2 * margin
  const box3Height = 40

  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.rect(box3X, box3Y, box3Width, box3Height)

  const midX3 = box3X + box3Width * 0.6
  doc.setDrawColor(0)
  doc.setLineWidth(0.2)
  doc.line(midX3, box3Y, midX3, box3Y + box3Height)

  // Left: Bank Details + Amount in Words
  const bankX = box3X + 5
  let bankY = box3Y + 4
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Bank Details', bankX, bankY)
  bankY += 4
  doc.setFont('helvetica', 'normal')
  doc.text(`Bank Name: ${safe(org?.bank_name || 'N/A')}`, bankX, bankY)
  bankY += 4
  doc.text(`Branch: ${safe(org?.branch_name || 'N/A')}`, bankX, bankY)
  bankY += 4
  doc.text(`Account No: ${safe(org?.account_number || 'N/A')}`, bankX, bankY)
  bankY += 4
  doc.text(`IFSC Code: ${safe(org?.ifsc_code || 'N/A')}`, bankX, bankY)
  bankY += 4
  doc.text(`UPI ID: ${safe(org?.upi_id || 'N/A')}`, bankX, bankY)
  bankY += 4

  doc.setDrawColor(0)
  doc.setLineWidth(0.1)
  doc.line(bankX, bankY, box3X + box3Width * 0.6 - 2, bankY)
  bankY += 2

  // Amount in Words
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Amount in Words:', bankX, bankY)
  bankY += 4
  doc.setFont('helvetica', 'normal')
  const amountInWords = numberToWords(grandTotal)
  doc.text(amountInWords, bankX, bankY)

  // Right: Tax Summary
  const taxData = [
    ['Grand Total', `Rs. ${grandTotal.toFixed(2)}`],
    ['SGST', `Rs. ${totalSGST.toFixed(2)}`],
    ['CGST', `Rs. ${totalCGST.toFixed(2)}`],
    ['IGST', `Rs. ${totalIGST.toFixed(2)}`],
    ['Round Off', `Rs. 0.00`],
    ['Total Amount', `Rs. ${grandTotal.toFixed(2)}`],
  ]

  const taxTableX = midX3 + 2
  const taxTableWidth = box3Width * 0.36

  autoTable(doc, {
    startY: box3Y + 2,
    body: taxData,
    margin: { left: taxTableX, right: margin },
    styles: { fontSize: 7, cellPadding: 1, textColor: 0, lineColor: 0, lineWidth: 0.1, halign: 'right' },
    columnStyles: {
      0: { cellWidth: taxTableWidth * 0.5, halign: 'right' },
      1: { cellWidth: taxTableWidth * 0.5, halign: 'right' },
    },
    tableWidth: taxTableWidth,
    theme: 'plain',
    bodyStyles: { fillColor: false },
  })

  y = box3Y + box3Height

  // ===================== FOURTH BOX =====================
  const box4X = margin
  const box4Y = y
  const box4Width = pageWidth - 2 * margin
  const box4Height = 28

  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.rect(box4X, box4Y, box4Width, box4Height)

  const midX4 = box4X + box4Width * 0.65
  doc.setDrawColor(0)
  doc.setLineWidth(0.2)
  doc.line(midX4, box4Y, midX4, box4Y + box4Height)

  // Terms
  const termsX = box4X + 5
  let termsY = box4Y + 4
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Payment Terms & Conditions', termsX, termsY)
  termsY += 4
  doc.setFont('helvetica', 'normal')
  const termsList = [
    '1. Payment is due within 15 days from the invoice date.',
    '2. Late payments may incur a penalty of 2% per month.',
    '3. Please quote invoice number when making payment.',
  ]
  termsList.forEach((line) => {
    doc.text(line, termsX + 2, termsY)
    termsY += 4
  })

  // Barcode + Signatory
  const rightStartX = midX4 + 5
  let rightY = box4Y + 4
  doc.setDrawColor(0)
  doc.setLineWidth(0.1)
  doc.rect(rightStartX, rightY, 30, 10)
  doc.setFontSize(6)
  doc.text('Barcode', rightStartX + 15, rightY + 6, { align: 'center' })
  rightY += 14
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Authorised Signatory', rightStartX, rightY)
  rightY += 6
  doc.setFont('helvetica', 'normal')
  doc.text('____________________', rightStartX, rightY)

  if (options?.returnBlob === true) {
    return doc.output('blob')
  } else {
    doc.save(`Invoice_${invoice?.invoice_number || 'invoice'}.pdf`)
    return null
  }
}