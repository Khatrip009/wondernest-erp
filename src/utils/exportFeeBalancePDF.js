// src/utils/exportFeeBalancePDF.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { montserratRegularBase64, montserratBoldBase64 } from './fonts'

export const exportFeeBalancePDF = (data, org, theme, filters = {}, options = {}) => {
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

  const pageWidth = 210
  const pageHeight = 297
  const margin = 10
  const topMargin = 38
  let y = topMargin

  const primaryColor = theme?.primary_color || '#0D47A1'
  const headingFont = 'Montserrat'
  const bodyFont = 'Montserrat'

  // ---------- Letterhead ----------
  if (org?.letterhead_url) {
    try {
      doc.addImage(org.letterhead_url, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
    } catch (e) {}
  }

  // ---------- Title ----------
  doc.setFontSize(18)
  doc.setFont(headingFont, 'bold')
  doc.setTextColor(primaryColor)
  doc.text('STUDENT FEE BALANCE REPORT', pageWidth / 2, y + 8, { align: 'center' })
  y += 16

  // ---------- Info Box ----------
  const boxX = margin
  const boxY = y
  const boxWidth = pageWidth - 2 * margin
  const boxHeight = 32
  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.rect(boxX, boxY, boxWidth, boxHeight)

  const midX = boxX + boxWidth * 0.6
  doc.line(midX, boxY, midX, boxY + boxHeight)

  // Left: Organization details
  const leftX = boxX + 4
  let leftY = boxY + 5
  doc.setFontSize(10)
  doc.setFont(headingFont, 'bold')
  doc.text(org?.company_name || '', leftX, leftY)
  leftY += 5
  doc.setFontSize(7)
  doc.setFont(bodyFont, 'normal')
  doc.setTextColor(0)
  if (org?.address) {
    doc.text(org.address, leftX, leftY)
    leftY += 4
  }
  if (org?.phone || org?.email) {
    const contact = []
    if (org?.phone) contact.push(`Phone: ${org.phone}`)
    if (org?.email) contact.push(`Email: ${org.email}`)
    doc.text(contact.join(' | '), leftX, leftY)
    leftY += 4
  }
  if (org?.gstin) doc.text(`GSTIN: ${org.gstin}`, leftX, leftY)

  // Right: Report info
  const rightX = boxX + boxWidth - 4
  let rightY = boxY + 5
  doc.setFontSize(9)
  doc.setFont(headingFont, 'bold')
  doc.setTextColor(primaryColor)
  doc.text('Report Details', rightX, rightY, { align: 'right' })
  rightY += 5
  doc.setFontSize(7)
  doc.setFont(bodyFont, 'normal')
  doc.setTextColor(0)
  doc.text(`Branch: ${filters.branchName || 'All'}`, rightX, rightY, { align: 'right' })
  rightY += 4
  doc.text(`Financial Year: ${filters.financialYearName || 'All'}`, rightX, rightY, { align: 'right' })
  rightY += 4
  if (filters.courseName) {
    doc.text(`Course: ${filters.courseName}`, rightX, rightY, { align: 'right' })
    rightY += 4
  }
  if (filters.batchName) {
    doc.text(`Batch: ${filters.batchName}`, rightX, rightY, { align: 'right' })
    rightY += 4
  }
  if (filters.startDate) {
    doc.text(`Period: ${filters.startDate} – ${filters.endDate}`, rightX, rightY, { align: 'right' })
    rightY += 4
  }
  doc.text(`Date: ${new Date().toLocaleDateString()}`, rightX, rightY, { align: 'right' })
  rightY += 4
  doc.text(`Total Students: ${data.length}`, rightX, rightY, { align: 'right' })

  y = boxY + boxHeight + 4

  // ---------- Table (bordered, Rs. prefix) ----------
  const tableHeaders = ['#', 'Admission No', 'Student Name', 'Mobile', 'Total Fees', 'Paid', 'Balance']
  const tableRows = data.map((s, i) => [
    i + 1,
    s.admission_no,
    s.student_name,
    s.mobile,
    `Rs. ${(s.total_fee ?? 0).toLocaleString('en-IN')}`,
    `Rs. ${(s.paid ?? 0).toLocaleString('en-IN')}`,
    `Rs. ${(s.balance ?? 0).toLocaleString('en-IN')}`,
  ])

  // Totals row
  const totalFees = data.reduce((sum, s) => sum + (s.total_fee || 0), 0)
  const totalPaid = data.reduce((sum, s) => sum + (s.paid || 0), 0)
  const totalBalance = data.reduce((sum, s) => sum + (s.balance || 0), 0)
  tableRows.push([
    '', '', 'TOTAL', '', 
    `Rs. ${totalFees.toLocaleString('en-IN')}`,
    `Rs. ${totalPaid.toLocaleString('en-IN')}`,
    `Rs. ${totalBalance.toLocaleString('en-IN')}`,
  ])

  autoTable(doc, {
    startY: y,
    head: [tableHeaders],
    body: tableRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2, textColor: 0, font: bodyFont },  // ✅ added font
    headStyles: { fillColor: primaryColor, textColor: '#ffffff', fontStyle: 'bold', font: bodyFont },
    bodyStyles: { fillColor: false, textColor: 0, font: bodyFont },
    rowStyles: (row) => {
      if (row === tableRows.length - 1) return { fontStyle: 'bold', fillColor: '#f0f0f0', font: bodyFont }
      return {}
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 25, halign: 'left' },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 30, halign: 'left' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
      6: { cellWidth: 28, halign: 'right' },
    },
    theme: 'grid',
  })

  // ---------- Footer ----------
  const footY = pageHeight - 10
  doc.setFontSize(7)
  doc.setFont(bodyFont, 'italic')
  doc.setTextColor(100)
  doc.text('This is a system-generated report.', margin, footY)
  doc.text(new Date().toLocaleString(), pageWidth - margin, footY, { align: 'right' })

  if (options?.returnBlob === true) return doc.output('blob')
  else doc.save('student-fee-balance-report.pdf')
}