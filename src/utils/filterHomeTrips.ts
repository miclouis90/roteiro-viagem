import type { Trip, TripStatus } from "../types";
import { dateKey } from "./dates";
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
export function filterHomeTrips(trips: readonly Trip[], query: string, status: TripStatus | "", today = dateKey(), selectedDate = "") {
  const term = normalize(query);
  const filtered = trips.filter(t => (!status || t.status === status) && (!selectedDate || (t.startDate <= selectedDate && selectedDate <= t.endDate)) && normalize(`${t.title} ${t.destinationCity} ${t.destinationState} ${t.country}`).includes(term));
  const upcoming = filtered.filter(t => t.endDate >= today).sort((a,b) => a.startDate.localeCompare(b.startDate));
  const ids = new Set(upcoming.map(t => t.id));
  return { upcoming, others: filtered.filter(t => !ids.has(t.id)).sort((a,b) => b.startDate.localeCompare(a.startDate)) };
}
export function groupTripHistory(trips: readonly Trip[]) {
  const years = new Map<string, Trip[]>();
  for (const trip of [...trips].sort((a, b) => b.startDate.localeCompare(a.startDate) || a.id.localeCompare(b.id))) {
    const year = /^\d{4}-/.test(trip.startDate) ? trip.startDate.slice(0, 4) : "Sem ano";
    const items = years.get(year) || [];
    items.push(trip); years.set(year, items);
  }
  return [...years].sort(([a], [b]) => b.localeCompare(a)).map(([year, items]) => ({ year, trips: items }));
}
