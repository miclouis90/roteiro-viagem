import type { EventStatus, TripStatus } from "../types";
export const tripLabels: Record<TripStatus, string> = {
  planejamento: "Planejando",
  confirmada: "Confirmada",
  concluída: "Concluída",
};
export const eventLabels: Record<EventStatus, string> = {
  ideia: "Ideia",
  reservado: "Reservado",
  confirmado: "Confirmado",
  realizado: "Feito",
  cancelado: "Cancelado",
};
export const priorityLabels = {
  imperdível: "Imperdível",
  "gostaria de ir": "Gostaria de ir",
  opcional: "Opcional",
};
export const dayCountLabel = (count: number) =>
  `${count} ${count === 1 ? "dia" : "dias"}`;
