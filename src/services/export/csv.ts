import { headers, type ExportRow } from "./data";
export function csvCell(value: string | number) {
  let text = String(value);
  // Spreadsheet applications must treat user text as text, never a formula.
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function createCsv(rows: ExportRow[]) {
  return "\uFEFF" + [headers, ...rows.map(row => row.cells.map((cell, index) => index === 10 ? row.valueLabel : cell))].map(row => row.map(csvCell).join(";")).join("\r\n");
}
