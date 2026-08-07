// src/utils/exportLeaveReportPDF.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { montserratRegularBase64, montserratBoldBase64 } from './fonts'

/**
 * Export leave report as PDF
 * @param {Array} leaveData - Array of leave rows (must include: teachers(first_name, last_name), start_date, end_date, reason, status)
 * @param {Object} options - { org, theme, branchName, title, dateRange }
 */
export const exportLeaveReportPDF = async (leaveData, options = {}) => {
  const {
    org = {},
    theme = {},
    branchName = 'All Branches',
    title = 'Leave Report',
    dateRange = '',
  } = options

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
    const margin = 14
    const primaryColor = theme?.primary_color || '#0D47A1'

    // ----- Background letterhead -----
    if (org?.letterhead_url) {
      try {
        doc.addImage(org.letterhead_url, 'PNG', 0, 0, pageWidth, pageHeight)
      } catch (e) {
        // ignore if image fails
      }
    }

    let y = 45   // start below printed header

    // ==================== REPORT HEADER ====================
    doc.setFontSize(16)
    doc.setTextColor(primaryColor)
    doc.setFont('Montserrat', 'bold')
    doc.text(title, pageWidth / 2, y, { align: 'center' })

    y += 8

    doc.setFontSize(10)
    doc.setTextColor(80)
    doc.setFont('Montserrat', 'normal')

    const headerLines = []
    if (org?.company_name) headerLines.push(`Organization: ${org.company_name}`)
    headerLines.push(`Branch: ${branchName}`)
    if (dateRange) headerLines.push(`Period: ${dateRange}`)

    headerLines.forEach(line => {
      doc.text(line, pageWidth / 2, y, { align: 'center' })
      y += 5
    })

    y += 6   // extra space before the table

    // ==================== TABLE ====================
    const rows = leaveData.map((item) => {
      const teacher = item.teachers || {}
      const teacherName = teacher.first_name
        ? `${teacher.first_name} ${teacher.last_name}`
        : 'Unknown'
      return [
        teacherName,
        item.start_date ? new Date(item.start_date).toLocaleDateString('en-IN') : '-',
        item.end_date ? new Date(item.end_date).toLocaleDateString('en-IN') : '-',
        item.reason || '-',
        item.status || '-',
      ]
    })

    const columns = ['Employee', 'Start Date', 'End Date', 'Reason', 'Status']

    autoTable(doc, {
      startY: y,
      head: [columns],
      body: rows,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        font: 'Montserrat',
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold',
        font: 'Montserrat',
      },
      bodyStyles: {
        font: 'Montserrat',
      },
      tableWidth: pageWidth - 2 * margin,
      theme: 'grid',
    })

    // ==================== SUMMARY ====================
    const finalY = (doc.lastAutoTable?.finalY || y) + 8
    const totalRecords = leaveData.length
    const approvedCount = leaveData.filter(r => r.status === 'Approved').length
    const pendingCount = leaveData.filter(r => r.status === 'Pending').length
    const rejectedCount = leaveData.filter(r => r.status === 'Rejected').length

    doc.setFontSize(11)
    doc.setTextColor(primaryColor)
    doc.setFont('Montserrat', 'bold')
    doc.text('Summary', margin, finalY)

    doc.setFontSize(9)
    doc.setTextColor(0)
    doc.setFont('Montserrat', 'normal')
    const summaryText = `Total: ${totalRecords}   |   Approved: ${approvedCount}   |   Pending: ${pendingCount}   |   Rejected: ${rejectedCount}`
    doc.text(summaryText, margin, finalY + 6)

    // No footer

    doc.save(`${title.replace(/\s+/g, '_')}.pdf`)
  } catch (error) {
    console.error('PDF generation failed:', error)
    throw error
  }
}