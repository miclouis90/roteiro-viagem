import type { Trip, TripEvent } from "../types";
import { tripOverview } from "./overview";

// Contextual entry points into existing views, never new persisted tasks.
export function nextStep(
  trip: Trip,
  events: TripEvent[],
  now: Date,
  admin: boolean,
) {
  const view = tripOverview(trip, events, now);
  if (view.phase === "after")
    return {
      title: "Boas histórias para revisitar",
      description: `${view.active.length} programas fizeram parte destes dias.`,
      action: "Rever roteiro",
      date: trip.startDate,
    };
  if (view.phase === "during") {
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const event = view.active.find(
      (e) =>
        e.status !== "realizado" &&
        (e.date > view.today ||
          (e.date === view.today && (e.endTime || e.startTime) >= time)),
    );
    return event
      ? {
          title: event.title,
          description: `${event.startTime} · ${event.location || "Local a definir"}`,
          action: "Abrir programa",
          event,
        }
      : {
          title: "Aproveite no seu ritmo",
          description:
            "Não há mais programas pendentes hoje. Seu roteiro continua aqui.",
          action: "Ver roteiro",
          date: view.today,
        };
  }
  if (admin) {
    const pending =
      view.active.find((e) => !e.location.trim()) ??
      view.active.find((e) => e.status === "ideia");
    if (pending)
      return {
        title: !pending.location.trim()
          ? "Defina o local deste programa"
          : "Uma ideia para revisar",
        description: pending.title,
        action: "Abrir programa",
        event: pending,
      };
  }
  return {
    title: view.active.length
      ? "Seu roteiro está tomando forma"
      : "Tudo começa com uma boa ideia",
    description: view.active.length
      ? "Confira os planos do primeiro dia."
      : admin
        ? "Use Adicionar para guardar seu primeiro plano."
        : "Os planos aparecem aqui quando estiverem prontos.",
    action: "Ver roteiro",
    date: trip.startDate,
  };
}
