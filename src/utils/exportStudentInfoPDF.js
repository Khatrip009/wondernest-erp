// src/utils/exportStudentInfoPDF.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const exportStudentInfoPDF = (student, org = {}, theme = {}) => {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 18
  const contentWidth = pageWidth - 2 * margin
  let y = 20

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = 'helvetica'
  const fontBody = 'helvetica'

  // ---- Letterhead as background ----
  if (org?.letterhead_url) {
    try {
      doc.addImage(org.letterhead_url, 'PNG', 0, 0, pageWidth, pageHeight)
    } catch (e) {
      // fallback if image fails
    }
  } else {
    // fallback header
    doc.setFontSize(16)
    doc.setTextColor(primaryColor)
    doc.setFont(fontHeading, 'bold')
    doc.text(org?.company_name || 'Organization Name', pageWidth / 2, y, { align: 'center' })
    y += 8
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.setFont(fontBody, 'normal')
    if (org?.phone) doc.text(`Helpline: ${org.phone}`, pageWidth / 2, y, { align: 'center' })
    y += 5
    if (org?.email) doc.text(`Email: ${org.email}`, pageWidth / 2, y, { align: 'center' })
    y += 5
    if (org?.website) doc.text(`Website: ${org.website}`, pageWidth / 2, y, { align: 'center' })
    y += 8
  }

  // ---- Title ----
  doc.setFontSize(20)
  doc.setTextColor(primaryColor)
  doc.setFont(fontHeading, 'bold')
  doc.text('STUDENT INFORMATION FORM', pageWidth / 2, y, { align: 'center' })
  y += 10

  // ---- Admission Form Number ----
  doc.setFontSize(12)
  doc.setTextColor(primaryColor)
  doc.setFont(fontHeading, 'bold')
  const formNumber = student.admission_form_number || 'Not Assigned'
  doc.text(`Admission Form No: ${formNumber}`, pageWidth / 2, y, { align: 'center' })
  y += 8

  // ---- Student Details ----
  const fields = [
    ['Student Name:', student.full_name_formatted || '-'],
    ['Age:', student.age || '-'],
    ['Gender:', student.gender || '-'],
    ['Date of Birth:', student.dob ? new Date(student.dob).toLocaleDateString() : '-'],
    ['Mobile:', student.mobile || '-'],
    ['Email:', student.email || '-'],
    ['School Name:', student.school_name || '-'],
    ['Standard/Class:', student.standard || '-'],
    ['Board:', student.board || '-'],
  ]

  autoTable(doc, {
    startY: y,
    body: fields,
    margin: { left: margin, right: margin },
    styles: { fontSize: 10, font: fontBody, lineColor: [200, 200, 200], lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold', textColor: primaryColor },
      1: { cellWidth: 'auto' },
    },
    tableWidth: contentWidth,
    theme: 'plain',
    bodyStyles: { fillColor: null },
    didDrawPage: (data) => {
      y = data.cursor.y + 6
    },
  })

  // ---- Parent Details ----
  doc.setFontSize(11)
  doc.setTextColor(primaryColor)
  doc.setFont(fontHeading, 'bold')
  doc.text('Parent / Guardian Information', margin, y)
  y += 5

  const parentFields = [
    ['Parent Name:', student.parent_name || student.father_name || '-'],
    ['Relationship:', student.parent_relationship || '-'],
    ['Contact:', student.parent_mobile || student.mobile || '-'],
    ['Email:', student.parent_email || '-'],
    ['Address:', student.parent_address || student.address || '-'],
  ]

  autoTable(doc, {
    startY: y,
    body: parentFields,
    margin: { left: margin, right: margin },
    styles: { fontSize: 10, font: fontBody, lineColor: [200, 200, 200], lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold', textColor: primaryColor },
      1: { cellWidth: 'auto' },
    },
    tableWidth: contentWidth,
    theme: 'plain',
    bodyStyles: { fillColor: null },
    didDrawPage: (data) => {
      y = data.cursor.y + 6
    },
  })

  // ---- Additional Info ----
  doc.setFontSize(11)
  doc.setTextColor(primaryColor)
  doc.setFont(fontHeading, 'bold')
  doc.text('Additional Information', margin, y)
  y += 5

  doc.setFontSize(9)
  doc.setTextColor(0)
  doc.setFont(fontBody, 'normal')
  doc.text(`Special Learning Requirements: ${student.special_learning_needs || 'None'}`, margin, y)
  y += 5
  doc.text(`Goals / Expectations: ${student.goals || '—'}`, margin, y)
  y += 10

  // ---- Attachment instruction ----
  doc.setFontSize(9)
  doc.setTextColor(80)
  doc.setFont(fontBody, 'italic')
  doc.text(
    'Please attach this form with the manual admission form for the student.',
    margin, pageHeight - 20,
    { maxWidth: contentWidth }
  )

  doc.save(`StudentInfo_${student.admission_no || student.id}.pdf`)
}