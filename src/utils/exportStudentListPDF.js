// src/utils/exportStudentListPDF.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { customFonts } from './pdfFonts'

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

export const exportStudentListPDF = (filteredData, filterType, selectedValue, org, theme) => {
  const doc = new jsPDF('p', 'mm', 'a4')
  // Register custom fonts before any text
  registerCustomFonts(doc)

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'helvetica'
  const fontBody = theme?.font_body || 'helvetica'

  // Letterhead background
  if (org?.letterhead_url) {
    try {
      doc.addImage(org.letterhead_url, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
    } catch (e) { /* ignore */ }
  }

  let y = 45

  // Title & Filters
  doc.setFontSize(14)
  doc.setTextColor(primaryColor)
  doc.setFont(fontHeading, 'bold')
  doc.text('Student List Report', pageWidth / 2, y, { align: 'center' })
  y += 10

  doc.setFontSize(10)
  doc.setTextColor(80)
  doc.setFont(fontBody, 'normal')
  doc.text(`Filter: ${filterType} → ${selectedValue}`, pageWidth / 2, y, { align: 'center' })
  y += 7
  doc.text(`Total Students: ${filteredData.length}`, pageWidth / 2, y, { align: 'center' })
  y += 12

  // Columns – first column now Admission Form No
  const columns = [
    { header: 'Adm. Form No', dataKey: 'admission_form_number' },
    { header: 'Student Name', dataKey: 'full_name_formatted' },
    { header: 'Mobile', dataKey: 'mobile' },
    { header: 'Course', dataKey: 'course_name' },
    { header: 'Batch', dataKey: 'batch_name' },
    { header: 'Branch', dataKey: 'branch_name' },
    { header: 'Age', dataKey: 'age' },
  ]

  const rows = filteredData.map(s => ({
    admission_form_number: s.admission_form_number || '',
    full_name_formatted: s.full_name_formatted || '',
    mobile: s.mobile || '',
    course_name: s.course_name || '',
    batch_name: s.batch_name || '',
    branch_name: s.branch_name || '',
    age: s.dob ? new Date().getFullYear() - new Date(s.dob).getFullYear() : '',
  }))

  autoTable(doc, {
    startY: y,
    head: [columns.map(c => c.header)],
    body: rows.map(r => columns.map(c => r[c.dataKey])),
    margin: { left: margin, right: margin },
    styles: {
      font: fontBody,
      fontSize: 8,
      cellPadding: 2,
      textColor: 30,
      lineColor: 200,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
      lineColor: primaryColor,
      lineWidth: 0.2,
    },
    bodyStyles: {
      fillColor: false,
      textColor: 30,
      lineColor: 200,
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 255],
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 25 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
      6: { cellWidth: 15 },
    },
    theme: 'grid',
  })

  doc.save(`student-list-${filterType}-${selectedValue}.pdf`)
}