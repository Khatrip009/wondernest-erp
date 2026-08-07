// src/utils/exportAdmissionPDF.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { montserratRegularBase64, montserratBoldBase64 } from './fonts'

export const exportAdmissionPDF = async (student, org = {}, theme = {}, options = {}) => {
  try {
    const doc = new jsPDF('p', 'mm', 'a4')

    // ----- Register Montserrat fonts -----
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
    const margin = 15
    const contentWidth = pageWidth - 2 * margin
    let y = 10
    const primaryColor = theme?.primary_color || '#0D47A1'
    const orange = '#FF8C00'

    // ---------- Helper functions ----------
    const drawCheckbox = (x, y, checked = false, size = 4, color = primaryColor) => {
      doc.setDrawColor(color)
      doc.setLineWidth(0.3)
      doc.rect(x, y, size, size)
      if (checked) {
        doc.setFillColor(color)
        doc.rect(x + 0.5, y + 0.5, size - 1, size - 1, 'F')
      }
    }

    const drawRadio = (x, y, selected = false, size = 3.5, color = primaryColor) => {
      doc.setDrawColor(color)
      doc.setLineWidth(0.3)
      doc.circle(x + size / 2, y + size / 2, size / 2)
      if (selected) {
        doc.setFillColor(color)
        doc.circle(x + size / 2, y + size / 2, size / 2 - 1, 'F')
      }
    }

    const drawValueBox = (x, y, w, h, text) => {
      doc.setDrawColor(180)
      doc.setLineWidth(0.2)
      doc.rect(x, y, w, h)
      doc.setFontSize(9)
      doc.setTextColor(0)
      doc.setFont('Montserrat', 'normal')
      doc.text(text || '', x + 2, y + h / 2 + 1.5, { maxWidth: w - 4 })
    }

    // ==================== PAGE 1 – FORM ====================
    // ---- Header ----
    const leftRectWidth = 36
    const leftRectHeight = 40
    const leftRectX = margin
    const leftRectY = y

    // Orange contact strip
    const contactRectH = 10
    const contactRectY = leftRectY + leftRectHeight - contactRectH
    doc.setFillColor(255, 140, 0)
    doc.rect(margin, contactRectY, pageWidth - 2 * margin, contactRectH, 'F')
    doc.setFontSize(7.5)
    doc.setTextColor(255, 255, 255)
    doc.setFont('Montserrat', 'normal')
    const contactLines = []
    if (org?.phone) contactLines.push(`Helpline: ${org.phone}`)
    if (org?.email) contactLines.push(`Email: ${org.email}`)
    if (org?.website) contactLines.push(`Website: ${org.website}`)
    const contactText = contactLines.join('   |   ')
    doc.text(contactText, pageWidth / 2, contactRectY + contactRectH / 2 + 1.5, { align: 'center' })

    // Primary color rectangle
    doc.setFillColor(primaryColor)
    doc.rect(leftRectX, leftRectY, leftRectWidth, leftRectHeight, 'F')

    // Logo
    const logoMaxW = leftRectWidth - 6
    const logoMaxH = 14
    const logoX = leftRectX + (leftRectWidth - logoMaxW) / 2
    const logoY = leftRectY + 7
    if (org?.logo_light_url) {
      try {
        doc.addImage(org.logo_light_url, 'PNG', logoX, logoY, logoMaxW, logoMaxH)
      } catch (e) {
        doc.setFontSize(7)
        doc.setTextColor(255, 255, 255)
        doc.setFont('Montserrat', 'bold')
        doc.text('LOGO', leftRectX + leftRectWidth / 2, logoY + 8, { align: 'center' })
      }
    }

    // Social media text
    const smY = logoY + logoMaxH + 4
    doc.setFontSize(5)
    doc.setTextColor(255, 255, 255)
    doc.setFont('Montserrat', 'normal')
    doc.text('f    in    @', leftRectX + leftRectWidth / 2, smY + 1.5, { align: 'center' })

    // Company name
    const coNameY = smY + 5
    doc.setFontSize(5.5)
    doc.setTextColor(255, 255, 255)
    doc.setFont('Montserrat', 'bold')
    doc.text(org?.company_name || '', leftRectX + leftRectWidth / 2, coNameY, { align: 'center' })

    // ADMISSION FORM title
    const titleY = leftRectY + 12
    doc.setFontSize(28)
    doc.setTextColor(primaryColor)
    doc.setFont('Montserrat', 'bold')
    doc.text('ADMISSION FORM', pageWidth / 2, titleY, { align: 'center' })

    // Subtitle
    const subTitleY = titleY + 8
    doc.setFontSize(8)
    doc.setTextColor(80)
    doc.setFont('Montserrat', 'normal')
    const subTextLines = [
      'Abacus | Phonics | Grammar | Basic Language Course For Gujarati & Hindi',
      'Vedic Maths | Wonder Brains | English Communication & Fluency | Python',
      'Handwriting | GSEB / CBSE (Std. Jr Kg. to 10th - Eng / Guj Medium)'
    ]
    doc.text(subTextLines, pageWidth / 2, subTitleY, { align: 'center' })

    y = leftRectY + leftRectHeight + 3

    // Student photo
    if (student.photo_url) {
      const photoSize = 28
      const photoX = pageWidth - margin - photoSize
      const photoY = leftRectY + 4
      try {
        doc.addImage(student.photo_url, 'JPEG', photoX, photoY, photoSize, photoSize)
      } catch (e) {
        doc.setFillColor(240, 240, 240)
        doc.rect(photoX, photoY, photoSize, photoSize, 'F')
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.setFont('Montserrat', 'normal')
        doc.text('Photo', photoX + photoSize / 2, photoY + photoSize / 2 + 2, { align: 'center' })
      }
    }

    // ---- 1. STUDENT INFORMATION ----
    doc.setFontSize(13)
    doc.setTextColor(primaryColor)
    doc.setFont('Montserrat', 'bold')
    doc.text('Student Information', margin, y)
    y += 5

    doc.setFontSize(10)
    doc.setTextColor(primaryColor)
    doc.setFont('Montserrat', 'normal')
    doc.text(`Adm. Form No: ${student.admission_form_number || '-'}`, pageWidth / 2, y, { align: 'center' })
    y += 5

    const colLeftX = margin
    const colRightX = margin + contentWidth / 2 + 6
    const colWidth = (contentWidth / 2) - 6
    const labelH = 4
    const valueH = 7
    const rowGap = 6

    // Row 1: Full Name | DOB
    doc.setFontSize(9)
    doc.setTextColor(primaryColor)
    doc.setFont('Montserrat', 'bold')
    doc.text('Full Name:', colLeftX, y)
    y += labelH
    drawValueBox(colLeftX, y, colWidth, valueH, student.full_name_formatted || '')
    const row1Y = y
    y += valueH + rowGap

    const rightY = row1Y
    doc.setFontSize(9)
    doc.setTextColor(primaryColor)
    doc.setFont('Montserrat', 'bold')
    doc.text('Date of Birth:', colRightX, rightY - labelH)
    let dobText = student.dob ? new Date(student.dob).toLocaleDateString('en-IN') : ''
    drawValueBox(colRightX, rightY, colWidth, valueH, dobText || '-')

    // Row 2: Age | Gender
    doc.setFontSize(9)
    doc.setTextColor(primaryColor)
    doc.setFont('Montserrat', 'bold')
    doc.text('Age:', colLeftX, y)
    y += labelH
    drawValueBox(colLeftX, y, colWidth, valueH, student.age || '')
    const row2Y = y
    y += valueH + rowGap

    const genderY = row2Y
    doc.setFontSize(9)
    doc.setTextColor(primaryColor)
    doc.setFont('Montserrat', 'bold')
    doc.text('Gender:', colRightX, genderY - labelH)

    const genderOptions = [
      { label: 'Male', value: 'M' },
      { label: 'Female', value: 'F' },
      { label: 'Other', value: 'O' }
    ]
    const checkboxSize = 3.5
    const genderStartX = colRightX
    const genderStartY = genderY + 1
    const genderGap = 14
    genderOptions.forEach((opt, idx) => {
      const cx = genderStartX + idx * (checkboxSize + genderGap)
      const cy = genderStartY
      doc.setDrawColor(0)
      doc.setLineWidth(0.3)
      doc.rect(cx, cy, checkboxSize, checkboxSize)
      if ((student.gender || '').toUpperCase() === opt.value) {
        doc.setFillColor(primaryColor)
        doc.rect(cx + 0.5, cy + 0.5, checkboxSize - 1, checkboxSize - 1, 'F')
      }
      doc.setFontSize(9)
      doc.setTextColor(0)
      doc.setFont('Montserrat', 'normal')
      doc.text(opt.label, cx + checkboxSize + 2, cy + 2.5)
    })

    // Row 3: School | Class
    doc.setFontSize(9)
    doc.setTextColor(primaryColor)
    doc.setFont('Montserrat', 'bold')
    doc.text('School Name:', colLeftX, y)
    y += labelH
    drawValueBox(colLeftX, y, colWidth, valueH, student.school_name || '')
    const row3Y = y
    y += valueH + rowGap

    const classY = row3Y
    doc.setFontSize(9)
    doc.setTextColor(primaryColor)
    doc.setFont('Montserrat', 'bold')
    doc.text('Class/Grade:', colRightX, classY - labelH)
    drawValueBox(colRightX, classY, colWidth, valueH, student.standard || '')
    y = row3Y + valueH + 4

    // ---- 2. PARENT/GUARDIAN INFORMATION ----
    doc.setFontSize(13)
    doc.setTextColor(primaryColor)
    doc.setFont('Montserrat', 'bold')
    doc.text('Parent/Guardian Information', margin, y)
    y += 5

    // Row 1: Name | Relationship
    doc.setFontSize(9)
    doc.setTextColor(primaryColor)
    doc.setFont('Montserrat', 'bold')
    doc.text('Parent/Guardian Name:', colLeftX, y)
    y += labelH
    drawValueBox(colLeftX, y, colWidth, valueH, student.parent_name || student.father_name || '')
    const parentRow1Y = y
    y += valueH + rowGap

    const relY = parentRow1Y
    doc.setFontSize(9)
    doc.setTextColor(primaryColor)
    doc.setFont('Montserrat', 'bold')
    doc.text('Relationship:', colRightX, relY - labelH)
    drawValueBox(colRightX, relY, colWidth, valueH, student.relation || '')

    // Row 2: Contact | Email
    doc.setFontSize(9)
    doc.setTextColor(primaryColor)
    doc.setFont('Montserrat', 'bold')
    doc.text('Contact No:', colLeftX, y)
    y += labelH
    drawValueBox(colLeftX, y, colWidth, valueH, student.parent_mobile || student.mobile || '')
    const parentRow2Y = y
    y += valueH + rowGap

    const emailY = parentRow2Y
    doc.setFontSize(9)
    doc.setTextColor(primaryColor)
    doc.setFont('Montserrat', 'bold')
    doc.text('Email Address:', colRightX, emailY - labelH)
    drawValueBox(colRightX, emailY, colWidth, valueH, student.parent_email || '')

    // Row 3: Address
    doc.setFontSize(9)
    doc.setTextColor(primaryColor)
    doc.setFont('Montserrat', 'bold')
    doc.text('Residential Address:', colLeftX, y)
    y += labelH
    const addressText = student.parent_address || student.address || ''
    const addressLines = doc.splitTextToSize(addressText, pageWidth - 2 * margin - 4)
    const addressBoxHeight = valueH * 2
    doc.setDrawColor(180)
    doc.setLineWidth(0.2)
    doc.rect(margin, y, pageWidth - 2 * margin, addressBoxHeight)
    doc.setFontSize(9)
    doc.setTextColor(0)
    doc.setFont('Montserrat', 'normal')
    doc.text(addressLines, margin + 2, y + addressBoxHeight / 2 + 1.5, { maxWidth: pageWidth - 2 * margin - 4 })
    y += addressBoxHeight + 4

    // ---- Background fill for lower sections ----
    const backgroundStartY = y - 4
    doc.setFillColor(primaryColor)
    doc.rect(margin, backgroundStartY, pageWidth - 2 * margin, pageHeight - backgroundStartY - 10, 'F')

    const drawSectionHeading = (text, yPos) => {
      doc.setFontSize(11)
      doc.setFont('Montserrat', 'bold')
      const textWidth = doc.getTextWidth(text)
      const boxPadding = 4
      const boxWidth = textWidth + boxPadding * 2
      const boxHeight = 8
      doc.setFillColor(orange)
      doc.rect(margin, yPos, boxWidth, boxHeight, 'F')
      doc.setTextColor(255, 255, 255)
      doc.text(text, margin + boxPadding, yPos + boxHeight / 2 + 1.5)
      return yPos + boxHeight + 3
    }

    // ---- Course Selection ----
    y = drawSectionHeading('Course Selection', y)
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.setFont('Montserrat', 'normal')
    doc.text('Please select the courses you wish to enroll your child in:', margin, y)
    y += 2

    let courseItems = (options.courses || []).map(item => ({
      name: item.display,
      checked: item.checked
    }))
    if (courseItems.length === 0) {
      const fallbackCourses = [
        'Abacus', 'Phonics', 'Grammar', 'Basic Gujarati & Hindi Language',
        'Vedic Maths', 'Wonder Brains', 'English Communication & Fluency',
        'Python', 'Handwriting', 'GSEB / CBSE'
      ]
      const selectedNames = student.course_names ? student.course_names.split(',').map(n => n.trim()) : []
      courseItems = fallbackCourses.map(name => ({
        name,
        checked: selectedNames.includes(name)
      }))
    }

    const courseLineHeight = 6
    const courseCheckSize = 3.5
    let courseX = margin
    let courseY = y
    courseItems.forEach((item, idx) => {
      const col = idx % 2
      const row = Math.floor(idx / 2)
      courseX = col === 0 ? margin : margin + contentWidth / 2 + 5
      courseY = y + row * (courseLineHeight + 1)
      drawCheckbox(courseX, courseY + 1, item.checked, courseCheckSize, '#ffffff')
      doc.setFontSize(8)
      doc.setTextColor(255, 255, 255)
      doc.setFont('Montserrat', 'normal')
      doc.text(item.name, courseX + courseCheckSize + 3, courseY + 3)
    })
    y += Math.ceil(courseItems.length / 2) * (courseLineHeight + 2)

    // ---- Preferred Batch Timing ----
    y = drawSectionHeading('Preferred Batch Timing', y)
    const timings = ['Morning', 'Afternoon', 'Evening']
    const selectedTiming = student.preferred_batch_timing || ''
    timings.forEach((label, idx) => {
      const x = margin + idx * 50
      const selected = label === selectedTiming
      drawRadio(x, y + 1, selected, 3.5, '#ffffff')
      doc.setFontSize(8)
      doc.setTextColor(255, 255, 255)
      doc.setFont('Montserrat', 'normal')
      doc.text(label, x + 6, y + 4)
    })
    y += 6

    // ---- Declaration ----
    y = drawSectionHeading('Declaration', y)
    doc.setFontSize(8.5)
    doc.setTextColor(255, 255, 255)
    doc.setFont('Montserrat', 'normal')
    const declarationText = 'I hereby declare that all information provided above is accurate and complete to the best of my knowledge. I understand and agree to the terms and conditions set by the organization.'
    const decLines = doc.splitTextToSize(declarationText, contentWidth)
    doc.text(decLines, margin, y)
    y += decLines.length * 5 + 4

    // Signature & Date
    const sigY = y
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.setFont('Montserrat', 'normal')
    doc.text('Parent/Guardian Signature:', margin + 35, sigY)
    doc.setDrawColor(255, 255, 255)
    doc.line(margin + 85, sigY + 1, margin + 150, sigY + 1)
    doc.text(`Date: ${student.joining_date ? new Date(student.joining_date).toLocaleDateString() : ''}`, margin + 155, sigY)

    // ==================== PAGE 2 – TERMS & CONDITIONS ====================
    doc.addPage()

    // ---- Re‑draw a simplified header (same style) ----
    const headerHeight = 22
    const headerY = 10
    // Primary bar
    doc.setFillColor(primaryColor)
    doc.rect(margin, headerY, leftRectWidth, headerHeight, 'F')
    // Logo
    const logo2W = leftRectWidth - 6
    const logo2H = 10
    const logo2X = leftRectX + (leftRectWidth - logo2W) / 2
    const logo2Y = headerY + 2
    if (org?.logo_light_url) {
      try {
        doc.addImage(org.logo_light_url, 'PNG', logo2X, logo2Y, logo2W, logo2H)
      } catch (e) { /* fallback text if needed */ }
    }
    // Company name next to logo
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.setFont('Montserrat', 'bold')
    doc.text(org?.company_name || '', margin + leftRectWidth + 5, headerY + 11)

    // Orange strip at bottom of header
    doc.setFillColor(orange)
    doc.rect(margin, headerY + headerHeight - 4, pageWidth - 2 * margin, 4, 'F')

    let termsY = headerY + headerHeight + 8

    // Title
    doc.setFontSize(14)
    doc.setTextColor(primaryColor)
    doc.setFont('Montserrat', 'bold')
    doc.text('Terms & Conditions', margin, termsY)
    termsY += 10

    // Terms text – split into bullet points
    const termsText = [
      "The admission process for various courses and programs offered by the Institute is conducted as per the norms and criteria prescribed by Wondernest Learning Hub LLP, and the relevant authorities.",
      "The admission process may involve entrance tests, interviews, or other methods of selection as decided by the Institute.",
      "The admission process is binding and final. No requests for cancellation or refund of fees will be entertained after the admission is confirmed.",
      "The fee payment schedule for various courses and programs offered by the Institute is specified at the time of admission. All parties are expected to adhere to the fee payment schedule and pay their fees on time.",
      "The fee payment mode for various courses and programs offered by the Institute may include cash, cheque, demand draft, online transfer, or any other method as approved by the Institute.",
      "The fee payment receipt issued by the Institute is a valid proof of payment. All parties are advised to keep their fee payment receipts safely for future reference.",
      "The fee payment defaulters may face penalties such as late fees, interest charges, suspension of services or facilities, cancellation of admission or enrollment, withholding of results or certificates, or legal action as per the discretion of the Institute management.",
      "The fee payment refunds may be allowed in exceptional cases such as death or disability of a student or staff member, withdrawal of a course or program by the Institute, or any other reason as deemed valid by the Institute management. All parties who wish to claim such refunds must apply in writing with supporting documents to the Institute management within the stipulated time frame.",
      "The course structure for various courses and programs offered by the Institute is designed as per the curriculum and guidelines provided by Wondernest Learning Hub LLP, and the relevant authorities.",
      "The course duration for various courses and programs offered by the Institute is specified at the time of admission. All parties are expected to complete their courses or programs within the prescribed duration. Any extension or exemption may be granted on valid grounds as per the discretion of the Institute management or Wondernest Learning Hub LLP.",
      "The attendance policy for various courses and programs offered by the Institute is mandatory and monitored regularly. All parties are required to maintain a minimum attendance of 85% in each course or program. Any shortfall in attendance may result in loss of marks, detention, debarment, or expulsion as per the discretion of the Institute management.",
      "The discipline policy for various courses and programs offered by the Institute is aimed at maintaining a conducive and respectful learning environment that fosters academic excellence, innovation, and social responsibility. All parties are expected to behave in a manner that is courteous, cooperative, honest, and respectful at all times."
    ]

    doc.setFontSize(8)
    doc.setTextColor(50)
    doc.setFont('Montserrat', 'normal')

    const maxWidth = pageWidth - 2 * margin - 10   // a little indent for bullet
    termsText.forEach((paragraph) => {
      const lines = doc.splitTextToSize(`•  ${paragraph}`, maxWidth)
      lines.forEach(line => {
        if (termsY > pageHeight - 30) {   // add new page if running out of space
          doc.addPage()
          termsY = 10
        }
        doc.text(line, margin + 5, termsY)
        termsY += 5
      })
      termsY += 2   // space after each paragraph
    })

    // Jurisdiction line
    termsY += 4
    doc.setFontSize(9)
    doc.setFont('Montserrat', 'bold')
    doc.text('Subject to jurisdiction of Valsad only', margin + 5, termsY)
    termsY += 8

    // Signatures
    const signY = termsY + 5
    doc.setFontSize(9)
    doc.setTextColor(0)
    doc.setFont('Montserrat', 'normal')
    doc.text('Authorised Signature', margin + 5, signY)
    doc.line(margin + 5, signY + 4, margin + 65, signY + 4)

    doc.text('Parents/Guardian Signature', margin + 100, signY)
    doc.line(margin + 100, signY + 4, margin + 160, signY + 4)

    // ==================== OUTPUT ====================
    const { returnBlob = false } = options
    if (returnBlob) {
      return doc.output('blob')
    } else {
      doc.save(`AdmissionForm_${student.admission_no || student.id}.pdf`)
    }
  } catch (error) {
    console.error('PDF generation failed:', error)
    alert('Failed to generate PDF. Check console for details.')
    return null
  }
}