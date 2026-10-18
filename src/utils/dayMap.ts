import type { Trip, TripEvent } from "../types";
import { hasProgramDate } from "./itinerary";

export interface Coordinates { lat: number; lng: number }
export interface MapStop {
  event: TripEvent;
  number: number;
  position?: Coordinates;
  placeId?: string;
  address: string;
}
export interface LocatedStop extends MapStop { position?: Coordinates }

export function coordinates(value: unknown): Coordinates | undefined {
  if (!value || typeof value !== "object") return;
  const point = value as Record<string, unknown>;
  const lat = point.lat ?? point.latitude;
  const lng = point.lng ?? point.longitude;
  if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
}
function coordinateQuery(query: string) {
  const match = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  return match ? coordinates({ lat: Number(match[1]), lng: Number(match[2]) }) : undefined;
}
function locationSource(event: TripEvent) {
  // Read-only compatibility with any already-loaded coordinates. No fields are persisted.
  const existing = event as unknown as Record<string, unknown>;
  let query = "", linkPlaceId = "";
  try {
    const url = new URL(event.mapsUrl);
    if (/^(www\.)?google\.[a-z.]+$/.test(url.hostname) && url.pathname.startsWith("/maps")) {
      query = url.searchParams.get("query") || url.searchParams.get("q") || "";
      linkPlaceId = url.searchParams.get("query_place_id") || url.searchParams.get("place_id") || "";
      if (query.startsWith("place_id:")) { linkPlaceId = query.slice(9); query = ""; }
    }
  } catch { /* A missing or shortened map link is not an address. */ }
  const address = typeof event.location === "string" ? event.location.trim() : "";
  const position = coordinates(existing) || coordinates(existing.coordinates) || coordinates(existing.coords) || coordinateQuery(query) || coordinateQuery(address);
  const placeId = typeof existing.placeId === "string" ? existing.placeId.trim() : linkPlaceId;
  return { position, placeId: placeId || undefined, address: address || query };
}
export function dayMapStops(events: readonly TripEvent[], day: string): MapStop[] {
  return events.filter(event => hasProgramDate(event) && event.date === day)
    .sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99") || a.id.localeCompare(b.id))
    .map((event, index) => ({ event, number: index + 1, ...locationSource(event) }));
}
export function mapSearch(params: URLSearchParams, day: string, open: boolean) {
  const next = new URLSearchParams(params);
  next.set("tab", "roteiro");
  next.set("day", day);
  if (open) next.set("map", "day"); else next.delete("map");
  return next;
}
export function geocodeAddress(stop: MapStop, trip: Trip) {
  if (!stop.address) return "";
  const context = stop.address.toLocaleLowerCase("pt-BR").includes(trip.destinationCity.toLocaleLowerCase("pt-BR"))
    ? "" : [trip.destinationCity, trip.destinationState, trip.country].filter(Boolean).join(", ");
  return [stop.address, context].filter(Boolean).join(", ");
}
export interface MapsLink { url: string; first: number; last: number }
export function googleMapsLinks(stops: readonly MapStop[]): MapsLink[] {
  const valid = stops.filter(stop => stop.position || stop.address || stop.placeId);
  if (!valid.length) return [];
  const target = (stop: MapStop) => stop.position ? `${stop.position.lat},${stop.position.lng}` : stop.address || stop.placeId!;
  if (valid.length === 1) {
    const params = new URLSearchParams({ api: "1", query: target(valid[0]) });
    if (valid[0].placeId) params.set("query_place_id", valid[0].placeId);
    return [{ url: `https://www.google.com/maps/search/?${params}`, first: valid[0].number, last: valid[0].number }];
  }
  const links: MapsLink[] = [];
  // Maps URLs accept only three intermediate waypoints on mobile browsers.
  for (let start = 0; start < valid.length - 1; start += 4) {
    const segment = valid.slice(start, start + 5);
    const first = segment[0], last = segment[segment.length - 1], waypoints = segment.slice(1, -1);
    const params = new URLSearchParams({ api: "1", origin: target(first), destination: target(last) });
    if (first.placeId) params.set("origin_place_id", first.placeId);
    if (last.placeId) params.set("destination_place_id", last.placeId);
    if (waypoints.length) params.set("waypoints", waypoints.map(target).join("|"));
    if (waypoints.length && waypoints.every(stop => stop.placeId)) params.set("waypoint_place_ids", waypoints.map(stop => stop.placeId).join("|"));
    links.push({ url: `https://www.google.com/maps/dir/?${params}`, first: first.number, last: last.number });
  }
  return links;
}
