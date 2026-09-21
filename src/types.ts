export type TripStatus = "planejamento" | "confirmada" | "concluída";
export type EventStatus =
  "ideia" | "reservado" | "confirmado" | "realizado" | "cancelado";
export type Priority = "imperdível" | "gostaria de ir" | "opcional";
export interface Trip {
  id: string;
  title: string;
  destinationCity: string;
  destinationState: string;
  country: string;
  startDate: string;
  endDate: string;
  travelerName: string;
  description: string;
  notes: string;
  status: TripStatus;
  isPublic: boolean;
  currency: string;
}
export interface TripEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  category: string;
  websiteUrl: string;
  instagramUrl: string;
  mapsUrl: string;
  genericUrl: string;
  pricePerPerson: number;
  peopleCount: number;
  isFree: boolean;
  notes: string;
  status: EventStatus;
  priority: Priority;
}
export type TripInput = Omit<Trip, "id">;
export type EventInput = Omit<TripEvent, "id">;
