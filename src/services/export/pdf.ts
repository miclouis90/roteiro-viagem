import type { Trip } from "../../types";
import { exportDate, groupRows, type ExportRow } from "./data";
export async function createPdf(trip: Trip, rows: ExportRow[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ format: "a4", unit: "mm", compress: true });
  const left = 17, width = 176, bottom = 279;
  let y = 20;
  function page() { doc.addPage(); y = 20; }
  function text(value: string, size = 10, bold = false, teal = false) {
    if (!value) return;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    if (teal) doc.setTextColor(18, 107, 96);
    else doc.setTextColor(36, 49, 61);
    const lines = doc.splitTextToSize(value, width) as string[];
    for (const line of lines) {
      if (y + size * .45 > bottom) page();
      doc.text(line, left, y);
      y += size * .45;
    }
  }
  text(trip.title, 20, true, true);
  text([trip.destinationCity, trip.destinationState].filter(Boolean).join(" · "), 11);
  text([exportDate(trip.startDate), exportDate(trip.endDate)].filter(Boolean).join(" — "), 10);
  y += 8;
  if (!rows.length) text("Nenhum programa cadastrado.");
  for (const [, programs] of groupRows(rows)) {
    if (y > bottom - 35) page();
    text([programs[0].cells[1], programs[0].cells[0]].filter(Boolean).join(" · ").toUpperCase(), 11, true, true);
    y += 3;
    for (const row of programs) {
      if (y > bottom - 30) page();
      const c = row.cells;
      text([c[2], c[3]].filter(Boolean).join(" — "), 10, true);
      text(String(c[4]), 12, true);
      text([c[5], c[6], c[7]].filter(Boolean).join(" · "));
      text([c[8], c[9], row.valueLabel, c[11] === "Sim" ? "Gratuito" : ""].filter(Boolean).join(" · "), 9);
      text(String(c[12]), 9);
      y += 5;
    }
    y += 3;
  }
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(88, 101, 116);
    doc.text(`Rumo · ${i} / ${total}`, 193, 289, { align: "right" });
  }
  return new Uint8Array(doc.output("arraybuffer"));
}
