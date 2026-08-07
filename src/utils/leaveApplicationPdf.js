import { jsPDF } from "jspdf";
import { montserratRegularBase64, montserratBoldBase64 } from './fonts';

// ─── Helper: get status colour ─────────────────────────────
function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case "approved": return "#2E7D32";
    case "rejected": return "#C62828";
    case "pending": return "#ED6C02";
    default: return "#666";
  }
}

// ─── Helper: format date ──────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── Helper: calculate days between two dates ────────────
function calculateDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export async function generateLeaveApplicationPdf(leaveRecord, teacher, org, options = {}, theme = {}) {
  const { autoPrint = false } = options;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

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
  const margin = 18;
  let y = 20;

  // Use Montserrat – your theme already uses Montserrat
  const fontHeading = "Montserrat";
  const fontBody = "Montserrat";

  // ── Status badge ─────────────────────────────────────────────
  const statusText = leaveRecord.status?.toUpperCase() || "PENDING";
  const statusColor = getStatusColor(leaveRecord.status);
  doc.setFont(fontHeading, "bold");
  doc.setFontSize(12);
  doc.setTextColor(statusColor);
  doc.text(`STATUS: ${statusText}`, pageWidth - margin, y, { align: "right" });
  y += 8;

  // ── Sender details (right‑aligned block, text aligned left) ──
  const teacherName = `${teacher?.first_name || ""} ${teacher?.last_name || ""}`.trim() || "N/A";
  const empCode = teacher?.employee_code || "";
  const mobile = teacher?.mobile || "";
  const email = teacher?.email || "";

  const rightBlockX = pageWidth - margin - 60;
  let senderY = y;

  doc.setFont(fontBody, "normal");
  doc.setFontSize(10);
  doc.setTextColor("#333");
  doc.text(`From:`, rightBlockX, senderY);
  senderY += 5;
  doc.setFont(fontHeading, "bold");
  doc.text(teacherName, rightBlockX, senderY);
  senderY += 5;
  doc.setFont(fontBody, "normal");

  if (empCode) {
    doc.text(`Employee Code: ${empCode}`, rightBlockX, senderY);
    senderY += 5;
  }
  if (mobile) {
    doc.text(`Mobile: ${mobile}`, rightBlockX, senderY);
    senderY += 5;
  }
  if (email) {
    doc.text(`Email: ${email}`, rightBlockX, senderY);
    senderY += 5;
  }

  senderY += 3;
  y = senderY;

  // ── Date (right‑aligned, below sender details) ───────────────
  const applicationDate = leaveRecord.created_at ? formatDate(leaveRecord.created_at) : formatDate(new Date());
  doc.setFont(fontBody, "normal");
  doc.setFontSize(10);
  doc.text(`Date: ${applicationDate}`, pageWidth - margin, y, { align: "right" });
  y += 10;

  // ── To: (Recipient) ─────────────────────────────────────────
  const branchName = org?.branches?.find(b => b.id === leaveRecord.branch_id)?.branch_name || "";
  doc.setFont(fontBody, "normal");
  doc.text(`To,`, margin, y);
  y += 5;
  doc.setFont(fontHeading, "bold");
  doc.text(`The Branch Manager`, margin, y);
  y += 5;
  doc.text(`${branchName || "Branch"}`, margin, y);
  y += 5;
  doc.text(`${org?.company_name || "Academy"}`, margin, y);
  y += 10;

  // ── Subject ──────────────────────────────────────────────────
  const reasonText = leaveRecord.reason || "Personal";
  doc.setFont(fontHeading, "bold");
  doc.text(`Subject: Leave Application for ${reasonText}`, margin, y);
  y += 8;

  // ── Salutation ──────────────────────────────────────────────
  doc.setFont(fontBody, "normal");
  doc.text(`Respected Sir/Madam,`, margin, y);
  y += 8;

  // ── Body ────────────────────────────────────────────────────
  const startDate = formatDate(leaveRecord.start_date);
  const endDate = formatDate(leaveRecord.end_date);
  const days = calculateDays(leaveRecord.start_date, leaveRecord.end_date);
  const reason = leaveRecord.reason || "Not specified";

  const bodyLines = [
    `I, ${teacherName} (${empCode}), am writing to request leave from ${startDate} to ${endDate} (${days} day${days > 1 ? "s" : ""}).`,
    `I kindly request you to grant me leave for the mentioned period.`,
    `I will ensure that my pending tasks are handed over properly before the leave.`,
  ];

  doc.setFont(fontBody, "normal");
  bodyLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 5 + 2;
  });
  y += 4;

  // ── Admin remarks (if any) ──────────────────────────────────
  if (leaveRecord.admin_remarks) {
    doc.setFont(fontBody, "italic");
    doc.setTextColor("#666");
    doc.text(`Admin Remarks: ${leaveRecord.admin_remarks}`, margin, y);
    y += 8;
    doc.setTextColor("#333");
    doc.setFont(fontBody, "normal");
  }

  // ── Request for approval ────────────────────────────────────
  doc.text(`I request you to kindly approve my leave application.`, margin, y);
  y += 8;
  doc.text(`Thanking you,`, margin, y);
  y += 8;

  // ── Signature (right‑aligned block) ──────────────────────────
  const sigBlockX = pageWidth - margin - 60;
  let sigY = y;

  doc.setFont(fontHeading, "bold");
  doc.text(`Yours sincerely,`, sigBlockX, sigY);
  sigY += 10;
  doc.setFont(fontBody, "normal");
  doc.text(`( ${teacherName} )`, sigBlockX, sigY);
  sigY += 8;
  doc.text(`Signature: ________________________`, sigBlockX, sigY);
  y = sigY + 10;

  // ── For office use ──────────────────────────────────────────
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  doc.setFont(fontHeading, "bold");
  doc.setTextColor("#0D47A1");
  doc.text("FOR OFFICE USE", margin, y);
  y += 6;
  doc.setFont(fontBody, "normal");
  doc.setTextColor("#333");
  doc.text(`Status: ${statusText}`, margin, y);
  y += 5;
  doc.text(`Approved / Rejected by: ________________________`, margin, y);
  y += 5;
  doc.text(`Date: ____________`, margin, y);

  // ── Footer ──────────────────────────────────────────────────
  const footerY = pageHeight - 12;
  doc.setFont(fontBody, "italic");
  doc.setFontSize(7);
  doc.setTextColor("#999");
  const dateStr = new Date().toLocaleString();
  doc.text(`Generated on ${dateStr}`, margin, footerY);
  doc.text(`© ${org?.company_name || "Academy"}`, pageWidth / 2, footerY, { align: "center" });

  if (autoPrint) {
    doc.autoPrint();
  }

  return doc;
}