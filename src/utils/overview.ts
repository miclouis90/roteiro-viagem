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
  const transport = active.filter(
    (e) => categoryOf(e.category).group === "transport",
  );
  const next =
    phase === "after"
      ? undefined
      : active.find(
          (e) =>
            categoryOf(e.category).group !== "transport" &&
            e.status !== "realizado" &&
            (e.date > today ||
              (e.date === today && (e.endTime || e.startTime) >= time)),
        );
  const todayEvents = active.filter((e) => e.date === today);
  const todayPreview =
    phase === "during"
      ? todayEvents
          .filter((e) => e.id !== next?.id && !transport.includes(e))
          .slice(0, 3)
      : [];
  return {
    phase,
    today,
    remainingDays: Math.max(0, daysBetween(today, trip.startDate) - 1),
    dayNumber: daysBetween(trip.startDate, today),
    active,
    days: datesBetween(trip.startDate, trip.endDate).map((date) => ({
      date,
      count: active.filter((e) => e.date === date).length,
      tones: [
        ...new Set(
          active
            .filter((e) => e.date === date)
            .map((e) => categoryOf(e.category).tone),
        ),
      ].slice(0, 3),
    })),
    todayEvents,
    todayPreview,
    next,
    transport,
    highlights: active.filter(
      (e) =>
        e.priority === "imperdível" &&
        e.id !== next?.id &&
        !transport.includes(e) &&
        !todayPreview.includes(e),
    ),
  };
}
export function timeUntilEvent(event: TripEvent, now: Date) {
  const minutes = Math.ceil(
    (new Date(`${event.date}T${event.startTime}:00`).getTime() -
      now.getTime()) /
      60000,
  );
  if (minutes <= 0) return "Agora";
  if (minutes < 60) return `em ${minutes} min`;
  if (minutes < 1440)
    return `em ${Math.floor(minutes / 60)}h${minutes % 60 ? String(minutes % 60).padStart(2, "0") : ""}`;
  const days = daysBetween(dateKey(now), event.date) - 1;
  return `em ${days} ${days === 1 ? "dia" : "dias"}`;
}
