import type { TripEvent } from "../types";
import type { Filters } from "../components/trip/EventFilters";
import { categoryOf, categoryGroups } from "../data/categories";
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
export function filterEvents(events: TripEvent[], f: Filters) {
  return [...events]
    .filter(
      (e) =>
        (!f.search ||
          normalize(`${e.title} ${e.description} ${e.location} ${e.category} ${categoryGroups.find(group => group.id === categoryOf(e.category).group)?.label || ""}`)
            .includes(normalize(f.search))) &&
        (!f.date || e.date === f.date) &&
        (!f.category || e.category === f.category) &&
        (!f.group || categoryOf(e.category).group === f.group) &&
        (!f.status || e.status === f.status) &&
        (!f.priority || e.priority === f.priority) &&
        (!f.payment || (f.payment === "free" ? e.isFree : !e.isFree)),
    )
    .sort((a, b) => ((a.date || "") + (a.startTime || "")).localeCompare((b.date || "") + (b.startTime || "")));
}
