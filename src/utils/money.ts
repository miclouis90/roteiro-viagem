import type { TripEvent } from "../types";
export const cost = (e: TripEvent) =>
  e.isFree || e.status === "cancelado" ? 0 : e.pricePerPerson * e.peopleCount;
export const money = (value: number, currency = "BRL") =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
export const safeUrl = (value: string) => {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
};
