import type { Trip, TripInput, TripEvent, EventInput } from "../types";
export function tripInput(t: Trip): TripInput {
  return {
    title: t.title,
    destinationCity: t.destinationCity,
    destinationState: t.destinationState,
    country: t.country,
    startDate: t.startDate,
    endDate: t.endDate,
    travelerName: t.travelerName,
    description: t.description,
    notes: t.notes,
    status: t.status,
    isPublic: t.isPublic,
    currency: t.currency,
  };
}
export function eventInput(e: TripEvent): EventInput {
  return {
    title: e.title,
    description: e.description,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    location: e.location,
    category: e.category,
    websiteUrl: e.websiteUrl,
    instagramUrl: e.instagramUrl,
    mapsUrl: e.mapsUrl,
    genericUrl: e.genericUrl,
    pricePerPerson: e.pricePerPerson,
    peopleCount: e.peopleCount,
    isFree: e.isFree,
    notes: e.notes,
    status: e.status,
    priority: e.priority,
  };
}
