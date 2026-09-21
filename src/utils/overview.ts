import type { Trip, TripEvent } from "../types";
import { categoryOf } from "../data/categories";
import { dateKey, datesBetween, daysBetween } from "./dates";

export function tripOverview(
  trip: Trip,
  events: readonly TripEvent[],
  now = new Date(),
) {
  const today = dateKey(now);
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const phase =
    today < trip.startDate
      ? "before"
      : today > trip.endDate
        ? "after"
        : "during";
  const active = events
    .filter(
      (e) =>
        e.status !== "cancelado" &&
        e.date >= trip.startDate &&
        e.date <= trip.endDate,
    )
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  return {
    phase,
    today,
    remainingDays: Math.max(0, daysBetween(today, trip.startDate) - 1),
    active,
    days: datesBetween(trip.startDate, trip.endDate).map((date) => ({
      date,
      count: active.filter((e) => e.date === date).length,
    })),
    todayEvents: active.filter((e) => e.date === today),
    next: active.find(
      (e) =>
        e.status !== "realizado" &&
        (e.date > today ||
          (e.date === today && (e.endTime || e.startTime) >= time)),
    ),
    highlights: active.filter((e) => e.priority === "imperdível"),
    transport: active.filter(
      (e) => categoryOf(e.category).group === "transport",
    ),
  };
}
