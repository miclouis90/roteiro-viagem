import type { TripEvent } from "../types";
export interface PlaceCollection {
  key: string;
  name: string;
  location: string;
  events: TripEvent[];
}
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
    .replace(/\s+/g, " ");
export function collectPlaces(events: readonly TripEvent[]): PlaceCollection[] {
  const grouped = new Map<string, PlaceCollection>();
  for (const event of [...events].sort((a, b) =>
    (a.date + a.startTime).localeCompare(b.date + b.startTime),
  )) {
    const key = normalize(event.location || event.mapsUrl || event.title);
    const current = grouped.get(key);
    if (current) current.events.push(event);
    else
      grouped.set(key, {
        key,
        name: event.location ? event.location.split(",")[0] : event.title,
        location: event.location,
        events: [event],
      });
  }
  return [...grouped.values()];
}
