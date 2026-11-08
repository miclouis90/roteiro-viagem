import type { Trip } from "../types";
import type { PersonalEvent } from "./personalEvents";
import { sortPersonalEvents } from "./personalEvents";
import { personalEventVisuals } from "../data/personalEventCategories";
import { themeOf } from "../data/themes";
import { validAgendaPeriods, type AgendaPeriod, type AgendaPoint } from "./agenda";

export type AgendaFilter = "all" | "trips" | "events";
export const agendaFilter = (value: string | null): AgendaFilter => value === "trips" || value === "events" ? value : "all";
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();

export function unifiedAgenda(trips: readonly Trip[], events: readonly PersonalEvent[], query: string, filter: AgendaFilter) {
  const term = normalize(query);
  const visibleTrips = filter === "events" ? [] : validAgendaPeriods(trips).filter(trip => normalize(`${trip.title} ${trip.destinationCity} ${trip.destinationState} ${trip.country}`).includes(term));
  const visibleEvents = filter === "trips" ? [] : sortPersonalEvents(events).filter(event => normalize(`${event.title} ${event.city} ${event.location} ${personalEventVisuals[event.category].label}`).includes(term));
  const periods: AgendaPeriod[] = visibleTrips.map(trip => ({ id: trip.id, title: trip.title, startDate: trip.startDate, endDate: trip.endDate, color: themeOf(trip.theme).color, surface: themeOf(trip.theme).soft }));
  // A personal event is a point on its start date, including overnight events. No trip program/cost is read.
  const points: AgendaPoint[] = visibleEvents.map(event => ({ id: event.id, title: event.title, date: event.date, time: event.startTime }));
  const eventsByDay = new Map<string, PersonalEvent[]>();
  for (const event of visibleEvents) {
    const day = eventsByDay.get(event.date) || [];
    day.push(event); eventsByDay.set(event.date, day);
  }
  return { trips: visibleTrips, events: visibleEvents, periods, points, eventsByDay };
}
