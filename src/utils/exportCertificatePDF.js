// src/utils/exportCertificatePDF.js
import jsPDF from 'jspdf'
import {
  montserratRegularBase64,
  montserratBoldBase64,
  cazelaBoldBase64,
  cazelaLightBase64,
} from './fonts'

const fetchImageAsBase64 = async (url) => {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) throw new Error('Not an image')
    const blob = await res.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.warn('Logo fetch failed:', err.message, 'URL:', url)
    return null
  }
}

const drawMonogram = (doc, text, x, y, size, primaryColor) => {
  doc.setFillColor(primaryColor)
  doc.circle(x, y, size / 2, 'F')
  doc.setTextColor('#ffffff')
  doc.setFontSize(size * 0.5)
  doc.setFont('Montserrat', 'bold')
  const initials = text.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  doc.text(initials || 'A', x, y, { align: 'center', baseline: 'middle' })
}

export const exportCertificatePDF = async (certificate, org, theme, options = {}) => {
  const doc = new jsPDF('p', 'mm', 'a4')

  // Register Montserrat (body)
  if (!doc.getFontList()?.Montserrat) {
    doc.addFileToVFS('Montserrat-Regular.ttf', montserratRegularBase64)
    doc.addFont('Montserrat-Regular.ttf', 'Montserrat', 'normal')
  }
  if (!doc.getFontList()?.MontserratBold) {
    doc.addFileToVFS('Montserrat-Bold.ttf', montserratBoldBase64)
    doc.addFont('Montserrat-Bold.ttf', 'Montserrat', 'bold')
  }

  // Register Cazela (heading) – fallback to Montserrat on failure
let fontHeading = 'Montserrat';
try {
  if (cazelaBoldBase64) {
    doc.addFileToVFS('Cazela-Bold.ttf', cazelaBoldBase64);
    doc.addFont('Cazela-Bold.ttf', 'Cazela', 'bold');
    // Check if the font now exists in the internal list
    if (doc.getFontList()?.Cazela) {
      fontHeading = 'Cazela';
      if (cazelaLightBase64) {
        doc.addFileToVFS('Cazela-Light.ttf', cazelaLightBase64);
        doc.addFont('Cazela-Light.ttf', 'Cazela', 'normal');
      }
    } else {
      console.warn('Cazela Bold not registered – using Montserrat');
    }
  }
} catch (e) {
  console.warn('Cazela registration failed, using Montserrat:', e);
  fontHeading = 'Montserrat';
}

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15

  const fontBody = 'Montserrat'
  const primaryColor = theme?.primary_color || '#0D47A1'
  const secondaryColor = theme?.accent_color || '#FF1070'
  const darkText = '#333333'
  const lightText = '#666666'

  // Borders
  doc.setDrawColor(primaryColor)
  doc.setLineWidth(2)
  doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin)
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.5)
  doc.rect(margin + 4, margin + 4, pageWidth - 2 * margin - 8, pageHeight - 2 * margin - 8)

  // Logo
  const logoCandidates = [org?.logo_dark_url, org?.logo_light_url, org?.logo_url].filter(Boolean)
  let logoBase64 = null
  for (const url of logoCandidates) {
    const result = await fetchImageAsBase64(url)
    if (result) {
      logoBase64 = result
      break
    }
  }

  if (!logoBase64 && logoCandidates.length > 0) {
    try {
      doc.addImage(logoCandidates[0], 'PNG', pageWidth / 2 - 17.5, 22, 35, 20, undefined, 'FAST')
      logoBase64 = true
    } catch (e) {}
  }

  if (logoBase64 === true) {
    // direct addImage worked
  } else if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 17.5, 22, 35, 20, undefined, 'FAST')
    } catch (e) {
      drawMonogram(doc, org?.company_name || 'A', pageWidth / 2, 32, 20, primaryColor)
    }
  } else {
    drawMonogram(doc, org?.company_name || 'A', pageWidth / 2, 32, 20, primaryColor)
  }

  // Organization name (Cazela)
  doc.setFontSize(22)
  doc.setTextColor(primaryColor)
  doc.setFont(fontHeading, 'bold')
  doc.text(org?.company_name || 'Academy', pageWidth / 2, 50, { align: 'center' })

  // Contact
  doc.setFontSize(9)
  doc.setTextColor(lightText)
  doc.setFont(fontBody, 'normal')
  let contactY = 56
  if (org?.address) {
    doc.text(org.address, pageWidth / 2, contactY, { align: 'center' })
    contactY += 4
  }
  const contactParts = []
  if (org?.phone) contactParts.push(`Phone: ${org.phone}`)
  if (org?.email) contactParts.push(`Email: ${org.email}`)
  if (org?.website) contactParts.push(`Web: ${org.website}`)
  if (contactParts.length) doc.text(contactParts.join('   |   '), pageWidth / 2, contactY, { align: 'center' })

  // Certificate title
  doc.setFontSize(30)
  doc.setTextColor(primaryColor)
  doc.setFont(fontHeading, 'bold')
  doc.text('CERTIFICATE', pageWidth / 2, 88, { align: 'center' })

  doc.setFontSize(14)
  doc.setTextColor(secondaryColor)
  doc.setFont(fontBody, 'italic')
  doc.text('OF ACHIEVEMENT', pageWidth / 2, 98, { align: 'center' })

  doc.setDrawColor(secondaryColor)
  doc.setLineWidth(1)
  doc.line(85, 103, 125, 103)

  // Student name
  doc.setFontSize(13)
  doc.setTextColor(darkText)
  doc.setFont(fontBody, 'normal')
  doc.text('This is to certify that', pageWidth / 2, 115, { align: 'center' })

  doc.setFontSize(24)
  doc.setTextColor(primaryColor)
  doc.setFont(fontHeading, 'bold')
  doc.text(certificate.student_name || 'Student', pageWidth / 2, 128, { align: 'center' })

  doc.setDrawColor(primaryColor)
  doc.setLineWidth(0.8)
  doc.line(pageWidth / 2 - 50, 133, pageWidth / 2 + 50, 133)

  // Course / level
  doc.setFontSize(13)
  doc.setTextColor(darkText)
  doc.setFont(fontBody, 'normal')
  doc.text('has successfully completed the course', pageWidth / 2, 145, { align: 'center' })

  doc.setFontSize(18)
  doc.setTextColor(secondaryColor)
  doc.setFont(fontHeading, 'bold')
  const courseText = certificate.course_name
    ? `${certificate.course_name}${certificate.level_name ? ` - ${certificate.level_name}` : ''}`
    : 'Course'
  doc.text(courseText, pageWidth / 2, 158, { align: 'center' })

  // Date
  doc.setFontSize(12)
  doc.setTextColor(lightText)
  doc.setFont(fontBody, 'normal')
  const issueDate = certificate.issue_date || new Date().toISOString().split('T')[0]
  const formattedDate = new Date(issueDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  doc.text(`Date: ${formattedDate}`, pageWidth / 2, 172, { align: 'center' })

  // Certificate number
  doc.setFontSize(9)
  doc.setTextColor(lightText)
  doc.setFont(fontBody, 'normal')
  doc.text(`Certificate No: ${certificate.certificate_no || 'N/A'}`, 18, pageHeight - 20)

  // Signature
  const signatureY = 205
  doc.setFontSize(12)
  doc.setTextColor(darkText)
  doc.setFont(fontBody, 'bold')
  doc.text('Authorised Signatory', 40, signatureY, { align: 'left' })
  doc.line(30, signatureY + 5, 70, signatureY + 5)
  doc.setFontSize(9)
  doc.setTextColor(lightText)
  doc.setFont(fontBody, 'normal')
  doc.text('Signature', 40, signatureY + 10, { align: 'left' })

  // Seal
  if (logoBase64 && logoBase64 !== true) {
    try { doc.addImage(logoBase64, 'PNG', 155, signatureY - 15, 25, 25, undefined, 'FAST') } catch (e) {}
  } else {
    drawMonogram(doc, org?.company_name || 'A', 167, signatureY - 2, 18, primaryColor)
  }

  // Bottom line
  doc.setDrawColor(primaryColor)
  doc.setLineWidth(1)
  doc.line(margin + 10, pageHeight - 12, pageWidth - margin - 10, pageHeight - 12)

  // Watermark
  doc.saveGraphicsState()
  doc.setFontSize(80)
  doc.setTextColor(230, 230, 230)
  doc.setFont(fontHeading, 'bold')
  doc.text(org?.company_name?.charAt(0) || 'A', pageWidth / 2, 170, { align: 'center', angle: -30 })
  doc.restoreGraphicsState()

  if (options?.returnBlob) return doc.output('blob')
  doc.save(`Certificate_${certificate.certificate_no || 'certificate'}.pdf`)
  return null
}