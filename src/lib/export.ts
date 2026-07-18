/**
 * ABW-BOS Export Utilities
 *
 * Client-side CSV and Excel export helpers.
 * - CSV: native, no dependencies, opens in Excel/Sheets
 * - Excel: uses SheetJS-style XML (Excel 2003 XML / SpreadsheetML), opens in Excel
 * - PDF: uses browser's print dialog (window.print with print-specific CSS)
 *
 * For server-side document generation (PDF with logo, Word .docx), see
 * /api/export/* routes which use puppeteer/docx libraries.
 */

/**
 * Convert an array of objects to CSV.
 * Handles commas, quotes, newlines in values by quoting.
 */
export function toCSV(rows: Record<string, unknown>[], columns?: string[]): string {
  if (!rows || rows.length === 0) return "";
  const cols = columns ?? Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    if (v == null) return "";
    let s = typeof v === "object" ? JSON.stringify(v) : String(v);
    // Strip ISO date to readable format
    if (/^\d{4}-\d{2}-\d{2}T/.test(s) && s.length < 30) {
      try {
        s = new Date(s).toLocaleString();
      } catch { /* ignore */ }
    }
    if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      s = `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(",")).join("\n");
  return header + "\n" + body;
}

/**
 * Trigger a browser download of a text file.
 */
export function downloadText(filename: string, content: string, mimeType = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF" + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export rows as a CSV file.
 */
export function exportCSV(filename: string, rows: Record<string, unknown>[], columns?: string[]) {
  const csv = toCSV(rows, columns);
  downloadText(filename.endsWith(".csv") ? filename : `${filename}.csv`, csv);
}

/**
 * Export rows as an Excel-compatible XML file (SpreadsheetML 2003).
 * Opens in Excel, LibreOffice Calc, Google Sheets.
 */
export function exportExcel(filename: string, rows: Record<string, unknown>[], sheetName = "Sheet1") {
  if (!rows || rows.length === 0) {
    downloadText(filename.endsWith(".xls") ? filename : `${filename}.xls`, "");
    return;
  }
  const cols = Object.keys(rows[0]);
  const escapeXml = (s: string): string =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const cellType = (v: unknown): string => {
    if (typeof v === "number") return "Number";
    if (typeof v === "boolean") return "Boolean";
    return "String";
  };

  const cellValue = (v: unknown): string => {
    if (v == null) return "";
    if (typeof v === "object") return escapeXml(JSON.stringify(v));
    let s = String(v);
    if (/^\d{4}-\d{2}-\d{2}T/.test(s) && s.length < 30) {
      try { s = new Date(s).toLocaleString(); } catch { /* ignore */ }
    }
    return escapeXml(s);
  };

  const headerRow = cols.map((c) => `<Cell><Data ss:Type="String">${escapeXml(c)}</Data></Cell>`).join("");
  const bodyRows = rows.map((r) =>
    `<Row>${cols.map((c) => `<Cell><Data ss:Type="${cellType(r[c])}">${cellValue(r[c])}</Data></Cell>`).join("")}</Row>`,
  ).join("");

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>
   <Row>${headerRow}</Row>
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`;

  downloadText(
    filename.endsWith(".xls") ? filename : `${filename}.xls`,
    xml,
    "application/vnd.ms-excel;charset=utf-8",
  );
}

/**
 * Trigger the browser's print dialog for a given HTML string.
 * Opens a new window, writes the HTML, and prints.
 */
export function printHTML(html: string, title = "ABW-BOS Print", customCss?: string) {
  const w = window.open("", "_blank", "width=800,height=600");
  if (!w) {
    alert("Please allow pop-ups to print.");
    return;
  }
  const defaultCss = `
    body { font-family: 'Times New Roman', Times, serif; color: #1a1a1a; padding: 24px; }
    h1 { color: #1b6d97; font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th { background: #f1f5f9; text-align: left; padding: 6px 8px; border-bottom: 2px solid #cbd5e1; font-weight: 600; }
    td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) { background: #f8fafc; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .muted { color: #64748b; font-size: 11px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .brand { font-size: 24px; font-weight: bold; color: #1b6d97; }
    .meta { text-align: right; font-size: 11px; color: #64748b; }
    .totals { margin-top: 16px; margin-left: auto; width: 300px; }
    .totals td { border: none; padding: 4px 8px; }
    .totals .total { font-weight: bold; border-top: 2px solid #1b6d97; font-size: 14px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-danger { background: #fee2e2; color: #b91c1c; }
    .badge-info { background: #dbeafe; color: #1d4ed8; }
    .badge-muted { background: #f1f5f9; color: #475569; }
    @page { margin: 20mm 15mm; }
    @media print { body { padding: 0; } }
  `;
  w.document.write(`<!DOCTYPE html>
<html>
<head>
<title>${title}</title>
<meta charset="utf-8">
<style>${customCss || defaultCss}</style>
</head>
<body>${html}</body>
</html>`);
  w.document.close();
  setTimeout(() => {
    w.focus();
    w.print();
  }, 300);
}

/**
 * Format a number as Indian currency (₹).
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

/**
 * Format a date as DD/MM/YYYY.
 */
export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
