import type { TripTheme } from "./data/themes";
import type { EventDetailsData } from "./data/eventDetails";
export type TripStatus = "planejamento" | "confirmada" | "concluída";
export type EventStatus =
  "ideia" | "reservado" | "confirmado" | "realizado" | "cancelado";
export type Priority = "imperdível" | "gostaria de ir" | "opcional";
export interface Trip {
  id: string;
  ownerId?: string;
  access?: TripAccess;
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
  theme?: TripTheme;
}
export type TripAccess = "PRIVATE" | "SHARED" | "PUBLIC" | "PUBLIC_EDIT";
export interface TripMember {
  uid: string;
  role: "owner" | "editor";
  displayName: string;
  email: string;
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
  details?: EventDetailsData;
}
export type TripInput = Omit<Trip, "id">;
export type EventInput = Omit<TripEvent, "id">;
