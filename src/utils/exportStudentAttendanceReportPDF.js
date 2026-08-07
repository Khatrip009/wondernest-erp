// src/utils/exportStudentAttendanceReportPDF.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { montserratRegularBase64, montserratBoldBase64 } from './fonts'

export const exportStudentAttendanceReportPDF = ({
  branchName,
  date,
  records,
  organization = {},
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
  const margin = 14
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

  // ---- Title ----
  doc.setFont(fontHeading, 'bold')
  doc.setFontSize(16)
  doc.setTextColor(primaryColor)
  doc.text('Student Attendance Report', pageWidth / 2, y, { align: 'center' })
  y += 10

  // ---- Branch & Date ----
  doc.setFont(fontBody, 'normal')
  doc.setFontSize(11)
  doc.setTextColor('#000')
  doc.text(`Branch: ${branchName || 'All Branches'}`, margin, y)
  y += 6
  doc.text(`Date: ${date}`, margin, y)
  y += 10

  // ---- Table ----
  const headers = [
    'No.', 'Student Name', 'Course', 'Topic',
    'Start Time', 'End Time', 'Teacher Name',
  ]

  const rows = (records || []).map((r, idx) => [
    idx + 1,
    r.studentName || '-',
    r.course || '-',
    r.topic || '-',
    r.startTime || '-',
    r.endTime || '-',
    r.teacherName || '-',
  ])

  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows,
    margin: { left: margin, right: margin },
    styles: { font: fontBody, fontSize: 8, cellPadding: 2, textColor: 0, lineColor: 200, lineWidth: 0.1 },
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', lineColor: primaryColor, lineWidth: 0.2 },
    bodyStyles: { fillColor: false, textColor: 0 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 30, halign: 'left' },
      3: { cellWidth: 35, halign: 'left' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 30, halign: 'left' },
    },
    theme: 'grid',
  })

  y = doc.lastAutoTable.finalY + 8

  // ---- Total Students ----
  doc.setFont(fontHeading, 'bold')
  doc.setFontSize(10)
  doc.setTextColor(primaryColor)
  doc.text(`Total Students: ${records.length}`, margin, y)

  // ---- Footer ----
  const footerY = pageHeight - 8
  doc.setFont(fontBody, 'normal')
  doc.setFontSize(7)
  doc.setTextColor('#666')
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, footerY, { align: 'left' })
  doc.text('Page 1 of 1', pageWidth - margin, footerY, { align: 'right' })

  doc.save(`Student_Attendance_${date.replace(/\//g, '_')}.pdf`)
}