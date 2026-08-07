import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs from 'dayjs'

export const exportAttendanceReportPDF = ({
  reportData,
  organization = {},
  theme = {},
  branchName = '',
  dateRange = { from: '', to: '' },
}) => {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 10
  const topMargin = 40
  const bottomMargin = 35
  let y = topMargin

  const primaryColor = theme?.primary_color || '#1677ff'
  const headingFont = 'helvetica'
  const bodyFont = 'helvetica'

  // ---- Function to add letterhead or fallback header ----
  const addHeader = (pdf, isFirstPage) => {
    // Try to add letterhead image if it exists
    let imageLoaded = false
    if (organization?.letterhead_url) {
      try {
        pdf.addImage(organization.letterhead_url, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
        imageLoaded = true
      } catch (e) {
        console.warn('Letterhead failed to load:', e.message)
      }
    }

    // If image didn't load, draw a simple header box
    if (!imageLoaded) {
      // Draw a border box at top
      pdf.setDrawColor(primaryColor)
      pdf.setLineWidth(1)
      pdf.rect(margin, 10, pageWidth - 2 * margin, 20)

      // Company name
      pdf.setFontSize(14)
      pdf.setTextColor(primaryColor)
      pdf.setFont(headingFont, 'bold')
      pdf.text(organization.company_name || 'Organization', pageWidth / 2, 18, { align: 'center' })

      // Address line
      pdf.setFontSize(8)
      pdf.setTextColor(0)
      pdf.setFont(bodyFont, 'normal')
      const address = organization.address || ''
      const phone = organization.phone || ''
      const email = organization.email || ''
      const gstin = organization.gstin || ''
      const infoLine = `${address}${phone ? ' | Phone: ' + phone : ''}${email ? ' | Email: ' + email : ''}${gstin ? ' | GST: ' + gstin : ''}`
      pdf.text(infoLine, pageWidth / 2, 24, { align: 'center' })

      // Subtle underline
      pdf.setDrawColor(200, 200, 200)
      pdf.setLineWidth(0.5)
      pdf.line(margin, 26, pageWidth - margin, 26)
    }
  }

  // ---- Add header on first page ----
  addHeader(doc, true)

  // ---- Title ----
  // Skip title if letterhead already has company name? Still add report title.
  y = topMargin + 10 // adjusted because header takes some space
  doc.setFontSize(16)
  doc.setTextColor(primaryColor)
  doc.setFont(headingFont, 'bold')
  doc.text('Daily Attendance Report', pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(0)
  doc.setFont(bodyFont, 'normal')
  doc.text(`Branch: ${branchName || 'All Branches'}`, margin, y)
  y += 5
  doc.text(`Period: ${dateRange.from} – ${dateRange.to}`, margin, y)
  y += 8

  // Loop through sessions
  reportData.forEach((session, idx) => {
    if (y > pageHeight - bottomMargin - 30) {
      doc.addPage()
      y = topMargin
      addHeader(doc, false)
      // After header, adjust y for title
      y += 10
      doc.setFontSize(12)
      doc.setTextColor(primaryColor)
      doc.setFont(headingFont, 'bold')
      doc.text('Attendance Report (continued)', pageWidth / 2, y, { align: 'center' })
      y += 8
    }

    const header = `${idx + 1}. ${dayjs(session.attendance_date).format('DD/MM/YYYY')} | ${session.batches?.batch_name || 'N/A'} | ${session.teachers ? session.teachers.first_name + ' ' + session.teachers.last_name : 'N/A'}`
    doc.setFontSize(11)
    doc.setTextColor(primaryColor)
    doc.setFont(headingFont, 'bold')
    doc.text(header, margin, y)
    y += 6

    doc.setFontSize(9)
    doc.setTextColor(0)
    doc.setFont(bodyFont, 'normal')
    const startTime = session.start_time ? dayjs(session.start_time, 'HH:mm:ss').format('HH:mm') : '-'
    const endTime = session.end_time ? dayjs(session.end_time, 'HH:mm:ss').format('HH:mm') : '-'
    const details = `Topic: ${session.topic_covered || '-'} | Start: ${startTime} | End: ${endTime} | Total: ${session.total_students || 0}`
    doc.text(details, margin, y)
    y += 5

    const studentData = (session.students || []).map(s => [
      s.student?.admission_no || 'N/A',
      s.student?.full_name_formatted || 'Unknown',
      s.status || 'absent',
      s.remarks || '',
    ])

    if (studentData.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Adm No', 'Student', 'Status', 'Remarks']],
        body: studentData,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 8,
          cellPadding: 1.5,
          textColor: 0,
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          halign: 'center',
        },
        headStyles: {
          fillColor: false,
          textColor: primaryColor,
          fontStyle: 'bold',
          lineWidth: 0.2,
          halign: 'center',
        },
        bodyStyles: {
          fillColor: false,
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 25 },
          3: { cellWidth: 'auto' },
        },
        didDrawPage: (data) => {
          y = data.cursor.y + 2
        },
      })
    } else {
      doc.setFontSize(8)
      doc.text('No students recorded.', margin, y)
      y += 5
    }

    y += 4
  })

  doc.save('Attendance_Report_Detailed.pdf')
}