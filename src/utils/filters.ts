import type { TripEvent } from "../types";
import type { Filters } from "../components/trip/EventFilters";
export function filterEvents(events: TripEvent[], f: Filters) {
  return [...events]
    .filter(
      (e) =>
        (!f.search ||
          `${e.title} ${e.description} ${e.location}`
            .toLocaleLowerCase()
            .includes(f.search.toLocaleLowerCase())) &&
        (!f.date || e.date === f.date) &&
        (!f.category || e.category === f.category) &&
        (!f.status || e.status === f.status) &&
        (!f.priority || e.priority === f.priority) &&
        (!f.payment || (f.payment === "free" ? e.isFree : !e.isFree)),
    )
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}
