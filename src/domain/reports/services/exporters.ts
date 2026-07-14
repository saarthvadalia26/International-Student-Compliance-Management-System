/**
 * Exporter service handles formatting report rows for export formats (CSV and Excel)
 * and applies default security masking to PII like Passport, Visa, and eFRRO numbers.
 */

export class ExporterService {
  /**
   * Masks sensitive identifier numbers to preserve student privacy.
   * Format: Displays only the last 4 characters, prefixing the rest with asterisks.
   */
  static maskIdentifier(id: string | null | undefined): string {
    if (!id) return "N/A";
    const trimmed = id.trim();
    if (trimmed.length <= 4) return "****";
    return "*".repeat(trimmed.length - 4) + trimmed.slice(-4);
  }

  /**
   * Compiles rows into a standard RFC 4180 compliant CSV format.
   */
  static exportToCsv(headers: string[], rows: string[][]): string {
    const formatCell = (cell: string) => {
      const escaped = cell.replace(/"/g, '""');
      if (escaped.includes(",") || escaped.includes("\n") || escaped.includes('"')) {
        return `"${escaped}"`;
      }
      return escaped;
    };

    const csvRows = [];
    csvRows.push(headers.map(formatCell).join(","));

    for (const row of rows) {
      csvRows.push(row.map(formatCell).join(","));
    }

    return csvRows.join("\n");
  }

  /**
   * Compiles rows into an Excel-compatible HTML/XML Spreadsheet format.
   */
  static exportToExcel(headers: string[], rows: string[][]): string {
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">\n`;
    html += `<head>\n<meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>\n`;
    html += `<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Report Export</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->\n`;
    html += `<style>td { border: 0.5pt solid #ccc; font-family: sans-serif; }</style>\n</head>\n<body>\n<table>\n`;
    
    // Write headers
    html += `  <tr style="background-color: #f3f4f6; font-weight: bold;">\n`;
    for (const h of headers) {
      html += `    <td>${h}</td>\n`;
    }
    html += `  </tr>\n`;

    // Write rows
    for (const row of rows) {
      html += `  <tr>\n`;
      for (const cell of row) {
        html += `    <td>${cell}</td>\n`;
      }
      html += `  </tr>\n`;
    }

    html += `</table>\n</body>\n</html>`;
    return html;
  }
}
