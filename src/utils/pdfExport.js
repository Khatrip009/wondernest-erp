// src/utils/pdfExport.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const exportReportPDF = ({
  title,
  subtitle = '',
  columns,
  data,
  fileName = 'report.pdf',
  organization = {},
  branchName = '',
  branchAddress = '',
  theme = {},
  tableWidth = 0.98,
}) => {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // ---- Reduced margins ----
  const marginLeft = 10
  const marginRight = 10
  const contentWidth = pageWidth - marginLeft - marginRight
  const targetTableWidth = contentWidth * tableWidth

  // ---- Increased top margin for letterhead ----
  let y = 48   // was 32 – leave room for letterhead header

  const primaryColor = theme?.primary_color || '#1677ff'
  const headingFont = 'helvetica'
  const bodyFont = 'helvetica'

  // ---------- Background / Letterhead ----------
  const addBackground = (pdfDoc) => {
    if (organization.letterhead_url) {
      try {
        pdfDoc.addImage(organization.letterhead_url, 'PNG', 0, 0, pageWidth, pageHeight)
      } catch (err) {}
    } else {
      pdfDoc.setFontSize(14)
      pdfDoc.setTextColor(primaryColor)
      pdfDoc.text(organization.company_name || 'Organization', marginLeft, 15)
    }
  }
  addBackground(doc)

  // ---------- Meta info (right‑aligned) ----------
  const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
  const rightX = pageWidth - marginRight

  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.setFont(bodyFont)

  doc.text(`Date: ${today}`, rightX, y, { align: 'right' })
  y += 5
  if (branchName) {
    doc.text(`Branch: ${branchName}`, rightX, y, { align: 'right' })
    y += 5
  }
  if (branchAddress) {
    const addrLines = doc.splitTextToSize(`Address: ${branchAddress}`, contentWidth)
    addrLines.forEach((line) => {
      doc.text(line, rightX, y, { align: 'right' })
      y += 5
    })
  }
  y += 5   // extra space before title

  // ---------- Title (centered) ----------
  doc.setFontSize(14)
  doc.setTextColor(primaryColor)
  doc.setFont(headingFont)
  doc.text(title, pageWidth / 2, y, { align: 'center' })
  y += 7
  if (subtitle) {
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont(bodyFont)
    doc.text(subtitle, pageWidth / 2, y, { align: 'center' })
    y += 6
  }
  y += 3   // extra space before table

  // ---------- Table ----------
  const tableColumns = columns.map((col) => ({
    header: col.title,
    dataKey: col.dataIndex,
  }))

  const tableData = data.map((row) =>
    tableColumns.reduce((acc, col) => {
      acc[col.dataKey] = row[col.dataKey] ?? ''
      return acc
    }, {})
  )

  // ---------- Column widths proportional to targetTableWidth ----------
  const totalPixels = columns.reduce((sum, col) => sum + (col.width || 100), 0)
  const columnStyles = {}
  columns.forEach((col, index) => {
    const pixelWidth = col.width || 100
    const mmWidth = (pixelWidth / totalPixels) * targetTableWidth
    columnStyles[index] = { cellWidth: mmWidth }
  })

  autoTable(doc, {
    startY: y,
    columns: tableColumns,
    body: tableData,
    margin: { left: marginLeft, right: marginRight },
    columnStyles,
    styles: {
      fontSize: 8,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      halign: 'center',
      font: bodyFont,
    },
    headStyles: {
      fillColor: null,
      textColor: primaryColor,
      fontStyle: 'bold',
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      halign: 'center',
      font: headingFont,
    },
    bodyStyles: {
      fillColor: null,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      halign: 'center',
    },
    didDrawPage: (pageData) => {
      if (pageData.pageNumber > 1) {
        addBackground(doc)
      }
    },
  })

  doc.save(fileName)
}