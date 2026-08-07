import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../lib/supabase";
import dayjs from "dayjs";
import { montserratRegularBase64, montserratBoldBase64 } from './fonts';  // ✅ Montserrat

async function loadImageAsBase64(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

export async function generateGSTLedgerPdf({
  summary,
  transactions,
  startDate,
  endDate,
  orgId,
  branchName,
  theme = {},
}) {
  const primaryColor = theme.primary_color || "#0D47A1";
  // Use Montserrat – your theme already uses Montserrat
  const fontHeading = "Montserrat";
  const fontBody = "Montserrat";

  // Fetch org
  let org = null;
  try {
    const { data, error } = await supabase
      .from("organization")
      .select("*")
      .eq("id", orgId)
      .single();
    if (!error) org = data;
  } catch (e) { /* ignore */ }
  const orgName = org?.company_name || "Your Academy";

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

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

  // Logo
  let logoBase64 = null;
  if (org?.logo_dark_url) {
    logoBase64 = await loadImageAsBase64(org.logo_dark_url);
  }

  // Header
  let y = 10;
  const logoWidth = 40, logoHeight = 16;
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin, y, logoWidth, logoHeight);
  }
  const textX = margin + (logoBase64 ? logoWidth + 6 : 0);
  const textY = y + 2;
  doc.setFont(fontHeading, "bold");
  doc.setFontSize(16);
  doc.setTextColor(primaryColor);
  doc.text(orgName, textX, textY);

  doc.setFont(fontBody, "normal");
  doc.setFontSize(8);
  doc.setTextColor("#333");
  let detailY = textY + 5;
  if (org?.address) {
    const addrLines = doc.splitTextToSize(org.address, pageWidth - textX - margin - 10);
    doc.text(addrLines, textX, detailY);
    detailY += addrLines.length * 4 + 1;
  }
  if (org?.gstin) doc.text(`GSTIN: ${org.gstin}`, textX, detailY), (detailY += 4.5);
  if (org?.phone) doc.text(`Phone: ${org.phone}`, textX, detailY), (detailY += 4.5);
  if (org?.email) doc.text(`Email: ${org.email}`, textX, detailY), (detailY += 4.5);
  if (org?.website) doc.text(`Web: ${org.website}`, textX, detailY);

  const infoLines = [
    `Period: ${startDate} to ${endDate}`,
    `Branch: ${branchName}`,
  ];
  detailY += 4;
  infoLines.forEach(line => {
    doc.text(line, textX, detailY);
    detailY += 5;
  });

  y = Math.max(y + logoHeight + 6, detailY + 4);
  doc.setDrawColor("#000");
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Title
  doc.setFont(fontHeading, "bold");
  doc.setFontSize(18);
  doc.setTextColor(primaryColor);
  doc.text("GST Ledger", pageWidth / 2, y, { align: "center" });
  y += 10;

  // Monthly Summary
  doc.setFont(fontHeading, "bold");
  doc.setFontSize(12);
  doc.text("Monthly Summary", margin, y);
  y += 4;

  const summaryHeaders = ["Month", "Tax Type", "Total Debit", "Total Credit", "Net Balance"];
  const summaryRows = summary.map(s => [
    dayjs(s.month).format('MMM YYYY'),
    s.tax_type || '',
    `Rs. ${(s.total_debit || 0).toFixed(2)}`,
    `Rs. ${(s.total_credit || 0).toFixed(2)}`,
    `Rs. ${(s.net_balance || 0).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [summaryHeaders],
    body: summaryRows,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2, font: fontBody },
    headStyles: { fillColor: primaryColor, textColor: [255,255,255], fontSize: 9, font: fontHeading },
    footStyles: { fillColor: [240,240,240], textColor: primaryColor, fontStyle: 'bold' },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 8;

  // Transaction Details
  doc.setFont(fontHeading, "bold");
  doc.setFontSize(12);
  doc.text("Transaction Details", margin, y);
  y += 4;

  const transHeaders = ["Date", "Particulars", "Voucher Type", "Voucher No.", "Tax Type", "Debit", "Credit", "Running Balance"];
  const transRows = transactions.map(t => [
    dayjs(t.date).format('DD/MM/YYYY'),
    t.particulars || '',
    t.voucher_type || '',
    t.voucher_number || '',
    t.tax_type || '',
    `Rs. ${(t.debit || 0).toFixed(2)}`,
    `Rs. ${(t.credit || 0).toFixed(2)}`,
    `Rs. ${(t.running_balance || 0).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [transHeaders],
    body: transRows,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2, font: fontBody },
    headStyles: { fillColor: primaryColor, textColor: [255,255,255], fontSize: 9, font: fontHeading },
    footStyles: { fillColor: [240,240,240], textColor: primaryColor, fontStyle: 'bold' },
    margin: { left: margin, right: margin },
    didDrawPage: function (data) {
      // Footer
      doc.setFont(fontBody, 'normal');
      doc.setFontSize(7);
      doc.setTextColor("#666");
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, pageHeight - 8, { align: 'left' });
      doc.text(`© ${orgName}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      doc.text('Page 1 of 1', pageWidth - margin, pageHeight - 8, { align: 'right' });
    },
  });

  doc.save(`GST_Ledger_${startDate.replace(/\//g, '_')}_to_${endDate.replace(/\//g, '_')}.pdf`);
}