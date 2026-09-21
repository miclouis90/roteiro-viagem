import type { TripEvent } from "../types";
import { cost, money } from "./money";

export const hasUndefinedPrice = (event: TripEvent) =>
  !event.isFree && event.pricePerPerson === 0;
export const eventPriceLabel = (event: TripEvent, currency: string) =>
  event.isFree
    ? "Grátis"
    : hasUndefinedPrice(event)
      ? "Valor a definir"
      : money(cost(event), currency);
