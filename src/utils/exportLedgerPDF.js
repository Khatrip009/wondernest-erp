import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dayjs from "dayjs";
import { montserratRegularBase64, montserratBoldBase64 } from './fonts';   // ✅ Montserrat

export const exportStudentLedgerPDF = (student, entries, options = {}) => {
  if (!entries || entries.length === 0) {
    alert("No data to export");
    return;
  }

  const primaryColor = options.primaryColor || "#0D47A1";
  const fontHeading = "Montserrat";
  const fontBody = "Montserrat";

  const doc = new jsPDF("p", "mm", "a4");

  // ---------- Register Montserrat fonts ----------
  if (!doc.getFontList()?.Montserrat) {
    doc.addFileToVFS('Montserrat-Regular.ttf', montserratRegularBase64);
    doc.addFont('Montserrat-Regular.ttf', 'Montserrat', 'normal');
  }
  if (!doc.getFontList()?.MontserratBold) {
    doc.addFileToVFS('Montserrat-Bold.ttf', montserratBoldBase64);
    doc.addFont('Montserrat-Bold.ttf', 'Montserrat', 'bold');
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  let y = 10;

  // ─── Title ──────────────────────────────────────────────
  doc.setFont(fontHeading, "bold");
  doc.setFontSize(18);
  doc.setTextColor(primaryColor);
  doc.text("Student Ledger", pageWidth / 2, y, { align: "center" });
  y += 8;

  // ─── Student & filter details ───────────────────────────
  doc.setFont(fontBody, "normal");
  doc.setFontSize(10);
  doc.setTextColor("#000");
  const details = [
    `Student: ${student.full_name_formatted || "N/A"} (${student.admission_no || "N/A"})`,
    `Branch: ${options.branchName || "All"}`,
    `Financial Year: ${options.financialYearName || "All"}`,
    `Period: ${options.fromDate || "Start"} – ${options.toDate || "End"}`,
  ];
  details.forEach((line) => {
    doc.text(line, margin, y);
    y += 6;
  });

  y += 4;

  // ─── Table ──────────────────────────────────────────────
  const tableHeaders = ["Date", "Description", "Reference", "Debit", "Credit", "Balance", "Type"];
  const tableRows = entries.map((e) => [
    dayjs(e.date).format("DD/MM/YYYY"),
    e.description || "",
    e.reference || "",
    e.debit > 0 ? `Rs. ${e.debit.toFixed(2)}` : "",
    e.credit > 0 ? `Rs. ${e.credit.toFixed(2)}` : "",
    `Rs. ${e.balance.toFixed(2)}`,
    e.type || "",
  ]);

  const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);
  const closingBalance = entries[entries.length - 1]?.balance || 0;

  tableRows.push([
    "",
    "",
    "TOTAL",
    `Rs. ${totalDebit.toFixed(2)}`,
    `Rs. ${totalCredit.toFixed(2)}`,
    `Rs. ${closingBalance.toFixed(2)}`,
    "",
  ]);

  autoTable(doc, {
    startY: y,
    head: [tableHeaders],
    body: tableRows,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 2, font: fontBody },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 9, font: fontBody },
    footStyles: { fillColor: [240, 240, 240], textColor: primaryColor, fontStyle: "bold" },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(7);
      doc.setTextColor("#666");
      doc.text(
        `Generated on ${new Date().toLocaleDateString()}`,
        margin,
        pageHeight - 8,
        { align: "left" }
      );
      doc.text(
        `© ${options.organizationName || "Your Academy"}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );
      doc.text("Page 1 of 1", pageWidth - margin, pageHeight - 8, { align: "right" });
    },
  });

  const fileName = `Student_Ledger_${student.admission_no || student.id}_${dayjs().format("YYYY-MM-DD")}.pdf`;
  doc.save(fileName);
};