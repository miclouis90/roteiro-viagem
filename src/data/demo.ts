import type { Trip, TripEvent } from "../types";
export const demoTrip: Trip = {
  id: "brasilia-demo",
  title: "Férias em Brasília",
  destinationCity: "Brasília",
  destinationState: "DF",
  country: "Brasil",
  startDate: "2026-10-29",
  endDate: "2026-11-03",
  travelerName: "Ana & amigos",
  description:
    "Dias leves entre arquitetura, bons cafés e o pôr do sol mais bonito do cerrado.",
  notes:
    "Levar uma garrafa de água e protetor solar. Os lugares e valores deste roteiro são fictícios.",
  status: "planejamento",
  isPublic: true,
  currency: "BRL",
};
const items = [
  ["Café com calma", "Café", "2026-10-29", "09:00", "Asa Norte", 32],
  [
    "Um encontro com a arte",
    "Museu",
    "2026-10-29",
    "11:00",
    "Eixo Monumental",
    0,
  ],
  ["Sabores do cerrado", "Almoço", "2026-10-29", "13:00", "Asa Sul", 68],
  ["Brinde ao pôr do sol", "Drinks", "2026-10-29", "17:30", "Lago Paranoá", 48],
  ["Manhã no parque", "Parque", "2026-10-30", "08:30", "Parque da Cidade", 0],
  ["Uma noite de jazz", "Show", "2026-10-30", "20:00", "Asa Norte", 60],
  ["Mesa para dois", "Jantar", "2026-10-31", "19:30", "Lago Sul", 95],
  ["Conversa de boteco", "Bar", "2026-11-01", "18:00", "Asa Sul", 45],
] as const;
export const demoEvents: TripEvent[] = items.map(
  ([title, category, date, startTime, location, pricePerPerson], i) => ({
    id: `demo-${i}`,
    title,
    category,
    date,
    startTime,
    location,
    pricePerPerson,
    peopleCount: 2,
    isFree: pricePerPerson === 0,
    description:
      "Uma pausa para aproveitar a cidade, sem pressa. Atividade fictícia para explorar o aplicativo.",
    endTime: "",
    websiteUrl: "",
    instagramUrl: "",
    mapsUrl: "",
    genericUrl: "",
    notes: "Confirme horários e disponibilidade antes da visita.",
    status: i === 0 ? "confirmado" : "ideia",
    priority: i === 1 ? "imperdível" : "gostaria de ir",
  }),
);
