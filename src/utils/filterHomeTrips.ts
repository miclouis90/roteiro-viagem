import type { Trip, TripStatus } from "../types";
import { dateKey } from "./dates";
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
export function filterHomeTrips(trips: readonly Trip[], query: string, status: TripStatus | "", today = dateKey(), selectedDate = "") {
  const term = normalize(query);
  const filtered = trips.filter(t => (!status || t.status === status) && (!selectedDate || (t.startDate <= selectedDate && selectedDate <= t.endDate)) && normalize(`${t.title} ${t.destinationCity} ${t.destinationState} ${t.country}`).includes(term));
  const upcoming = filtered.filter(t => t.startDate > today && t.status !== "concluída").sort((a,b) => a.startDate.localeCompare(b.startDate));
  const ids = new Set(upcoming.map(t => t.id));
  return { upcoming, others: filtered.filter(t => !ids.has(t.id)).sort((a,b) => b.startDate.localeCompare(a.startDate)) };
}
