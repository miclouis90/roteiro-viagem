import type { TripEvent } from "../types";
import { dateKey, localDate } from "./dates";
import { filterEvents } from "./filters";
import type { Filters } from "../components/trip/EventFilters";
import type { ItineraryType } from "./tripView";
import { occursOnDay } from "./lodging";

// Undated records remain available as places; no persisted discriminator is added.
export function hasProgramDate(event: Pick<TripEvent, "date">) {
  return typeof event.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(event.date) && dateKey(localDate(event.date)) === event.date;
}

export function itineraryResults(events: TripEvent[], filters: Filters, day: string, type: ItineraryType) {
  const filtered = filterEvents(events, filters);
  const searching = Boolean(filters.search.trim());
  return {
    searching,
    programs: type === "places" ? [] : filtered.filter(event => hasProgramDate(event) && (searching || occursOnDay(event, day))),
    places: type === "programs" ? [] : filtered.filter(event => type === "places" || !hasProgramDate(event)),
    outside: filtered.filter(event => hasProgramDate(event)),
  };
}

export function explorationResults(events: TripEvent[], filters: Filters, type: ItineraryType) {
  const filtered = filterEvents(events, filters);
  return {
    programs: type === "places" ? [] : filtered.filter(hasProgramDate),
    places: type === "programs" ? [] : filtered.filter(event => type === "places" || !hasProgramDate(event)),
  };
}
