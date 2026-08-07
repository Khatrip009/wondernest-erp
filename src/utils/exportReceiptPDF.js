// src/utils/exportReceiptPDF.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { montserratRegularBase64, montserratBoldBase64 } from './fonts'

export const numberToWords = (num) => {
  if (num == null || isNaN(num) || num === 0) return 'Zero Rupees Only'
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
  return words + ' Only'
}

export const exportReceiptPDF = (receipt, org, theme, options = {}) => {
  const doc = new jsPDF('landscape', 'mm', 'a5')

  // ---------- Register Montserrat fonts ----------
  if (!doc.getFontList()?.Montserrat) {
    doc.addFileToVFS('Montserrat-Regular.ttf', montserratRegularBase64)
    doc.addFont('Montserrat-Regular.ttf', 'Montserrat', 'normal')
  }
  if (!doc.getFontList()?.MontserratBold) {
    doc.addFileToVFS('Montserrat-Bold.ttf', montserratBoldBase64)
    doc.addFont('Montserrat-Bold.ttf', 'Montserrat', 'bold')
  }

  const pageWidth = 210, pageHeight = 148, margin = 8, topMargin = 10
  let y = topMargin
  const safe = (val) => (val !== undefined && val !== null ? String(val) : '')

  // Theme values – use Montserrat
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = 'Montserrat'
  const fontBody = 'Montserrat'

  // ---------- Header with Dark Logo & Company Details ----------
  const logoWidth = 30, logoHeight = 18
  let headerLeftX = margin

  // Use dark logo explicitly, fallback to light, then skip
  const logoUrl = org?.logo_dark_url || org?.logo_light_url || null
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 'PNG', margin, y, logoWidth, logoHeight, undefined, 'FAST')
      headerLeftX = margin + logoWidth + 4
    } catch (e) { /* ignore */ }
  }

  // Company details next to the logo
  doc.setFontSize(9)
  doc.setFont(fontHeading, 'bold')
  doc.setTextColor(primaryColor)
  doc.text(safe(org?.company_name), headerLeftX, y + 4)

  doc.setFontSize(6)
  doc.setFont(fontBody, 'normal')
  doc.setTextColor(0)
  let detailY = y + 8
  if (org?.address) {
    doc.text(safe(org.address), headerLeftX, detailY)
    detailY += 3.5
  }
  const contact = []
  if (org?.phone) contact.push(`Phone: ${safe(org.phone)}`)
  if (org?.email) contact.push(`Email: ${safe(org.email)}`)
  if (contact.length) {
    doc.text(contact.join(' | '), headerLeftX, detailY)
    detailY += 3.5
  }
  if (org?.gstin) {
    doc.text(`GSTIN: ${safe(org.gstin)}`, headerLeftX, detailY)
  }

  y += 18

  // Title with primary color
  doc.setFontSize(14)
  doc.setFont(fontHeading, 'bold')
  doc.setTextColor(primaryColor)
  doc.text('PAYMENT RECEIPT', pageWidth / 2, y + 4, { align: 'center' })
  y += 10
  doc.setTextColor(0)

  // ---- First Box (Receipt Info & Payment Info) ----
  const box1X = margin, box1Y = y, box1Width = pageWidth - 2 * margin, box1Height = 18
  doc.setDrawColor(0); doc.setLineWidth(0.3); doc.rect(box1X, box1Y, box1Width, box1Height)
  const midX1 = box1X + box1Width * 0.5
  doc.line(midX1, box1Y, midX1, box1Y + box1Height)

  // Left side: Receipt Details
  const left1X = box1X + 4; let left1Y = box1Y + 3
  doc.setFontSize(9); doc.setFont(fontHeading, 'bold'); doc.setTextColor(primaryColor)
  doc.text('Receipt Details', left1X, left1Y)
  left1Y += 5
  doc.setFontSize(7); doc.setFont(fontBody, 'normal'); doc.setTextColor(0)
  doc.text(`Receipt No: ${safe(receipt?.receipt_no)}`, left1X, left1Y); left1Y += 3.5
  doc.text(`Date: ${safe(receipt?.receipt_date)}`, left1X, left1Y); left1Y += 3.5
  doc.text(`Invoice Ref: ${safe(receipt?.invoice_number || 'N/A')}`, left1X, left1Y)

  // Right side: Payment Info
  const right1X = box1X + box1Width - 4; let right1Y = box1Y + 3
  doc.setFontSize(8); doc.setFont(fontHeading, 'bold'); doc.setTextColor(primaryColor)
  doc.text('Payment Info', right1X, right1Y, { align: 'right' }); right1Y += 5
  doc.setFont(fontBody, 'normal'); doc.setTextColor(0)
  doc.text(`Amount: Rs. ${Number(receipt?.amount || 0).toFixed(2)}`, right1X, right1Y, { align: 'right' }); right1Y += 4
  doc.text(`Mode: ${safe(receipt?.payment_mode || 'N/A')}`, right1X, right1Y, { align: 'right' }); right1Y += 4
  doc.text(`Transaction No: ${safe(receipt?.transaction_no || 'N/A')}`, right1X, right1Y, { align: 'right' })
  y = box1Y + box1Height

  // ---- Second Box (Received from) ----
  const box2X = margin, box2Y = y, box2Width = pageWidth - 2 * margin, box2Height = 26
  doc.setDrawColor(0); doc.setLineWidth(0.3); doc.rect(box2X, box2Y, box2Width, box2Height)
  const midX2 = box2X + box2Width * 0.5
  doc.line(midX2, box2Y, midX2, box2Y + box2Height)

  const billX = box2X + 4; let billY = box2Y + 3
  doc.setFontSize(8); doc.setFont(fontHeading, 'bold'); doc.setTextColor(primaryColor)
  doc.text('Received from:', billX, billY); billY += 4
  doc.setFont(fontBody, 'normal'); doc.setTextColor(0)
  doc.text(`Name: ${safe(receipt?.student_name)}`, billX, billY); billY += 3.5

  const address = safe(receipt?.student_address || '')
  const addressLines = doc.splitTextToSize(address, 40)
  const firstLine = addressLines[0] || ''
  const secondLine = addressLines.length > 1 ? addressLines.slice(1).join(' ') : ''
  const cityState = `${safe(receipt?.student_city)} ${safe(receipt?.student_state)} - ${safe(receipt?.student_pincode)}`.trim()

  doc.text(`Address: ${firstLine}`, billX, billY); billY += 3.5
  if (secondLine) { doc.text(secondLine, billX + 10, billY); billY += 3.5 }
  if (cityState) { doc.text(cityState, billX, billY); billY += 3.5 }
  doc.text(`Mobile: ${safe(receipt?.student_mobile)}`, billX, billY)

  // Right side (kept blank but you could add a note)
  const noteX = midX2 + 4; let noteY = box2Y + 3
  doc.setFont(fontBody, 'italic'); doc.setTextColor(100)
  
  doc.setTextColor(0)

  y = box2Y + box2Height

  // ---- ITEMS TABLE ----
  const invoice = receipt?.invoices || {}
  let items = invoice?.invoice_items || []

  if (!items || items.length === 0) {
    const amount = Number(receipt?.amount || 0)
    const base = Number(receipt?.fee_payments?.[0]?.base_amount || amount)
    const tax = Number(receipt?.fee_payments?.[0]?.tax_amount || 0)
    const cgst = Number(invoice?.total_cgst || 0)
    const sgst = Number(invoice?.total_sgst || 0)
    const igst = Number(invoice?.total_igst || 0)
    const hasInvTax = (cgst + sgst + igst) > 0

    let effCgst=0, effSgst=0, effIgst=0, effBase=base, effTotal=amount
    if (hasInvTax) {
      effCgst = cgst; effSgst = sgst; effIgst = igst
      effBase = Number(invoice?.total_taxable_amount || base)
      effTotal = Number(invoice?.grand_total || amount)
    } else if (tax > 0) {
      effIgst = tax
      effBase = base || (amount - tax)
      effTotal = amount
    }

    items = [{
      description: 'Payment Receipt',
      hsn_sac_code: '9992',
      quantity: 1,
      unit_price: effTotal,
      taxable_amount: effBase,
      cgst_amount: effCgst,
      sgst_amount: effSgst,
      igst_amount: effIgst,
      total_amount: effTotal,
    }]
  }

  const tableHeaders = ['Sr', 'Description', 'HSN', 'Qty', 'Rate', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total']
  const tableRows = items.map((item, idx) => {
    const taxable = Number(item?.taxable_amount || 0)
    const qty = Number(item?.quantity || 1)
    const cgst = Number(item?.cgst_amount || 0)
    const sgst = Number(item?.sgst_amount || 0)
    const igst = Number(item?.igst_amount || 0)
    const total = Number(item?.total_amount || 0)
    const rate = Number(item?.unit_price || 0)
    return [
      idx + 1,
      item?.description || '',
      item?.hsn_sac_code || '-',
      qty.toFixed(0),
      `Rs. ${rate.toFixed(2)}`,
      `Rs. ${taxable.toFixed(2)}`,
      `Rs. ${cgst.toFixed(2)}`,
      `Rs. ${sgst.toFixed(2)}`,
      `Rs. ${igst.toFixed(2)}`,
      `Rs. ${total.toFixed(2)}`,
    ]
  })

  const totalTaxable = items.reduce((s, i) => s + Number(i.taxable_amount || 0), 0)
  const totalCGST = items.reduce((s, i) => s + Number(i.cgst_amount || 0), 0)
  const totalSGST = items.reduce((s, i) => s + Number(i.sgst_amount || 0), 0)
  const totalIGST = items.reduce((s, i) => s + Number(i.igst_amount || 0), 0)
  const grandTotal = items.reduce((s, i) => s + Number(i.total_amount || 0), 0)

  const subtotalRow = [
    '', 'Sub-Total:', '',
    items.length.toString(),
    '',
    `Rs. ${totalTaxable.toFixed(2)}`,
    `Rs. ${totalCGST.toFixed(2)}`,
    `Rs. ${totalSGST.toFixed(2)}`,
    `Rs. ${totalIGST.toFixed(2)}`,
    `Rs. ${grandTotal.toFixed(2)}`,
  ]

  const allRows = [...tableRows, subtotalRow]

  autoTable(doc, {
    startY: y + 2,
    head: [tableHeaders],
    body: allRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 6, cellPadding: 1.2, textColor: 0, lineColor: 0, lineWidth: 0.1, font: fontBody },
    headStyles: { fillColor: false, textColor: primaryColor, fontStyle: 'bold', lineColor: 0, lineWidth: 0.2, font: fontHeading },
    bodyStyles: { fillColor: false, textColor: 0, lineColor: 0, lineWidth: 0.1, font: fontBody },
    rowStyles: (row, data) => row === data.table.body.length - 1 ? { fontStyle: 'bold', lineWidth: 0.2 } : {},
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 18, halign: 'right' },
      8: { cellWidth: 18, halign: 'right' },
      9: { cellWidth: 22, halign: 'right' },
    },
    theme: 'plain',
    didDrawPage: (data) => { y = data.cursor.y + 2 },
  })

  // ---- Third Box (Amount in words + Signature) ----
  const box3X = margin, box3Y = y, box3Width = pageWidth - 2 * margin, box3Height = 20
  doc.setDrawColor(0); doc.setLineWidth(0.3); doc.rect(box3X, box3Y, box3Width, box3Height)
  const midX3 = box3X + box3Width * 0.5
  doc.line(midX3, box3Y, midX3, box3Y + box3Height)

  const wordsX = box3X + 4; let wordsY = box3Y + 4
  doc.setFontSize(8); doc.setFont(fontHeading, 'bold'); doc.setTextColor(primaryColor)
  doc.text('Amount in Words:', wordsX, wordsY); wordsY += 4
  doc.setFont(fontBody, 'normal'); doc.setTextColor(0)
  const amountInWords = numberToWords(Number(receipt?.amount || 0))
  doc.text(amountInWords || 'Zero Rupees Only', wordsX, wordsY)

  const signX = midX3 + 4; let signY = box3Y + 6
  doc.setFontSize(8); doc.setFont(fontHeading, 'bold'); doc.setTextColor(primaryColor)
  doc.text('Authorised Signatory', signX, signY); signY += 6
  doc.setFont(fontBody, 'normal'); doc.setTextColor(0)
  doc.text('____________________', signX, signY)

  const footY = pageHeight - 6
  doc.setFontSize(6); doc.setFont(fontBody, 'italic'); doc.setTextColor(100)
  doc.text('This is a system-generated receipt.', margin, footY)
  doc.text('Thank you for your payment!', pageWidth - margin, footY, { align: 'right' })

  if (options?.returnBlob === true) return doc.output('blob')
  else doc.save(`Receipt_${receipt?.receipt_no || 'receipt'}.pdf`)
}