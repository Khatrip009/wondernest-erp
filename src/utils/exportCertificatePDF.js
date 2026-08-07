import jsPDF from 'jspdf'
import { customFonts } from './pdfFonts'   // adjust path if needed

// Helper to register custom fonts on the jsPDF instance
const registerCustomFonts = (doc) => {
  const styleMap = {
    normal: 'normal',
    bold: 'bold',
    italics: 'italic',
    bolditalics: 'bolditalic',
  }
  Object.entries(customFonts).forEach(([family, styles]) => {
    Object.entries(styles).forEach(([key, base64]) => {
      const style = styleMap[key]
      const fileName = `${family}-${style}.ttf`
      doc.addFileToVFS(fileName, base64)
      doc.addFont(family, style, fileName)
    })
  })
}

export const exportCertificatePDF = (certificate, org, theme, options = {}) => {
  const doc = new jsPDF('p', 'mm', 'a4')
  // Register custom fonts (Canela etc.) before any text
  registerCustomFonts(doc)

  const pageWidth = 210
  const pageHeight = 297
  const margin = 20

  // Use theme fonts or fallback to Times (a standard serif similar to certificate style)
  const headingFont = theme?.font_heading || 'times'
  const bodyFont = theme?.font_body || 'times'

  // Set background/border
  doc.setDrawColor(0, 80, 150)
  doc.setLineWidth(2)
  doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin)

  // Inner border
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.5)
  doc.rect(margin + 5, margin + 5, pageWidth - 2 * margin - 10, pageHeight - 2 * margin - 10)

  // Title
  doc.setFontSize(28)
  doc.setTextColor(0, 80, 150)
  doc.setFont(headingFont, 'bold')
  doc.text('CERTIFICATE', pageWidth / 2, 50, { align: 'center' })

  // Subtitle
  doc.setFontSize(14)
  doc.setTextColor(100)
  doc.setFont(bodyFont, 'italic')
  doc.text('of Achievement', pageWidth / 2, 60, { align: 'center' })

  // Line
  doc.setDrawColor(0, 80, 150)
  doc.setLineWidth(1)
  doc.line(70, 65, 140, 65)

  // Body
  doc.setFontSize(14)
  doc.setTextColor(0)
  doc.setFont(bodyFont, 'normal')
  const studentName = certificate.student_name || 'Student'
  const courseName = certificate.course_name || 'Course'
  const levelName = certificate.level_name || ''
  const issueDate = certificate.issue_date || new Date().toISOString().split('T')[0]

  const text1 = `This is to certify that`
  const text2 = `${studentName}`
  const text3 = `has successfully completed the`
  const text4 = `${courseName}${levelName ? ` - ${levelName}` : ''}`
  const text5 = `on ${issueDate}`

  doc.text(text1, pageWidth / 2, 95, { align: 'center' })
  doc.setFontSize(22)
  doc.setFont(headingFont, 'bold')
  doc.text(text2, pageWidth / 2, 110, { align: 'center' })
  doc.setFontSize(14)
  doc.setFont(bodyFont, 'normal')
  doc.text(text3, pageWidth / 2, 130, { align: 'center' })
  doc.setFontSize(18)
  doc.setFont(headingFont, 'bold')
  doc.text(text4, pageWidth / 2, 145, { align: 'center' })
  doc.setFontSize(14)
  doc.setFont(bodyFont, 'normal')
  doc.text(text5, pageWidth / 2, 165, { align: 'center' })

  // Certificate number
  doc.setFontSize(10)
  doc.setTextColor(150)
  doc.setFont(bodyFont, 'normal')
  doc.text(`Certificate No: ${certificate.certificate_no || 'N/A'}`, 20, 280)

  // Signature
  doc.setFontSize(12)
  doc.setTextColor(0)
  doc.setFont(bodyFont, 'normal')
  doc.text('Authorised Signatory', pageWidth - 50, 270, { align: 'center' })
  doc.line(pageWidth - 80, 275, pageWidth - 20, 275)

  // Seal / Logo
  if (org?.logo_light_url) {
    try {
      doc.addImage(org.logo_light_url, 'PNG', pageWidth / 2 - 20, 180, 40, 40)
    } catch (e) {}
  }

  if (options?.returnBlob === true) {
    return doc.output('blob')
  } else {
    doc.save(`Certificate_${certificate.certificate_no || 'certificate'}.pdf`)
    return null
  }
}