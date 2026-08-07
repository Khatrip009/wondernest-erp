import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dayjs from "dayjs";
import { customFonts } from './pdfFonts';   // adjust path if needed

// Helper to register custom fonts on the jsPDF instance
const registerCustomFonts = (doc) => {
  const styleMap = {
    normal: 'normal',
    bold: 'bold',
    italics: 'italic',
    bolditalics: 'bolditalic',
  };
  Object.entries(customFonts).forEach(([family, styles]) => {
    Object.entries(styles).forEach(([key, base64]) => {
      const style = styleMap[key];
      const fileName = `${family}-${style}.ttf`;
      doc.addFileToVFS(fileName, base64);
      doc.addFont(family, style, fileName);
    });
  });
};

export const exportGeneralLedgerPDF = (data, org, theme, filters = {}) => {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }

  const primaryColor = theme?.primary_color || "#0D47A1";
  const fontHeading = theme?.font_heading || "helvetica";
  const fontBody = theme?.font_body || "helvetica";

  const doc = new jsPDF("l", "mm", "a4");
  // Register custom fonts (Canela etc.) before any text
  registerCustomFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  let y = 8;

  // ────────── HEADER (Logo + Company Details) ──────────
  const logoWidth = 22, logoHeight = 14;
  let headerLeftX = margin;

  const logoUrl = org?.logo_dark_url || org?.logo_light_url || null;
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, "PNG", margin, y, logoWidth, logoHeight, undefined, "FAST");
      headerLeftX = margin + logoWidth + 4;
    } catch (e) { /* ignore */ }
  }

  doc.setFontSize(11);
  doc.setFont(fontHeading, "bold");
  doc.setTextColor(primaryColor);
  doc.text(org?.company_name || "Your Academy", headerLeftX, y + 5);

  doc.setFontSize(7);
  doc.setFont(fontBody, "normal");
  doc.setTextColor(0);
  let detailY = y + 10;
  if (org?.address) {
    doc.text(org.address, headerLeftX, detailY);
    detailY += 3.5;
  }
  const contact = [];
  if (org?.phone) contact.push(`Phone: ${org.phone}`);
  if (org?.email) contact.push(`Email: ${org.email}`);
  if (contact.length) {
    doc.text(contact.join(" | "), headerLeftX, detailY);
    detailY += 3.5;
  }
  if (org?.gstin) {
    doc.text(`GSTIN: ${org.gstin}`, headerLeftX, detailY);
  }

  y += 18;

  // ────────── TITLE ──────────
  y += 5;   
  doc.setFontSize(18);
  doc.setFont(fontHeading, "bold");
  doc.setTextColor(primaryColor);
  doc.text("General Student Ledger", pageWidth / 2, y, { align: "center" });
  y += 10;
  doc.setTextColor(0);

  // ────────── FILTER DETAILS ──────────
  doc.setFont(fontBody, "normal");
  doc.setFontSize(10);
  const details = [
    `Branch: ${filters.branchName || "All"}`,
    `Financial Year: ${filters.financialYearName || "All"}`,
  ];
  if (filters.studentName) details.unshift(`Student: ${filters.studentName}`);
  if (filters.startDate) details.push(`Period: ${filters.startDate} – ${filters.endDate}`);
  details.forEach((line) => {
    doc.text(line, margin, y);
    y += 6;
  });

  y += 4;

  // ────────── TABLE ──────────
  const headers = [
    "Date", "Admission No", "Student Name", "Particulars", "Debit (Rs.)", "Credit (Rs.)", "Balance (Rs.)"
  ];

  const rows = data.map((e) => [
    e.date ? dayjs(e.date).format("DD/MM/YYYY") : "",
    e.admission_no || "",
    e.student_name || "",
    e.description || "",
    e.debit > 0 ? `Rs. ${e.debit.toFixed(2)}` : "",
    e.credit > 0 ? `Rs. ${e.credit.toFixed(2)}` : "",
    `Rs. ${(e.balance ?? 0).toFixed(2)}`,
  ]);

  const totalDebit = data.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = data.reduce((s, e) => s + (e.credit || 0), 0);
  const netBalance = totalDebit - totalCredit;

  rows.push([
    "", "", "TOTAL", "",
    `Rs. ${totalDebit.toFixed(2)}`,
    `Rs. ${totalCredit.toFixed(2)}`,
    `Rs. ${netBalance.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 2, font: fontBody },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 9 },
    footStyles: { fillColor: [240, 240, 240], textColor: primaryColor, fontStyle: "bold" },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 25 },
      2: { cellWidth: 38 },
      3: { cellWidth: "auto" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 28, halign: "right" },
      6: { cellWidth: 28, halign: "right" },
    },
    rowStyles: (rowIndex) => {
      if (rowIndex === rows.length - 1) {
        return { fontStyle: "bold", fillColor: "#f0f0f0" };
      }
      return {};
    },
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.setTextColor("#666");
      doc.text(
        `Generated on ${new Date().toLocaleDateString()}`,
        margin,
        pageHeight - 8,
        { align: "left" }
      );
      doc.text(
        `© ${org?.company_name || "Your Academy"}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );
      doc.text(
        "Page 1 of 1",
        pageWidth - margin,
        pageHeight - 8,
        { align: "right" }
      );
    },
  });

  doc.save(`General_Student_Ledger_${dayjs().format("YYYY-MM-DD")}.pdf`);
};