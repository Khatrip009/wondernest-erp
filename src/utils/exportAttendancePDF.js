// src/utils/exportAttendancePDF.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { montserratRegularBase64, montserratBoldBase64 } from './fonts'

export const exportAttendancePDF = async (attendanceData, options = {}) => {
  const {
    org = {},
    theme = {},
    branchName = 'All Branches',
    title = 'Attendance Report',
    isDaily = false,
    dateRange = '',
  } = options

  try {
    const doc = new jsPDF('p', 'mm', 'a4')

    // ----- Register Montserrat fonts (same as before) -----
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
    // Use Montserrat (the theme already points to Montserrat)
    const fontHeading = 'Montserrat'
    const fontBody = 'Montserrat'

    // ----- Background letterhead (if available) -----
    if (org?.letterhead_url) {
      try {
        doc.addImage(org.letterhead_url, 'PNG', 0, 0, pageWidth, pageHeight)
      } catch (e) { /* ignore */ }
    }

    let y = 45

    // ==================== REPORT HEADER ====================
    doc.setFontSize(16)
    doc.setTextColor(primaryColor)
    doc.setFont(fontHeading, 'bold')
    doc.text(title, pageWidth / 2, y, { align: 'center' })

    y += 8

    doc.setFontSize(10)
    doc.setTextColor(80)
    doc.setFont(fontBody, 'normal')

    const headerLines = []
    if (org?.company_name) headerLines.push(`Organization: ${org.company_name}`)
    headerLines.push(`Branch: ${branchName}`)
    if (dateRange) headerLines.push(`Period: ${dateRange}`)

    headerLines.forEach(line => {
      doc.text(line, pageWidth / 2, y, { align: 'center' })
      y += 5
    })

    y += 6

    // ==================== TABLE ====================
    const calculateWorkHours = (checkIn, checkOut) => {
      if (!checkIn || !checkOut) return null
      const start = new Date(checkIn).getTime()
      const end = new Date(checkOut).getTime()
      const diffMinutes = Math.round((end - start) / 60000)
      return diffMinutes > 0 ? diffMinutes : 0
    }

    const formatDuration = (minutes) => {
      if (!minutes || minutes <= 0) return '-'
      const hours = Math.floor(minutes / 60)
      const mins = Math.round(minutes % 60)
      return `${hours}h ${mins.toString().padStart(2, '0')}m`
    }

    const rows = attendanceData.map((r) => {
      const teacher = r.teachers || {}
      const teacherName = teacher.first_name
        ? `${teacher.first_name} ${teacher.last_name}`
        : 'Unknown'
      const workMinutes = calculateWorkHours(r.check_in, r.check_out)
      const workHoursStr = formatDuration(workMinutes)

      if (isDaily) {
        return [
          teacherName,
          r.check_in ? new Date(r.check_in).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-',
          r.check_out ? new Date(r.check_out).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-',
          r.status || '-',
          workHoursStr,
        ]
      } else {
        return [
          new Date(r.attendance_date).toLocaleDateString('en-IN'),
          teacherName,
          r.check_in ? new Date(r.check_in).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-',
          r.check_out ? new Date(r.check_out).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-',
          r.status || '-',
          workHoursStr,
        ]
      }
    })

    const columns = isDaily
      ? ['Teacher', 'Check‑in', 'Check‑out', 'Status', 'Work Hours']
      : ['Date', 'Teacher', 'Check‑in', 'Check‑out', 'Status', 'Work Hours']

    autoTable(doc, {
      startY: y,
      head: [columns],
      body: rows,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        font: fontBody,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold',
        font: fontBody,
      },
      bodyStyles: {
        font: fontBody,
      },
      tableWidth: pageWidth - 2 * margin,
      theme: 'grid',
    })

    // ==================== SUMMARY ====================
    const finalY = (doc.lastAutoTable?.finalY || y) + 8
    const totalRecords = attendanceData.length
    const presentCount = attendanceData.filter(r => r.status === 'present' || r.status === 'checked_out').length
    const absentCount = attendanceData.filter(r => r.status === 'absent').length
    const totalWorkMinutes = attendanceData.reduce((sum, r) => sum + (calculateWorkHours(r.check_in, r.check_out) || 0), 0)

    doc.setFontSize(11)
    doc.setTextColor(primaryColor)
    doc.setFont(fontHeading, 'bold')
    doc.text('Summary', margin, finalY)

    doc.setFontSize(9)
    doc.setTextColor(0)
    doc.setFont(fontBody, 'normal')
    const summaryText = `Total Records: ${totalRecords}   |   Present: ${presentCount}   |   Absent: ${absentCount}   |   Total Work Hours: ${formatDuration(totalWorkMinutes)}`
    doc.text(summaryText, margin, finalY + 6)

    doc.save(`${title.replace(/\s+/g, '_')}.pdf`)
  } catch (error) {
    console.error('PDF generation failed:', error)
    throw error
  }
}