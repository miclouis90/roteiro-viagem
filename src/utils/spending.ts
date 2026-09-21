import type { TripEvent } from "../types";
import { hasUndefinedPrice } from "./eventPrice";
import { cost, money } from "./money";

export function spending(events: readonly TripEvent[]) {
  const active = events.filter((event) => event.status !== "cancelado");
  return {
    total: active
      .filter((event) => !hasUndefinedPrice(event))
      .reduce((sum, event) => sum + cost(event), 0),
    undefinedCount: active.filter(hasUndefinedPrice).length,
    count: active.length,
    freeCount: active.filter((event) => event.isFree).length,
  };
}
export function spendingLabel(events: readonly TripEvent[], currency: string) {
  const value = spending(events);
  if (!value.count) return "Sem estimativas";
  if (value.total === 0)
    return value.undefinedCount ? "Valor a definir" : "Grátis";
  return `${money(value.total, currency)}${value.undefinedCount ? " + a definir" : ""}`;
}
