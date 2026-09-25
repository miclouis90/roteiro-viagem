import { headers, type ExportRow } from "./data";
export async function createExcel(rows: ExportRow[], currency: string) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Roteiro", { views: [{ state: "frozen", ySplit: 1 }] });
  const widths = [14, 22, 13, 13, 38, 18, 22, 36, 17, 20, 20, 12, 55];
  sheet.columns = headers.map((header, index) => ({ header, width: widths[index] }));
  for (const row of rows) sheet.addRow(row.cells);
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, rows.length + 1), column: headers.length } };
  sheet.eachRow((row, index) => {
    row.alignment = { vertical: "top", wrapText: true };
    row.font = { name: "Calibri", size: 11 };
    if (index === 1) {
      row.height = 30;
      row.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF126B60" } };
    }
  });
  const symbol = new Intl.NumberFormat("pt-BR", { style: "currency", currency }).formatToParts(0).find(part => part.type === "currency")?.value || currency;
  sheet.getColumn(11).numFmt = `"${symbol.replace(/"/g, '""')}" #,##0.00`;
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
