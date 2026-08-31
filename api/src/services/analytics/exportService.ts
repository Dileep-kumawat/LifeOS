import PDFDocument from "pdfkit";
import { getProductivityAnalytics } from "./productivityAnalyticsService.js";
import { getFinanceAnalytics } from "./financeAnalyticsService.js";
import type { ProductivityAnalytics, FinanceAnalytics } from "@lifeos/shared";

/**
 * Escapes CSV field value according to RFC 4180.
 */
function escapeCsvValue(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) {
    return "";
  }
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatCsvRow(fields: (string | number | boolean | null | undefined)[]): string {
  return fields.map(escapeCsvValue).join(",");
}

/**
 * Generates structured CSV string for Productivity Analytics.
 */
export function generateProductivityCsv(data: ProductivityAnalytics): string {
  const lines: string[] = [];

  lines.push(formatCsvRow([`LifeOS Productivity Analytics Report`]));
  lines.push(
    formatCsvRow([
      `Date Range: ${data.period.startDate} to ${data.period.endDate} (${data.period.totalDays} days)`
    ])
  );
  lines.push("");

  // 1. Summary KPIs
  lines.push(formatCsvRow(["=== SUMMARY METRICS ==="]));
  lines.push(formatCsvRow(["Metric", "Value"]));
  lines.push(formatCsvRow(["Total Focus Time (Minutes)", data.focus.totalFocusMinutes]));
  lines.push(formatCsvRow(["Total Focus Sessions", data.focus.totalSessionsCount]));
  lines.push(formatCsvRow(["Completed Focus Sessions", data.focus.completedSessionsCount]));
  lines.push(formatCsvRow(["Abandoned Focus Sessions", data.focus.abandonedSessionsCount]));
  lines.push(formatCsvRow(["Active Focus Sessions", data.focus.activeSessionsCount]));
  lines.push(formatCsvRow(["Average Session Duration (Minutes)", data.focus.averageSessionMinutes]));
  lines.push(formatCsvRow(["Total Habits Scheduled / Expected", data.habits.totalExpected]));
  lines.push(formatCsvRow(["Total Habits Completed", data.habits.totalCompleted]));
  lines.push(
    formatCsvRow(["Overall Habit Completion Rate (%)", `${Math.round(data.habits.completionRate * 100)}%`])
  );
  lines.push("");

  // 2. Habit Consistency
  lines.push(formatCsvRow(["=== HABIT CONSISTENCY ==="]));
  lines.push(
    formatCsvRow([
      "Habit Title",
      "Frequency Type",
      "Range Expected",
      "Range Completed",
      "Completion Rate (%)",
      "Current Streak",
      "Longest Streak",
      "Last Check-In Date"
    ])
  );
  for (const h of data.habitConsistency) {
    lines.push(
      formatCsvRow([
        h.title,
        h.frequency.type,
        h.rangeExpected,
        h.rangeCompleted,
        `${Math.round(h.rangeCompletionRate * 100)}%`,
        h.currentStreak,
        h.longestStreak,
        h.lastCheckInDate || "N/A"
      ])
    );
  }
  lines.push("");

  // 3. Focus Category Breakdown
  lines.push(formatCsvRow(["=== FOCUS BY LINKED CATEGORY ==="]));
  lines.push(formatCsvRow(["Linked Type", "Total Minutes", "Session Count", "Percentage (%)"]));
  for (const f of data.focus.linkedTypeBreakdown) {
    lines.push(formatCsvRow([f.linkedType, f.totalMinutes, f.count, `${f.percentage}%`]));
  }
  lines.push("");

  // 4. Daily Trend
  lines.push(formatCsvRow(["=== DAILY PRODUCTIVITY TREND ==="]));
  lines.push(
    formatCsvRow([
      "Date",
      "Focus Minutes",
      "Completed Sessions",
      "Abandoned Sessions",
      "Habits Completed",
      "Habits Expected"
    ])
  );
  for (const t of data.trend) {
    lines.push(
      formatCsvRow([
        t.date,
        t.focusMinutes,
        t.completedSessions,
        t.abandonedSessions,
        t.habitsCompleted,
        t.habitsExpected
      ])
    );
  }

  return lines.join("\r\n");
}

/**
 * Generates structured CSV string for Finance Analytics.
 */
export function generateFinanceCsv(data: FinanceAnalytics): string {
  const lines: string[] = [];

  lines.push(formatCsvRow([`LifeOS Financial Analytics Report`]));
  lines.push(
    formatCsvRow([
      `Date Range: ${data.period.startDate} to ${data.period.endDate} (${data.period.totalDays} days)`
    ])
  );
  lines.push("");

  // 1. Summary KPIs
  lines.push(formatCsvRow(["=== FINANCIAL SUMMARY ==="]));
  lines.push(formatCsvRow(["Metric", "Amount ($)"]));
  lines.push(formatCsvRow(["Total Income", data.summary.totalIncome.toFixed(2)]));
  lines.push(formatCsvRow(["Total Expense", data.summary.totalExpense.toFixed(2)]));
  lines.push(formatCsvRow(["Net Savings", data.summary.netSavings.toFixed(2)]));
  lines.push(formatCsvRow(["Savings Rate (%)", `${data.summary.savingsRate.toFixed(1)}%`]));
  lines.push(formatCsvRow(["Total Transactions", data.summary.transactionCount]));
  lines.push("");

  // 2. Category Breakdown
  lines.push(formatCsvRow(["=== CATEGORY BREAKDOWN ==="]));
  lines.push(
    formatCsvRow(["Category", "Type", "Total Amount ($)", "Transaction Count", "Share (%)"])
  );
  for (const c of data.categoryBreakdown) {
    lines.push(
      formatCsvRow([
        c.category,
        c.type,
        c.totalAmount.toFixed(2),
        c.count,
        `${c.percentage}%`
      ])
    );
  }
  lines.push("");

  // 3. Budget Adherence
  lines.push(formatCsvRow(["=== BUDGET ADHERENCE ==="]));
  lines.push(
    formatCsvRow([
      "Category",
      "Monthly Limit ($)",
      "Actual Spend ($)",
      "Used (%)",
      "Status",
      "Over Budget"
    ])
  );
  for (const b of data.budgetAdherence.budgets) {
    lines.push(
      formatCsvRow([
        b.category,
        b.limit.toFixed(2),
        b.actualSpend.toFixed(2),
        `${b.percentUsed}%`,
        b.status.toUpperCase(),
        b.isOverBudget ? "YES" : "NO"
      ])
    );
  }
  lines.push("");

  // 4. Trend
  lines.push(formatCsvRow(["=== INCOME & SPEND TREND ==="]));
  lines.push(formatCsvRow(["Period", "Income ($)", "Expense ($)", "Net ($)"]));
  for (const tr of data.trend) {
    lines.push(
      formatCsvRow([
        tr.period,
        tr.income.toFixed(2),
        tr.expense.toFixed(2),
        tr.net.toFixed(2)
      ])
    );
  }

  return lines.join("\r\n");
}

/**
 * Generates a clean, styled PDF buffer for Productivity Analytics.
 */
export async function generateProductivityPdf(data: ProductivityAnalytics): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Header Banner
      doc
        .fontSize(22)
        .fillColor("#1e293b")
        .text("LifeOS Productivity Report", { underline: false });
      doc
        .fontSize(10)
        .fillColor("#64748b")
        .text(`Date Range: ${data.period.startDate} to ${data.period.endDate} (${data.period.totalDays} days)`);
      doc.text(`Generated: ${new Date().toISOString().replace("T", " ").substring(0, 19)} UTC`);
      doc.moveDown(1);

      // Divider
      doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // Section 1: KPI Summary
      doc.fontSize(14).fillColor("#0f172a").text("Executive Summary", { bold: true } as any);
      doc.moveDown(0.5);

      const kpiTop = doc.y;
      // Focus Card
      doc.rect(40, kpiTop, 240, 70).fillAndStroke("#f8fafc", "#e2e8f0");
      doc.fillColor("#3b82f6").fontSize(11).text("Focus Time", 55, kpiTop + 10);
      doc.fillColor("#0f172a").fontSize(18).text(`${data.focus.totalFocusMinutes} mins`, 55, kpiTop + 25);
      doc.fillColor("#64748b").fontSize(9).text(`${data.focus.completedSessionsCount} completed sessions | Avg ${data.focus.averageSessionMinutes}m`, 55, kpiTop + 50);

      // Habit Card
      doc.rect(300, kpiTop, 240, 70).fillAndStroke("#f8fafc", "#e2e8f0");
      doc.fillColor("#10b981").fontSize(11).text("Habit Completion", 315, kpiTop + 10);
      doc.fillColor("#0f172a").fontSize(18).text(`${Math.round(data.habits.completionRate * 100)}%`, 315, kpiTop + 25);
      doc.fillColor("#64748b").fontSize(9).text(`${data.habits.totalCompleted} of ${data.habits.totalExpected} scheduled check-ins`, 315, kpiTop + 50);

      doc.y = kpiTop + 85;
      doc.moveDown(0.5);

      // Section 2: Habit Consistency Table
      doc.fontSize(13).fillColor("#0f172a").text("Habit Consistency Breakdown");
      doc.moveDown(0.5);

      // Table Header
      let tableY = doc.y;
      doc.rect(40, tableY, 515, 20).fill("#f1f5f9");
      doc.fillColor("#334155").fontSize(9);
      doc.text("Habit", 48, tableY + 5, { width: 160 });
      doc.text("Type", 215, tableY + 5, { width: 60 });
      doc.text("Expected", 280, tableY + 5, { width: 55, align: "right" });
      doc.text("Done", 345, tableY + 5, { width: 45, align: "right" });
      doc.text("Rate", 400, tableY + 5, { width: 50, align: "right" });
      doc.text("Streak", 460, tableY + 5, { width: 45, align: "right" });
      doc.text("Best", 510, tableY + 5, { width: 40, align: "right" });

      tableY += 22;

      if (data.habitConsistency.length === 0) {
        doc.fillColor("#64748b").fontSize(9).text("No habits recorded for this period.", 48, tableY + 5);
        tableY += 20;
      } else {
        for (const h of data.habitConsistency) {
          if (tableY > 730) {
            doc.addPage();
            tableY = 40;
          }
          doc.rect(40, tableY, 515, 18).fill(tableY % 36 === 0 ? "#f8fafc" : "#ffffff");
          doc.fillColor("#1e293b").fontSize(9);
          doc.text(h.title.length > 26 ? h.title.substring(0, 24) + "..." : h.title, 48, tableY + 4, { width: 160 });
          doc.text(h.frequency.type, 215, tableY + 4, { width: 60 });
          doc.text(String(h.rangeExpected), 280, tableY + 4, { width: 55, align: "right" });
          doc.text(String(h.rangeCompleted), 345, tableY + 4, { width: 45, align: "right" });
          doc.text(`${Math.round(h.rangeCompletionRate * 100)}%`, 400, tableY + 4, { width: 50, align: "right" });
          doc.text(String(h.currentStreak), 460, tableY + 4, { width: 45, align: "right" });
          doc.text(String(h.longestStreak), 510, tableY + 4, { width: 40, align: "right" });
          tableY += 19;
        }
      }

      doc.y = tableY + 10;
      doc.moveDown(0.5);

      // Section 3: Focus Breakdown
      if (doc.y > 660) doc.addPage();
      doc.fontSize(13).fillColor("#0f172a").text("Focus Distribution by Goal / Category");
      doc.moveDown(0.5);

      tableY = doc.y;
      doc.rect(40, tableY, 515, 20).fill("#f1f5f9");
      doc.fillColor("#334155").fontSize(9);
      doc.text("Linked Entity", 48, tableY + 5, { width: 160 });
      doc.text("Total Focus Time", 220, tableY + 5, { width: 110, align: "right" });
      doc.text("Sessions", 350, tableY + 5, { width: 80, align: "right" });
      doc.text("Share (%)", 450, tableY + 5, { width: 95, align: "right" });
      tableY += 22;

      for (const item of data.focus.linkedTypeBreakdown) {
        doc.rect(40, tableY, 515, 18).fill("#ffffff");
        doc.fillColor("#1e293b").fontSize(9);
        doc.text(item.linkedType.toUpperCase(), 48, tableY + 4, { width: 160 });
        doc.text(`${item.totalMinutes} mins`, 220, tableY + 4, { width: 110, align: "right" });
        doc.text(String(item.count), 350, tableY + 4, { width: 80, align: "right" });
        doc.text(`${item.percentage}%`, 450, tableY + 4, { width: 95, align: "right" });
        tableY += 19;
      }

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor("#94a3b8").fontSize(8).text(`Page ${i + 1} of ${pages.count} — LifeOS Analytics`, 40, 790, {
          align: "center",
          width: 515
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generates a clean, styled PDF buffer for Finance Analytics.
 */
export async function generateFinancePdf(data: FinanceAnalytics): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Header Banner
      doc.fontSize(22).fillColor("#1e293b").text("LifeOS Financial Report");
      doc
        .fontSize(10)
        .fillColor("#64748b")
        .text(`Date Range: ${data.period.startDate} to ${data.period.endDate} (${data.period.totalDays} days)`);
      doc.text(`Generated: ${new Date().toISOString().replace("T", " ").substring(0, 19)} UTC`);
      doc.moveDown(1);

      // Divider
      doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // Section 1: KPI Summary
      doc.fontSize(14).fillColor("#0f172a").text("Financial Summary");
      doc.moveDown(0.5);

      const kpiTop = doc.y;
      // Income Card
      doc.rect(40, kpiTop, 160, 65).fillAndStroke("#f0fdf4", "#bbf7d0");
      doc.fillColor("#15803d").fontSize(10).text("Total Income", 50, kpiTop + 10);
      doc.fillColor("#166534").fontSize(16).text(`$${data.summary.totalIncome.toFixed(2)}`, 50, kpiTop + 25);
      doc.fillColor("#64748b").fontSize(8).text(`${data.summary.transactionCount} transactions logged`, 50, kpiTop + 48);

      // Expense Card
      doc.rect(215, kpiTop, 160, 65).fillAndStroke("#fef2f2", "#fecaca");
      doc.fillColor("#b91c1c").fontSize(10).text("Total Expenses", 225, kpiTop + 10);
      doc.fillColor("#991b1b").fontSize(16).text(`$${data.summary.totalExpense.toFixed(2)}`, 225, kpiTop + 25);
      doc.fillColor("#64748b").fontSize(8).text(`Spent over ${data.period.totalDays} days`, 225, kpiTop + 48);

      // Net Savings Card
      doc.rect(390, kpiTop, 165, 65).fillAndStroke("#f8fafc", "#e2e8f0");
      doc.fillColor("#0284c7").fontSize(10).text("Net Savings", 400, kpiTop + 10);
      doc.fillColor("#0369a1").fontSize(16).text(`$${data.summary.netSavings.toFixed(2)}`, 400, kpiTop + 25);
      doc.fillColor("#64748b").fontSize(8).text(`Savings Rate: ${data.summary.savingsRate.toFixed(1)}%`, 400, kpiTop + 48);

      doc.y = kpiTop + 80;
      doc.moveDown(0.5);

      // Section 2: Budget Adherence
      doc.fontSize(13).fillColor("#0f172a").text(`Budget Performance (${Math.round(data.budgetAdherence.adherenceRate * 100)}% On-Track)`);
      doc.moveDown(0.5);

      let tableY = doc.y;
      doc.rect(40, tableY, 515, 20).fill("#f1f5f9");
      doc.fillColor("#334155").fontSize(9);
      doc.text("Category", 48, tableY + 5, { width: 150 });
      doc.text("Limit ($)", 210, tableY + 5, { width: 75, align: "right" });
      doc.text("Actual Spend ($)", 295, tableY + 5, { width: 85, align: "right" });
      doc.text("Used (%)", 390, tableY + 5, { width: 65, align: "right" });
      doc.text("Status", 470, tableY + 5, { width: 80, align: "right" });
      tableY += 22;

      if (data.budgetAdherence.budgets.length === 0) {
        doc.fillColor("#64748b").fontSize(9).text("No active budgets configured.", 48, tableY + 5);
        tableY += 20;
      } else {
        for (const b of data.budgetAdherence.budgets) {
          if (tableY > 730) {
            doc.addPage();
            tableY = 40;
          }
          doc.rect(40, tableY, 515, 18).fill("#ffffff");
          doc.fillColor("#1e293b").fontSize(9);
          doc.text(b.category, 48, tableY + 4, { width: 150 });
          doc.text(`$${b.limit.toFixed(2)}`, 210, tableY + 4, { width: 75, align: "right" });
          doc.text(`$${b.actualSpend.toFixed(2)}`, 295, tableY + 4, { width: 85, align: "right" });
          doc.text(`${b.percentUsed}%`, 390, tableY + 4, { width: 65, align: "right" });

          if (b.isOverBudget) {
            doc.fillColor("#dc2626").text("EXCEEDED", 470, tableY + 4, { width: 80, align: "right" });
          } else if (b.percentUsed >= 85) {
            doc.fillColor("#d97706").text("WARNING", 470, tableY + 4, { width: 80, align: "right" });
          } else {
            doc.fillColor("#16a34a").text("ON TRACK", 470, tableY + 4, { width: 80, align: "right" });
          }
          tableY += 19;
        }
      }

      doc.y = tableY + 10;
      doc.moveDown(0.5);

      // Section 3: Category Breakdown
      if (doc.y > 640) doc.addPage();
      doc.fontSize(13).fillColor("#0f172a").text("Spending & Income by Category");
      doc.moveDown(0.5);

      tableY = doc.y;
      doc.rect(40, tableY, 515, 20).fill("#f1f5f9");
      doc.fillColor("#334155").fontSize(9);
      doc.text("Category", 48, tableY + 5, { width: 160 });
      doc.text("Type", 215, tableY + 5, { width: 60 });
      doc.text("Total ($)", 290, tableY + 5, { width: 85, align: "right" });
      doc.text("Tx Count", 390, tableY + 5, { width: 65, align: "right" });
      doc.text("Share (%)", 470, tableY + 5, { width: 80, align: "right" });
      tableY += 22;

      for (const cat of data.categoryBreakdown) {
        if (tableY > 730) {
          doc.addPage();
          tableY = 40;
        }
        doc.rect(40, tableY, 515, 18).fill("#ffffff");
        doc.fillColor("#1e293b").fontSize(9);
        doc.text(cat.category, 48, tableY + 4, { width: 160 });
        doc.text(cat.type.toUpperCase(), 215, tableY + 4, { width: 60 });
        doc.text(`$${cat.totalAmount.toFixed(2)}`, 290, tableY + 4, { width: 85, align: "right" });
        doc.text(String(cat.count), 390, tableY + 4, { width: 65, align: "right" });
        doc.text(`${cat.percentage}%`, 470, tableY + 4, { width: 80, align: "right" });
        tableY += 19;
      }

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor("#94a3b8").fontSize(8).text(`Page ${i + 1} of ${pages.count} — LifeOS Analytics`, 40, 790, {
          align: "center",
          width: 515
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Controller service to generate CSV or PDF export for productivity or finance analytics.
 */
export async function generateAnalyticsExport(
  userId: string,
  type: "productivity" | "finance",
  format: "csv" | "pdf",
  startDate: string,
  endDate: string
): Promise<{
  content: string | Buffer;
  contentType: string;
  filename: string;
}> {
  const startClean = startDate.split("T")[0];
  const endClean = endDate.split("T")[0];
  const filename = `lifeos-${type}-${startClean}-to-${endClean}.${format}`;

  if (type === "productivity") {
    const data = await getProductivityAnalytics(userId, startDate, endDate);
    if (format === "csv") {
      const csv = generateProductivityCsv(data);
      return {
        content: csv,
        contentType: "text/csv; charset=utf-8",
        filename
      };
    } else {
      const pdfBuffer = await generateProductivityPdf(data);
      return {
        content: pdfBuffer,
        contentType: "application/pdf",
        filename
      };
    }
  } else {
    const data = await getFinanceAnalytics(userId, startDate, endDate);
    if (format === "csv") {
      const csv = generateFinanceCsv(data);
      return {
        content: csv,
        contentType: "text/csv; charset=utf-8",
        filename
      };
    } else {
      const pdfBuffer = await generateFinancePdf(data);
      return {
        content: pdfBuffer,
        contentType: "application/pdf",
        filename
      };
    }
  }
}
