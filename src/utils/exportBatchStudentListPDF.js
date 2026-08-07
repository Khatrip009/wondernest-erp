// src/utils/exportBatchStudentListPDF.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs from 'dayjs'
import { montserratRegularBase64, montserratBoldBase64 } from './fonts'

export const exportBatchStudentListPDF = ({
  reportData,
  organization = {},
  theme = {},
  branchName = '',
  batchFilter = '',
}) => {
  const doc = new jsPDF('p', 'mm', 'a4')

  // ---------- Register Montserrat fonts ----------
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
  const margin = 10
  const topMargin = 40
  const bottomMargin = 30
  let y = topMargin

  const primaryColor = theme?.primary_color || '#1677ff'
  // Use Montserrat – your theme already uses Montserrat
  const headingFont = 'Montserrat'
  const bodyFont = 'Montserrat'

  const addHeader = (pdf, isFirstPage) => {
    let imageLoaded = false
    if (organization?.letterhead_url) {
      try {
        pdf.addImage(organization.letterhead_url, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
        imageLoaded = true
      } catch (e) { /* ignore */ }
    }
    if (!imageLoaded) {
      pdf.setDrawColor(primaryColor)
      pdf.setLineWidth(1)
      pdf.rect(margin, 10, pageWidth - 2 * margin, 22)
      pdf.setFontSize(14)
      pdf.setTextColor(primaryColor)
      pdf.setFont(headingFont, 'bold')
      pdf.text(organization.company_name || 'Organization', pageWidth / 2, 18, { align: 'center' })
      pdf.setFontSize(8)
      pdf.setTextColor(0)
      pdf.setFont(bodyFont, 'normal')
      const address = organization.address || ''
      const phone = organization.phone ? `Phone: ${organization.phone}` : ''
      const email = organization.email ? `Email: ${organization.email}` : ''
      const gstin = organization.gstin ? `GST: ${organization.gstin}` : ''
      const infoParts = [address, phone, email, gstin].filter(Boolean)
      pdf.text(infoParts.join(' | '), pageWidth / 2, 24, { align: 'center' })
      pdf.setDrawColor(200, 200, 200)
      pdf.setLineWidth(0.5)
      pdf.line(margin, 26, pageWidth - margin, 26)
    }
  }

  addHeader(doc, true)
  y = topMargin + 6

  doc.setFontSize(16)
  doc.setTextColor(primaryColor)
  doc.setFont(headingFont, 'bold')
  doc.text('Batch-wise Student List', pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(0)
  doc.setFont(bodyFont, 'normal')
  doc.text(`Branch: ${branchName || 'All Branches'}`, margin, y)
  y += 5
  if (batchFilter) doc.text(`Batch: ${batchFilter}`, margin, y)
  y += 8

  reportData.forEach((batch, idx) => {
    if (y > pageHeight - bottomMargin - 30) {
      doc.addPage()
      y = topMargin
      addHeader(doc, false)
      y += 10
      doc.setFontSize(12)
      doc.setTextColor(primaryColor)
      doc.setFont(headingFont, 'bold')
      doc.text('Student List (continued)', pageWidth / 2, y, { align: 'center' })
      y += 8
    }

    const teacherName = batch.teachers
      ? `${batch.teachers.first_name} ${batch.teachers.last_name}`
      : 'N/A'
    const header = `${idx + 1}. ${batch.batch_name} (${batch.courses?.name || 'No Course'}) | Teacher: ${teacherName}`
    doc.setFontSize(11)
    doc.setTextColor(primaryColor)
    doc.setFont(headingFont, 'bold')
    doc.text(header, margin, y)
    y += 6

    const details = `Start: ${batch.start_date ? dayjs(batch.start_date).format('DD/MM/YYYY') : '-'} | End: ${batch.end_date ? dayjs(batch.end_date).format('DD/MM/YYYY') : '-'} | Students: ${batch.total_students}`
    doc.setFontSize(9)
    doc.setTextColor(0)
    doc.setFont(bodyFont, 'normal')
    doc.text(details, margin, y)
    y += 5

    const studentData = batch.students.map(s => [
      s.admission_no || 'N/A',
      s.full_name_formatted || 'Unknown',
      s.mobile || '-',
      s.email || '-',
      s.dob ? dayjs(s.dob).format('DD/MM/YYYY') : '-',
      s.gender || '-',
      s.enrollment_date ? dayjs(s.enrollment_date).format('DD/MM/YYYY') : '-',
    ])

    if (studentData.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Adm No', 'Student', 'Mobile', 'Email', 'DOB', 'Gender', 'Enrolled']],
        body: studentData,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 7,
          cellPadding: 1.2,
          textColor: 0,
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          halign: 'center',
          font: bodyFont,                    // ✅ use Montserrat
        },
        headStyles: {
          fillColor: false,
          textColor: primaryColor,
          fontStyle: 'bold',
          lineWidth: 0.2,
          halign: 'center',
          font: bodyFont,                    // ✅ use Montserrat
        },
        bodyStyles: {
          fillColor: false,
          halign: 'center',
          font: bodyFont,                    // ✅ use Montserrat
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 22 },
          3: { cellWidth: 28 },
          4: { cellWidth: 18 },
          5: { cellWidth: 16 },
          6: { cellWidth: 18 },
        },
        didDrawPage: (data) => { y = data.cursor.y + 2 },
      })
    } else {
      doc.setFontSize(8)
      doc.text('No students enrolled.', margin, y)
      y += 5
    }

    y += 4
  })

  doc.save('Batch_Student_List.pdf')
}