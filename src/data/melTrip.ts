import type { TripInput } from "../types";
export const melTripId = "brasilia-da-mel-2026";
export const melTrip: Readonly<TripInput> = Object.freeze({
  title: "Brasília da Mel",
  destinationCity: "Brasília",
  destinationState: "DF",
  country: "Brasil",
  startDate: "2026-10-29",
  endDate: "2026-11-02",
  travelerName: "Mel",
  status: "planejamento",
  currency: "BRL",
  isPublic: false,
  description:
    "Alguns dias em Brasília para aproveitar sem pressa, conhecer lugares legais, comer bem e criar boas histórias.",
  notes: "Viagem da Mel a Brasília. Roteiro em construção.",
});
export function assertMelSeedTarget(
  projectId: string | undefined,
  demo: boolean,
) {
  if (projectId !== "rumos-bsb" || demo) {
    throw new Error(
      "Cadastro bloqueado: configure o Firebase rumos-bsb e VITE_DEMO_MODE=false no .env.",
    );
  }
}
export function matchesMelTrip(data: { title?: unknown; startDate?: unknown }) {
  return data.title === melTrip.title && data.startDate === melTrip.startDate;
}
