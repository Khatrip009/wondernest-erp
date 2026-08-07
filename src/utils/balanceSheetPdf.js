// src/utils/generateBalanceSheetPdf.js
import { jsPDF } from "jspdf";
import { supabase } from "../lib/supabase";
import { montserratRegularBase64, montserratBoldBase64 } from "./fonts";   // ✅ Montserrat

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
  } catch {
    return null;
  }
}

export async function generateBalanceSheetPdf({
  groups,
  asOnDate,
  orgId,
  theme = {},
}) {
  const primaryColor = theme.primary_color || "#0D47A1";
  // Montserrat fonts – your theme already uses Montserrat
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

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ----- Register Montserrat fonts (consistent with all other reports) -----
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
  const colWidth = (pageWidth - margin * 2 - 6) / 2;
  const leftX = margin;
  const rightX = margin + colWidth + 6;

  // ----- Letterhead background (full page) -----
  if (org?.letterhead_url) {
    try {
      doc.addImage(org.letterhead_url, "PNG", 0, 0, pageWidth, pageHeight);
    } catch (e) { /* ignore */ }
  }

  // ----- Header (positioned below the letterhead's natural header) -----
  let y = 45;   // start below the pre‑printed letterhead


  // Title
  doc.setFont(fontHeading, "bold");
  doc.setFontSize(20);
  doc.setTextColor(primaryColor);
  doc.text("Balance Sheet", pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFont(fontBody, "normal");
  doc.setFontSize(10);
  doc.setTextColor("#000");
  doc.text(`as on ${asOnDate}`, pageWidth / 2, y, { align: "center" });
  y += 10;

  // Build left (Assets) and right (Liabilities & Equity)
  const leftItems = [];
  const rightItems = [];

  const assetGroup = groups["Assets"] || { subsections: [], total: 0 };
  const liabilityGroup = groups["Liabilities"] || { subsections: [], total: 0 };
  const equityGroup = groups["Equity"] || { subsections: [], total: 0 };

  function addSubsections(items, subsections) {
    if (!subsections || subsections.length === 0) {
      items.push({ label: "No entries", isHeader: false, amount: null });
      return;
    }
    subsections.forEach((sub) => {
      items.push({ label: sub.subsectionName, isHeader: true, amount: null, indent: 0 });
      (sub.items || []).forEach((item) => {
        items.push({ label: item.account, isHeader: false, amount: item.amount, indent: 1 });
      });
      items.push({ label: `Total ${sub.subsectionName}`, isSubtotal: true, amount: sub.subtotal, indent: 0 });
    });
  }

  // Assets (left)
  if (assetGroup.subsections.length === 0) {
    leftItems.push({ label: "No assets", isHeader: false, amount: null });
  } else {
    leftItems.push({ label: "Assets", isHeader: true, amount: null, isSection: true });
    addSubsections(leftItems, assetGroup.subsections);
    leftItems.push({ label: "Total Assets", isTotal: true, amount: assetGroup.total });
  }

  // Liabilities + Equity (right)
  const rightSubsections = [...(liabilityGroup.subsections || []), ...(equityGroup.subsections || [])];
  if (rightSubsections.length === 0) {
    rightItems.push({ label: "No liabilities or equity", isHeader: false, amount: null });
  } else {
    rightItems.push({ label: "Liabilities & Equity", isHeader: true, amount: null, isSection: true });
    addSubsections(rightItems, rightSubsections);
    const totalLE = (liabilityGroup.total || 0) + (equityGroup.total || 0);
    rightItems.push({ label: "Total Liabilities & Equity", isTotal: true, amount: totalLE });
  }

  // Pad rows
  const maxRows = Math.max(leftItems.length, rightItems.length);
  const rowData = [];
  for (let i = 0; i < maxRows; i++) {
    const left = leftItems[i] || { label: "", isHeader: false, amount: null, indent: 0 };
    const right = rightItems[i] || { label: "", isHeader: false, amount: null, indent: 0 };
    rowData.push([left, right]);
  }

  // Draw table
  const lineHeight = 6;
  const fontSize = 9;
  const headerHeight = 8;
  let rowY = y;

  // Table header row
  doc.setFont(fontHeading, "bold");
  doc.setFontSize(10);
  doc.setTextColor(primaryColor);
  doc.text("Assets", leftX + 2, rowY + 5);
  doc.text("Liabilities & Equity", rightX + 2, rowY + 5);
  rowY += headerHeight;
  doc.setDrawColor("#000");
  doc.line(margin, rowY, pageWidth - margin, rowY);

  // Table rows
  for (const [left, right] of rowData) {
    rowY += lineHeight;

    // Left cell
    if (left.label) {
      const isHeader = left.isHeader || false;
      const isSubtotal = left.isSubtotal || false;
      const isTotal = left.isTotal || false;
      const indent = left.indent || 0;
      const amount = left.amount;
      doc.setFontSize(fontSize);
      if (isHeader) {
        doc.setFont(fontBody, "bold");
        doc.setTextColor(primaryColor);
      } else if (isSubtotal || isTotal) {
        doc.setFont(fontBody, "bolditalic");
        doc.setTextColor(primaryColor);
      } else {
        doc.setFont(fontBody, "normal");
        doc.setTextColor("#000");
      }
      const xPos = leftX + 2 + indent * 6;
      doc.text(left.label, xPos, rowY);
      if (amount !== null && amount !== undefined) {
        const amountText = `Rs. ${amount.toFixed(2)}`;
        const maxX = leftX + colWidth - 2;
        doc.text(amountText, maxX, rowY, { align: "right" });
      }
    }

    // Right cell (same pattern)
    if (right.label) {
      const isHeader = right.isHeader || false;
      const isSubtotal = right.isSubtotal || false;
      const isTotal = right.isTotal || false;
      const indent = right.indent || 0;
      const amount = right.amount;
      doc.setFontSize(fontSize);
      if (isHeader) {
        doc.setFont(fontBody, "bold");
        doc.setTextColor(primaryColor);
      } else if (isSubtotal || isTotal) {
        doc.setFont(fontBody, "bolditalic");
        doc.setTextColor(primaryColor);
      } else {
        doc.setFont(fontBody, "normal");
        doc.setTextColor("#000");
      }
      const xPos = rightX + 2 + indent * 6;
      doc.text(right.label, xPos, rowY);
      if (amount !== null && amount !== undefined) {
        const amountText = `Rs. ${amount.toFixed(2)}`;
        const maxX = rightX + colWidth - 2;
        doc.text(amountText, maxX, rowY, { align: "right" });
      }
    }
  }

  rowY += 6;
  doc.setDrawColor("#000");
  doc.line(margin, rowY, pageWidth - margin, rowY);

  // Footer
  const footerY = pageHeight - 8;
  doc.setFont(fontBody, "normal");
  doc.setFontSize(7);
  doc.setTextColor("#666");
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, footerY, { align: "left" });
  doc.text(`© ${orgName}`, pageWidth / 2, footerY, { align: "center" });
  doc.text("Page 1 of 1", pageWidth - margin, footerY, { align: "right" });

  doc.save(`Balance_Sheet_${asOnDate.replace(/\//g, "_")}.pdf`);
}