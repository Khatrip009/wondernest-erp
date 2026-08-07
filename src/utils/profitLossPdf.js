// src/utils/profitLossPdf.js
import { jsPDF } from "jspdf";
import { supabase } from "../lib/supabase";
import { montserratRegularBase64, montserratBoldBase64 } from './fonts';

// ─── Helper: load image ────────────────────────────────
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

// ─── Number to words ──────────────────────────────────
function numberToWords(num) {
  if (num === 0) return "Zero";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const numToWords = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + numToWords(n % 100) : "");
    if (n < 100000)
      return numToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + numToWords(n % 1000) : "");
    if (n < 10000000)
      return numToWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + numToWords(n % 100000) : "");
    return numToWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + numToWords(n % 10000000) : "");
  };
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = numToWords(rupees) + " Rupee" + (rupees !== 1 ? "s" : "");
  if (paise > 0) result += " and " + numToWords(paise) + " Paise";
  return result;
}

// ─── Main generator ────────────────────────────────────
export async function generateProfitLossPdf({
  groups,
  summary,
  periodLabel,
  orgId,
  theme = {},
}) {
  const primaryColor = theme.primary_color || "#0D47A1";
  const fontHeading = "Montserrat";
  const fontBody = "Montserrat";

  // Fetch organization
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

  // Document setup
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

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
  const colWidth = (pageWidth - margin * 2 - 6) / 2;
  const leftX = margin;
  const rightX = margin + colWidth + 6;

  // ── Logo ──
  let logoBase64 = null;
  if (org?.logo_dark_url) {
    logoBase64 = await loadImageAsBase64(org.logo_dark_url);
  }

  // ── Header ──
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

  y = Math.max(y + logoHeight + 6, detailY + 4);
  doc.setDrawColor("#000");
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ── Title ──
  doc.setFont(fontHeading, "bold");
  doc.setFontSize(20);
  doc.setTextColor(primaryColor);
  doc.text("Profit and Loss Account", pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFont(fontBody, "normal");
  doc.setFontSize(10);
  doc.setTextColor("#000");
  doc.text(`for the year ended ${periodLabel}`, pageWidth / 2, y, { align: "center" });
  y += 10;

  // ── Build left (expenses) and right (income) data ──
  const leftItems = [];
  const rightItems = [];

  const expenseGroups = {};
  const incomeGroups = {};
  for (const [name, group] of Object.entries(groups)) {
    const lower = name.toLowerCase();
    if (lower.includes("revenue") || lower.includes("income")) {
      incomeGroups[name] = group;
    } else {
      expenseGroups[name] = group;
    }
  }

  function addGroup(items, groupName, group) {
    if (!group.items || group.items.length === 0) return;
    items.push({ label: groupName, isHeader: true, amount: null });
    for (const item of group.items) {
      items.push({ label: item.account || "N/A", isHeader: false, amount: item.amount || 0 });
    }
    items.push({ label: `Total ${groupName}`, isSubtotal: true, amount: group.total || 0 });
  }

  for (const [name, group] of Object.entries(expenseGroups)) addGroup(leftItems, name, group);
  for (const [name, group] of Object.entries(incomeGroups)) addGroup(rightItems, name, group);

  if (leftItems.length === 0) leftItems.push({ label: "No expenses", isHeader: false, amount: null });
  if (rightItems.length === 0) rightItems.push({ label: "No income", isHeader: false, amount: null });

  // ── Fallback: compute totals from groups if summary is missing them ──
  const totalExpenses = summary?.totalExpenses ?? Object.values(expenseGroups).reduce((sum, g) => sum + (g.total || 0), 0);
  const totalIncome = summary?.totalIncome ?? Object.values(incomeGroups).reduce((sum, g) => sum + (g.total || 0), 0);
  const netProfit = summary?.netProfit ?? (totalIncome - totalExpenses);

  // ── Draw table manually ──
  const lineHeight = 6;
  const fontSize = 9;
  const headerHeight = 8;
  let rowY = y;

  // Draw header row
  doc.setFont(fontHeading, "bold");
  doc.setFontSize(10);
  doc.setTextColor(primaryColor);
  doc.text("Expenses (Debit)", leftX + 2, rowY + 5);
  doc.text("Income (Credit)", rightX + 2, rowY + 5);
  rowY += headerHeight;
  doc.setDrawColor("#000");
  doc.line(margin, rowY, pageWidth - margin, rowY);

  // Determine max rows
  const maxRows = Math.max(leftItems.length, rightItems.length);
  const rowData = [];
  for (let i = 0; i < maxRows; i++) {
    rowData.push([leftItems[i] || { label: "", isHeader: false, amount: null }, rightItems[i] || { label: "", isHeader: false, amount: null }]);
  }

  // Draw rows
  for (const [left, right] of rowData) {
    rowY += lineHeight;
    // Left cell
    if (left.label) {
      const isHeader = left.isHeader || false;
      const isSubtotal = left.isSubtotal || false;
      const amount = left.amount;
      const label = left.label;
      doc.setFontSize(fontSize);
      doc.setFont(fontBody, isHeader ? "bold" : isSubtotal ? "bolditalic" : "normal");
      doc.setTextColor(isHeader ? primaryColor : "#000");
      doc.text(label, leftX + 2, rowY);
      if (amount !== null && amount !== undefined) {
        const amountText = `Rs. ${amount.toFixed(2)}`;
        const maxX = leftX + colWidth - 2;
        doc.text(amountText, maxX, rowY, { align: "right" });
      }
    }

    // Right cell
    if (right.label) {
      const isHeader = right.isHeader || false;
      const isSubtotal = right.isSubtotal || false;
      const amount = right.amount;
      const label = right.label;
      doc.setFontSize(fontSize);
      doc.setFont(fontBody, isHeader ? "bold" : isSubtotal ? "bolditalic" : "normal");
      doc.setTextColor(isHeader ? primaryColor : "#000");
      doc.text(label, rightX + 2, rowY);
      if (amount !== null && amount !== undefined) {
        const amountText = `Rs. ${amount.toFixed(2)}`;
        const maxX = rightX + colWidth - 2;
        doc.text(amountText, maxX, rowY, { align: "right" });
      }
    }
  }

  // ── Total row ──
  rowY += lineHeight;
  doc.setDrawColor("#000");
  doc.line(margin, rowY, pageWidth - margin, rowY);
  rowY += 4;
  doc.setFont(fontBody, "bold");
  doc.setFontSize(9);
  doc.setTextColor(primaryColor);
  doc.text(`Total Expenses: Rs. ${totalExpenses.toFixed(2)}`, leftX + 2, rowY);
  doc.text(`Total Income: Rs. ${totalIncome.toFixed(2)}`, rightX + 2, rowY);

  const tableEndY = rowY + 6;

  // ── Net Profit ──
  const netY = tableEndY + 8;
  doc.setFont(fontHeading, "bold");
  doc.setFontSize(14);
  doc.setTextColor(primaryColor);
  const netLabel = netProfit >= 0 ? "Net Profit" : "Net Loss";
  doc.text(netLabel, margin, netY);
  doc.text(`Rs. ${Math.abs(netProfit).toFixed(2)}`, pageWidth - margin, netY, { align: "right" });

  const wordsY = netY + 8;
  const netWords = numberToWords(Math.abs(netProfit));
  const wordLine = (netProfit >= 0 ? "Net Profit in words: " : "Net Loss in words: ") + netWords;
  doc.setFont(fontBody, "italic");
  doc.setFontSize(9);
  doc.setTextColor("#000");

  // ✅ Wrap long words line to fit within margins
  const wrappedWords = doc.splitTextToSize(wordLine, pageWidth - 2 * margin);
  wrappedWords.forEach((line, idx) => {
    doc.text(line, pageWidth / 2, wordsY + idx * 5, { align: "center" });
  });

  // ── Footer ──
  const footerY = pageHeight - 8;
  doc.setFont(fontBody, "normal");
  doc.setFontSize(7);
  doc.setTextColor("#666");
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, footerY, { align: "left" });
  doc.text(`© ${orgName}`, pageWidth / 2, footerY, { align: "center" });
  doc.text("Page 1 of 1", pageWidth - margin, footerY, { align: "right" });

  // ── Save ──
  const fileName = `Profit_Loss_${periodLabel.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}