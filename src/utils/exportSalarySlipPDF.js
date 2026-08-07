// src/utils/exportSalarySlipPDF.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs from 'dayjs'
import { montserratRegularBase64, montserratBoldBase64 } from './fonts'

export const exportSalarySlipPDF = (employee, salaryData, org, theme, options = {}) => {
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
  const margin = 14
  let y = 10

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = 'Montserrat'
  const fontBody = 'Montserrat'

  // ────────── Header (Logo + Company) ──────────
  const logoWidth = 22, logoHeight = 14
  let headerLeftX = margin

  const logoUrl = org?.logo_dark_url || org?.logo_light_url || null
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 'PNG', margin, y, logoWidth, logoHeight, undefined, 'FAST')
      headerLeftX = margin + logoWidth + 4
    } catch (e) {}
  }

  doc.setFontSize(12)
  doc.setFont(fontHeading, 'bold')
  doc.setTextColor(primaryColor)
  doc.text(org?.company_name || 'Academy', headerLeftX, y + 5)

  doc.setFontSize(7)
  doc.setFont(fontBody, 'normal')
  doc.setTextColor(0)
  let detailY = y + 10
  if (org?.address) {
    doc.text(org.address, headerLeftX, detailY)
    detailY += 3.5
  }
  const contact = []
  if (org?.phone) contact.push(`Phone: ${org.phone}`)
  if (org?.email) contact.push(`Email: ${org.email}`)
  if (contact.length) {
    doc.text(contact.join(' | '), headerLeftX, detailY)
    detailY += 3.5
  }
  if (org?.gstin) doc.text(`GSTIN: ${org.gstin}`, headerLeftX, detailY)

  y += 18

  // ────────── Title ──────────
  doc.setFontSize(16)
  doc.setFont(fontHeading, 'bold')
  doc.setTextColor(primaryColor)
  doc.text('SALARY SLIP', pageWidth / 2, y + 4, { align: 'center' })
  y += 12
  doc.setTextColor(0)

  // ────────── Employee & Period Box ──────────
  const box1X = margin, box1Y = y, box1Width = pageWidth - 2 * margin, box1Height = 20
  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.rect(box1X, box1Y, box1Width, box1Height)
  const midX1 = box1X + box1Width * 0.6
  doc.line(midX1, box1Y, midX1, box1Y + box1Height)

  const left1X = box1X + 4
  let left1Y = box1Y + 4
  doc.setFontSize(8)
  doc.setFont(fontHeading, 'bold')
  doc.text(`Employee: ${employee.first_name} ${employee.last_name}`, left1X, left1Y)
  left1Y += 4
  doc.setFont(fontBody, 'normal')
  doc.text(`Code: ${employee.employee_code || '-'}`, left1X, left1Y)
  left1Y += 4
  doc.text(`Designation: ${employee.designation || '-'}`, left1X, left1Y)
  left1Y += 4
  doc.text(`Department: ${employee.department || '-'}`, left1X, left1Y)

  const right1X = box1X + box1Width - 4
  let right1Y = box1Y + 4
  doc.setFont(fontHeading, 'bold')
  doc.text(`Period: ${salaryData.month || '-'}`, right1X, right1Y, { align: 'right' })
  right1Y += 4
  doc.setFont(fontBody, 'normal')
  doc.text(`Salary Type: ${employee.salary_type === 'fixed' ? 'Fixed' : 'Lecture Based'}`, right1X, right1Y, { align: 'right' })
  right1Y += 4
  doc.text(`Payment Mode: ${salaryData.payment_mode || '-'}`, right1X, right1Y, { align: 'right' })
  right1Y += 4
  doc.text(`Payment Date: ${salaryData.payment_date || '-'}`, right1X, right1Y, { align: 'right' })

  y = box1Y + box1Height + 4

  // ────────── Salary Breakdown Table ──────────
  const isFixed = employee.salary_type === 'fixed'

  const rows = []
  if (isFixed) {
    rows.push(['Total Working Days', salaryData.workingDays || '-'])
    rows.push(['Holidays', salaryData.holidays || '-'])
    rows.push(['Absences', salaryData.absentCount || 0])
    rows.push(['Leaves (Unpaid)', salaryData.leaveDays || 0])
    rows.push(['Half Days', salaryData.halfDayCount || 0])
    rows.push(['Present Days', salaryData.presentDays || '-'])
  } else {
    rows.push(['Total Lectures', salaryData.lectureCount || 0])
    rows.push(['Demo Sessions', salaryData.demoCount || 0])
    rows.push(['Per Lecture Rate', `Rs. ${employee.per_lecture_rate || 0}`])
  }

  rows.push(['Monthly Salary', `Rs. ${(isFixed ? employee.monthly_salary || 0 : salaryData.gross || 0).toFixed(2)}`])
  rows.push(['Gross Pay', `Rs. ${(salaryData.gross || 0).toFixed(2)}`])
  rows.push(['TDS Deduction', `Rs. ${(salaryData.tds || 0).toFixed(2)}`])
  rows.push(['Net Pay', `Rs. ${(salaryData.net || 0).toFixed(2)}`])

  autoTable(doc, {
    startY: y,
    body: rows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2, font: fontBody },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 'auto', halign: 'right' },
    },
    theme: 'grid',
  })

  // ✅ Fix: use doc.lastAutoTable.finalY instead of doc.previousAutoTable.finalY
  y = doc.lastAutoTable.finalY + 6

  // ────────── Amount in Words ──────────
  doc.setFontSize(9)
  doc.setFont(fontHeading, 'bold')
  doc.setTextColor(primaryColor)
  doc.text('Amount in Words:', margin, y)
  y += 5
  doc.setFont(fontBody, 'normal')
  doc.setTextColor(0)
  doc.text(salaryData.amountInWords || '', margin, y)
  y += 10

  // ────────── Signature ──────────
  const signX = pageWidth - margin - 60
  doc.setFontSize(9)
  doc.setFont(fontHeading, 'bold')
  doc.text('Authorised Signatory', signX, y, { align: 'right' })
  y += 8
  doc.setFont(fontBody, 'normal')
  doc.text('____________________', signX, y, { align: 'right' })

  // ────────── Footer ──────────
  const footY = pageHeight - 10
  doc.setFontSize(7)
  doc.setTextColor('#999')
  doc.text('This is a computer-generated document.', margin, footY)

  if (options?.returnBlob) return doc.output('blob')
  doc.save(`Salary_Slip_${employee.first_name}_${employee.last_name}_${salaryData.month}.pdf`)
}