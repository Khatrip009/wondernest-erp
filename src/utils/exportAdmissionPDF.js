// src/utils/exportAdmissionPDF.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Export a student's admission form as PDF – matches the sample image layout
 * @param {Object} student - Student data
 * @param {Object} org - Organization data
 * @param {Object} theme - Theme object
 * @param {Object} options - { returnBlob: boolean }
 * @returns {Blob|null} - If returnBlob is true, returns the PDF blob; otherwise saves directly.
 */
export const exportAdmissionPDF = (student, org = {}, theme = {}, options = {}) => {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - 2 * margin
  let y = 20

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = 'helvetica'
  const fontBody = 'helvetica'

  // ---- Helper: draw checkbox ----
  const drawCheckbox = (x, y, checked = false, size = 4) => {
    doc.setDrawColor(0)
    doc.setLineWidth(0.3)
    doc.rect(x, y, size, size)
    if (checked) {
      doc.setFillColor(primaryColor)
      doc.rect(x + 0.5, y + 0.5, size - 1, size - 1, 'F')
    }
  }

  // ---- Helper: draw radio ----
  const drawRadio = (x, y, selected = false, size = 3.5) => {
    doc.setDrawColor(0)
    doc.setLineWidth(0.3)
    doc.circle(x + size / 2, y + size / 2, size / 2)
    if (selected) {
      doc.setFillColor(primaryColor)
      doc.circle(x + size / 2, y + size / 2, size / 2 - 1, 'F')
    }
  }

  // ==================== HEADER ====================
  // ---- Logo (top-left, dark square background) ----
  const logoSize = 25
  const logoX = margin
  const logoY = y

  // Dark square background for logo
  doc.setFillColor(40, 40, 60) // dark color
  doc.rect(logoX, logoY, logoSize, logoSize, 'F')

  if (org?.logo_light_url) {
    try {
      doc.addImage(org.logo_light_url, 'PNG', logoX + 2, logoY + 2, logoSize - 4, logoSize - 4)
    } catch (e) {
      doc.setFontSize(8)
      doc.setTextColor(255, 255, 255)
      doc.setFont(fontHeading, 'bold')
      doc.text('LOGO', logoX + logoSize / 2, logoY + logoSize / 2 + 3, { align: 'center' })
    }
  } else {
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.setFont(fontHeading, 'bold')
    doc.text('LOGO', logoX + logoSize / 2, logoY + logoSize / 2 + 3, { align: 'center' })
  }

  // ---- Company Name (next to logo) ----
  const textX = logoX + logoSize + 8
  doc.setFontSize(14)
  doc.setTextColor(primaryColor)
  doc.setFont(fontHeading, 'bold')
  doc.text(org?.company_name || 'Organization Name', textX, y + 8)

  // ---- Subtitle / Tagline ----
  doc.setFontSize(8)
  doc.setTextColor(80)
  doc.setFont(fontBody, 'normal')
  const courseSubtitle = 'Abacus | Phonics | Grammar | Basic Language Course For Gujarati & Hindi | Vedic Maths | Wonder Brains | English Communication & Fluency | Python | Handwriting | GSEB / CBSE'
  const subtitleLines = doc.splitTextToSize(courseSubtitle, contentWidth - logoSize - 8)
  doc.text(subtitleLines, textX, y + 12)

  // ---- Contact Info (right side) ----
  const contactY = y
  const rightX = pageWidth - margin
  doc.setFontSize(7.5)
  doc.setTextColor(100)
  doc.setFont(fontBody, 'normal')
  let contactLines = []
  if (org?.phone) contactLines.push(`Helpline: ${org.phone}`)
  if (org?.email) contactLines.push(`Email: ${org.email}`)
  if (org?.website) contactLines.push(`Website: ${org.website}`)
  contactLines.forEach((line, idx) => {
    doc.text(line, rightX, contactY + idx * 5, { align: 'right' })
  })

  y = y + logoSize + 10

  // ==================== TITLE ====================
  doc.setFontSize(18)
  doc.setTextColor(primaryColor)
  doc.setFont(fontHeading, 'bold')
  doc.text('ADMISSION FORM', pageWidth / 2, y, { align: 'center' })
  y += 10

  // ==================== 1. STUDENT INFORMATION ====================
  doc.setFontSize(11)
  doc.setTextColor(primaryColor)
  doc.setFont(fontHeading, 'bold')
  doc.text('Student Information', margin, y)
  y += 5

  const studentFields = [
    ['Full Name:', student.full_name_formatted || '-'],
    ['Age:', student.age || '-'],
    ['School Name:', student.school_name || '-'],
  ]

  autoTable(doc, {
    startY: y,
    body: studentFields,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, font: fontBody, lineColor: [200, 200, 200], lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold', textColor: primaryColor },
      1: { cellWidth: 'auto' },
    },
    tableWidth: contentWidth,
    theme: 'plain',
    bodyStyles: { fillColor: null },
    didDrawPage: (data) => {
      y = data.cursor.y + 4
    },
  })

  // ==================== 2. PARENT/GUARDIAN ====================
  doc.setFontSize(11)
  doc.setTextColor(primaryColor)
  doc.setFont(fontHeading, 'bold')
  doc.text('Parent/Guardian Information', margin, y)
  y += 5

  const parentFields = [
    ['Parent/Guardian Name:', student.parent_name || student.father_name || '-'],
    ['Contact Number:', student.parent_mobile || student.mobile || '-'],
    ['Residential Address:', student.parent_address || student.address || '-'],
  ]

  autoTable(doc, {
    startY: y,
    body: parentFields,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, font: fontBody, lineColor: [200, 200, 200], lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold', textColor: primaryColor },
      1: { cellWidth: 'auto' },
    },
    tableWidth: contentWidth,
    theme: 'plain',
    bodyStyles: { fillColor: null },
    didDrawPage: (data) => {
      y = data.cursor.y + 4
    },
  })

  // ==================== 3. COURSE SELECTION ====================
  doc.setFontSize(11)
  doc.setTextColor(primaryColor)
  doc.setFont(fontHeading, 'bold')
  doc.text('Course Selection:', margin, y)
  y += 4

  doc.setFontSize(8)
  doc.setTextColor(80)
  doc.setFont(fontBody, 'normal')
  doc.text('Please select the courses you wish to enroll your child in:', margin, y)
  y += 6

  const allCourses = [
    'Abacus', 'Phonics', 'Grammar', 'Basic Gujarati & Hindi Language',
    'Vedic Maths', 'Wonder Brains', 'English Communication & Fluency',
    'Python', 'Handwriting', 'GSEB / CBSE'
  ]
  const selectedCourses = student.course_names ? student.course_names.split(',') : []
  const checkboxSize = 4
  const lineHeight = 8
  let xPos = margin
  let yPos = y

  allCourses.forEach((item, idx) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    xPos = col === 0 ? margin : margin + contentWidth / 2 + 5
    yPos = y + row * (lineHeight + 2)
    const checked = selectedCourses.includes(item)
    drawCheckbox(xPos, yPos + 1, checked, checkboxSize)
    doc.setFontSize(8)
    doc.setTextColor(0)
    doc.setFont(fontBody, 'normal')
    doc.text(item, xPos + checkboxSize + 3, yPos + 4)
  })
  y = y + Math.ceil(allCourses.length / 2) * (lineHeight + 4) + 6

  // ==================== 4. PREFERRED BATCH TIMING ====================
  doc.setFontSize(11)
  doc.setTextColor(primaryColor)
  doc.setFont(fontHeading, 'bold')
  doc.text('Preferred Batch Timing:', margin, y)
  y += 5

  const timings = ['Morning', 'Afternoon', 'Evening']
  const selectedTiming = student.preferred_batch_timing || ''
  timings.forEach((label, idx) => {
    const x = margin + idx * 50
    const selected = label === selectedTiming
    drawRadio(x, y + 1, selected)
    doc.setFontSize(8)
    doc.setTextColor(0)
    doc.setFont(fontBody, 'normal')
    doc.text(label, x + 6, y + 4)
  })
  y += 10

  // ==================== 5. ADDITIONAL INFORMATION ====================
  doc.setFontSize(11)
  doc.setTextColor(primaryColor)
  doc.setFont(fontHeading, 'bold')
  doc.text('Additional Information:', margin, y)
  y += 5

  const specialNeeds = student.special_learning_needs || 'No'
  const goals = student.goals || ''

  doc.setFontSize(8.5)
  doc.setTextColor(0)
  doc.setFont(fontBody, 'normal')
  doc.text(`Does your child have any special learning requirements? ${specialNeeds}`, margin, y)
  y += 6
  doc.text(`Any specific goals or expectations from this class? ${goals || '—'}`, margin, y)
  y += 10

  // ==================== 6. DECLARATION ====================
  doc.setFontSize(10)
  doc.setTextColor(primaryColor)
  doc.setFont(fontHeading, 'bold')
  doc.text('Declaration:', margin, y)
  y += 5

  doc.setFontSize(8.5)
  doc.setTextColor(0)
  doc.setFont(fontBody, 'normal')
  const declarationText = 'I hereby declare that all information provided above is accurate and complete to the best of my knowledge. I understand and agree to the terms and conditions set by the organization.'
  const decLines = doc.splitTextToSize(declarationText, contentWidth)
  doc.text(decLines, margin, y)
  y += decLines.length * 5 + 6

  // ---- Signature and Date ----
  const sigY = y
  doc.setFontSize(9)
  doc.setTextColor(0)
  doc.setFont(fontBody, 'normal')
  doc.text('Parent/Guardian Signature:', margin + 35, sigY)
  doc.line(margin + 85, sigY + 1, margin + 150, sigY + 1)
  doc.text(`Date: ${student.joining_date ? new Date(student.joining_date).toLocaleDateString() : ''}`, margin + 155, sigY)

  // ---- Return blob or save ----
  const { returnBlob = false } = options
  if (returnBlob) {
    return doc.output('blob')
  } else {
    doc.save(`AdmissionForm_${student.admission_no || student.id}.pdf`)
    return null
  }
}