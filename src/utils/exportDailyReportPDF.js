// src/utils/exportDailyReportPDF.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { montserratRegularBase64, montserratBoldBase64 } from './fonts'

export const exportDailyReportPDF = ({
  date,
  organization = {},
  openingBalances = { cash: 0, online: 0 },
  creditEntries = [],
  debitEntries = [],
  inventoryInward = [],
  inventoryOutward = [],
  theme = {},
}) => {
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
  const margin = 12
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = 'Montserrat'
  const fontBody = 'Montserrat'

  // ---- Letterhead background ----
  if (organization?.letterhead_url) {
    try {
      doc.addImage(organization.letterhead_url, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
    } catch (e) { /* ignore */ }
  }

  let y = 45

  // ---- Top Right Note ----
  doc.setFont(fontHeading, 'bold')
  doc.setFontSize(12)
  doc.setTextColor(primaryColor)
  
  doc.setFont(fontBody, 'normal')
  doc.setFontSize(10)
  doc.text(`Date: ${date}`, pageWidth - margin, y - 14, { align: 'right' })

  // ---- Credit (CR) Table ----
  doc.setFont(fontHeading, 'bold')
  doc.setFontSize(12)
  doc.setTextColor(primaryColor)
  doc.text('Credit (CR)', margin, y)
  y += 6

  const crHeaders = ['No.', 'CR Amount', 'Description', 'Mode']
  const crRows = []
  let crCashTotal = 0
  let crOnlineTotal = 0

  // Opening balance – display only, not added to running total
  crRows.push([
    '1',
    `Rs. ${openingBalances.cash.toFixed(2)}`,
    'Opening Balance',
    'Cash',
  ])

  // Actual credit entries
  creditEntries.forEach((entry, idx) => {
    const amount = Number(entry.amount || 0)
    crRows.push([
      (idx + 2).toString(),
      `Rs. ${amount.toFixed(2)}`,
      entry.description || '',
      entry.mode || 'Cash',
    ])
    if (entry.mode === 'Online') {
      crOnlineTotal += amount
    } else {
      crCashTotal += amount
    }
  })

  crRows.push(['', '', 'CR. Cash: Rs. ' + crCashTotal.toFixed(2), ''])
  crRows.push(['', '', 'CR. Online: Rs. ' + crOnlineTotal.toFixed(2), ''])

  autoTable(doc, {
    startY: y,
    head: [crHeaders],
    body: crRows,
    margin: { left: margin, right: margin },
    styles: { font: fontBody, fontSize: 8, cellPadding: 2, textColor: 0, lineColor: 0, lineWidth: 0.1 },
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', lineColor: primaryColor, lineWidth: 0.2 },
    bodyStyles: { fillColor: false, textColor: 0, lineColor: 0, lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 30, halign: 'right' },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 20, halign: 'center' },
    },
    theme: 'grid',
  })

  y = doc.lastAutoTable.finalY + 6

  // ---- Debit (DR) Table ----
  doc.setFont(fontHeading, 'bold')
  doc.setFontSize(12)
  doc.setTextColor(primaryColor)
  doc.text('Debit (DR)', margin, y)
  y += 6

  const drHeaders = ['No.', 'DR Amount', 'Description', 'Mode']
  const drRows = []
  let drCashTotal = 0
  let drOnlineTotal = 0

  if (debitEntries.length === 0) {
    drRows.push(['1', '', '', ''])
  } else {
    debitEntries.forEach((entry, idx) => {
      const amount = Number(entry.amount || 0)
      drRows.push([
        (idx + 1).toString(),
        `Rs. ${amount.toFixed(2)}`,
        entry.description || '',
        entry.mode || 'Cash',
      ])
      if (entry.mode === 'Online') {
        drOnlineTotal += amount
      } else {
        drCashTotal += amount
      }
    })
  }

  drRows.push(['', '', 'DR. Cash: Rs. ' + drCashTotal.toFixed(2), ''])
  drRows.push(['', '', 'DR. Online: Rs. ' + drOnlineTotal.toFixed(2), ''])

  autoTable(doc, {
    startY: y,
    head: [drHeaders],
    body: drRows,
    margin: { left: margin, right: margin },
    styles: { font: fontBody, fontSize: 8, cellPadding: 2, textColor: 0, lineColor: 0, lineWidth: 0.1 },
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', lineColor: primaryColor, lineWidth: 0.2 },
    bodyStyles: { fillColor: false, textColor: 0, lineColor: 0, lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 30, halign: 'right' },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 20, halign: 'center' },
    },
    theme: 'grid',
  })

  y = doc.lastAutoTable.finalY + 6

  // ---- Closing Balances ----
  const closingCash = openingBalances.cash + crCashTotal - drCashTotal
  const closingOnline = openingBalances.online + crOnlineTotal - drOnlineTotal

  doc.setFont(fontHeading, 'bold')
  doc.setFontSize(11)
  doc.setTextColor(primaryColor)
  doc.text('Closing Balances', margin, y)
  y += 6
  doc.setFont(fontBody, 'normal')
  doc.setFontSize(9)
  doc.setTextColor('#000')
  doc.text(`Closing Balance Cash: Rs. ${closingCash.toFixed(2)}`, margin, y)
  y += 5
  doc.text(`Closing Balance Online: Rs. ${closingOnline.toFixed(2)}`, margin, y)
  y += 8

  // ---- Raw Material Inward-Outward Data ----
  if (inventoryInward.length > 0 || inventoryOutward.length > 0) {
    doc.setFont(fontHeading, 'bold')
    doc.setFontSize(12)
    doc.setTextColor(primaryColor)
    doc.text('Raw Material Inward-Outward Data', margin, y)
    y += 6

    const invHeaders = ['Date', 'Inward', 'Date', 'Outward']
    const maxLen = Math.max(inventoryInward.length, inventoryOutward.length)
    const invRows = []
    for (let i = 0; i < maxLen; i++) {
      const inward = inventoryInward[i] || {}
      const outward = inventoryOutward[i] || {}
      invRows.push([
        inward.date || '',
        inward.description || '',
        outward.date || '',
        outward.description || '',
      ])
    }

    autoTable(doc, {
      startY: y,
      head: [invHeaders],
      body: invRows,
      margin: { left: margin, right: margin },
      styles: { font: fontBody, fontSize: 8, cellPadding: 2, textColor: 0, lineColor: 0, lineWidth: 0.1 },
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', lineColor: primaryColor, lineWidth: 0.2 },
      bodyStyles: { fillColor: false, textColor: 0, lineColor: 0, lineWidth: 0.1 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30 },
        3: { cellWidth: 'auto' },
      },
      theme: 'grid',
    })
  }

  // ---- Footer ----
  const footerY = pageHeight - 8
  doc.setFont(fontBody, 'normal')
  doc.setFontSize(7)
  doc.setTextColor('#666')
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, footerY, { align: 'left' })
  doc.text('Page 1 of 1', pageWidth - margin, footerY, { align: 'right' })

  doc.save(`Daily_Report_${date.replace(/\//g, '_')}.pdf`)
}