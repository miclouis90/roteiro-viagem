import type { EventInput, TripEvent } from "../types";
import { categoryOf } from "../data/categories";
import { daysBetween, formatDate } from "./dates";

export const isLodgingCategory = (category: string) => categoryOf(category).group === "lodging";
export const isLodging = (event: Pick<TripEvent, "details">) => event.details?.type === "lodging";
export const lodgingCheckOut = (event: Pick<TripEvent, "details">) =>
  isLodging(event) ? String(event.details?.checkOutDate || "") : "";
export function occursOnDay(event: Pick<TripEvent, "date" | "details">, day: string) {
  const end = lodgingCheckOut(event);
  return event.date === day || (!!end && event.date <= day && end >= day);
}
export function timeOnDay(event: TripEvent, day: string) {
  if (!isLodging(event) || event.date === day) return event.startTime;
  return lodgingCheckOut(event) === day ? String(event.details?.checkOutTime || "") : "";
}
export function lodgingPeriod(event: Pick<TripEvent, "date" | "details">) {
  const end = lodgingCheckOut(event);
  if (!end) return "Check-out a definir";
  const nights = Math.max(0, daysBetween(event.date, end) - 1);
  return `${formatDate(event.date)} — ${formatDate(end)} · ${nights} ${nights === 1 ? "noite" : "noites"}`;
}
export const reservationKeys = ["bookingReference", "bookingUrl", "notes"] as const;
export type LodgingReservation = Partial<Record<(typeof reservationKeys)[number], string>>;
export function reservationData(data: Record<string, unknown>): LodgingReservation {
  return Object.fromEntries(reservationKeys.filter(key => typeof data[key] === "string").map(key => [key, data[key]]));
}
export function splitLodgingReservation<T extends EventInput>(input: T) {
  const reservation: LodgingReservation = {};
  if (!isLodging(input)) return { publicInput: input, reservation };
  const details = { ...input.details! };
  for (const key of reservationKeys) {
    if (typeof details[key] === "string" && details[key]) reservation[key] = String(details[key]);
    delete details[key];
  }
  return { publicInput: { ...input, details }, reservation };
}
