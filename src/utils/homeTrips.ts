import type { Trip } from "../types";
import { dateKey } from "./dates";
export function homeTrips(trips: readonly Trip[], today = dateKey()) {
  const sorted = [...trips].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );
  const featured =
    sorted.find((trip) => trip.startDate <= today && trip.endDate >= today) ??
    sorted.find((trip) => trip.startDate > today) ??
    sorted.at(-1);
  return {
    featured,
    others: sorted.filter((trip) => trip.id !== featured?.id),
  };
}
