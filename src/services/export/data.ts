import type { Trip, TripEvent } from "../../types";
import { categories, categoryGroups } from "../../data/categories";
import { cost, money } from "../../utils/money";
import { hasUndefinedPrice } from "../../utils/eventPrice";
import { eventLabels, priorityLabels } from "../../utils/labels";

export const headers = ["Data", "Dia da semana", "Hora início", "Hora fim", "Programa", "Grupo", "Categoria", "Local", "Status", "Prioridade", "Valor", "Gratuito", "Observações"];
export interface ExportRow {
  day: string;
  cells: (string | number)[];
  valueLabel: string;
}
export function exportDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value.split("-").reverse().join("/") : "";
}
export function exportTime(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d/.test(value || "") ? value.slice(0, 5) : "";
}
export function exportFilename(title: string, extension: "pdf" | "xlsx" | "csv") {
  const slug = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90).replace(/-$/, "") || "viagem";
  return `rumo-${slug}-roteiro.${extension}`;
}
export function prepareRows(trip: Trip, events: readonly TripEvent[]): ExportRow[] {
  return [...events].sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.startTime || "").localeCompare(b.startTime || "")).map(event => {
    const category = categories.find(item => item.name === event.category);
    const group = categoryGroups.find(item => item.id === category?.group)?.label || "";
    const date = exportDate(event.date);
    const weekday = date ? new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(new Date(`${event.date}T12:00:00`)) : "";
    const missingPrice = typeof event.pricePerPerson !== "number" || typeof event.peopleCount !== "number";
    const value = event.isFree ? 0 : missingPrice ? "" : hasUndefinedPrice(event) ? "A definir" : cost(event);
    return {
      day: event.date || "",
      cells: [date, weekday, exportTime(event.startTime), exportTime(event.endTime), event.title || "", group, event.category || "", event.location || "", eventLabels[event.status] || event.status || "", priorityLabels[event.priority] || event.priority || "", value, typeof event.isFree === "boolean" ? event.isFree ? "Sim" : "Não" : "", event.notes || ""],
      valueLabel: typeof value === "number" ? money(value, trip.currency) : value,
    };
  });
}
export function groupRows(rows: ExportRow[]) {
  const groups = new Map<string, ExportRow[]>();
  for (const row of rows) groups.set(row.day, [...(groups.get(row.day) || []), row]);
  return [...groups.entries()];
}
