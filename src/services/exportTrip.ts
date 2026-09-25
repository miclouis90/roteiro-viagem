import type { Trip, TripEvent } from "../types";
import { exportFilename, prepareRows } from "./export/data";
import { createCsv } from "./export/csv";
export type ExportFormat = "PDF" | "Excel" | "CSV";
export async function buildTripExport(trip: Trip, events: readonly TripEvent[], format: ExportFormat) {
  const rows = prepareRows(trip, events);
  if (format === "CSV") return { data: createCsv(rows), type: "text/csv;charset=utf-8", filename: exportFilename(trip.title, "csv") };
  if (format === "Excel") {
    const { createExcel } = await import("./export/excel");
    return { data: await createExcel(rows, trip.currency), type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename: exportFilename(trip.title, "xlsx") };
  }
  const { createPdf } = await import("./export/pdf");
  return { data: await createPdf(trip, rows), type: "application/pdf", filename: exportFilename(trip.title, "pdf") };
}
export async function exportTrip(trip: Trip, events: readonly TripEvent[], format: ExportFormat) {
  const file = await buildTripExport(trip, events, format);
  const blob = new Blob([file.data], { type: file.type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = file.filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
