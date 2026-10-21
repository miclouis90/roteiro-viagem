import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { demoEvents, demoTrip } from "../data/demo";
import { categories, categoryOf } from "../data/categories";
import { validDetails, visibleDetails } from "../data/eventDetails";
import { isLodging, lodgingPeriod, occursOnDay, splitLodgingReservation, timeOnDay } from "./lodging";
import { spending } from "./spending";
import { cost } from "./money";
import { tripOverview } from "./overview";
import { dayMapStops, googleMapsLinks } from "./dayMap";
import { explorationResults, itineraryResults } from "./itinerary";
import { emptyFilters } from "../components/trip/EventFilters";
import { TripSummary } from "../components/TripSummary";
import { TripOverview } from "../components/trip/TripOverview";
import { EventDetails } from "../components/Events";
import { prepareRows } from "../services/export/data";
import { datesBetween } from "./dates";
import type { TripEvent } from "../types";

export const stay: TripEvent = { ...demoEvents[0], id: "hotel", title: "Hotel do Cerrado", category: "Hotel", date: "2026-10-29", startTime: "15:00", endTime: "", pricePerPerson: 1200, peopleCount: 1, isFree: false,
  details: { type: "lodging", checkOutDate: "2026-11-02", checkOutTime: "11:00", guests: 4, bookingReference: "PRIVATE-CODE", bookingUrl: "https://example.com/PRIVATE-RESERVATION", notes: "PRIVATE-NOTE" } };
const trip = { ...demoTrip, endDate: "2026-11-02" };

describe("estadia única", () => {
  it("adiciona seis tipos sem reutilizar o Outro existente", () => {
    expect(categories.filter(c => c.group === "lodging").map(c => c.label ?? c.name)).toEqual(["Hotel", "Airbnb/aluguel", "Pousada", "Hostel", "Casa de amigos", "Outro"]);
    expect(categoryOf("Outro").group).toBe("other");
    expect(categoryOf("Hotel").group).toBe("lodging");
  });
  it("mantém uma única identidade durante quatro noites e inclui o dia de check-out", () => {
    expect(lodgingPeriod(stay)).toContain("4 noites");
    for (const day of datesBetween(stay.date, "2026-11-02")) expect(occursOnDay(stay, day)).toBe(true);
    expect(occursOnDay(stay, "2026-10-28")).toBe(false);
    expect(occursOnDay(stay, "2026-11-03")).toBe(false);
    expect(dayMapStops([stay], "2026-10-31")[0].event).toBe(stay);
    expect(timeOnDay(stay, stay.date)).toBe("15:00");
    expect(timeOnDay(stay, "2026-10-30")).toBe("");
    expect(timeOnDay(stay, "2026-11-02")).toBe("11:00");
    expect(googleMapsLinks(dayMapStops([stay], "2026-10-30"))).toHaveLength(1);
  });
  it("conta custo e registro uma vez, sem multiplicar por hóspedes ou noites", () => {
    expect(cost(stay)).toBe(1200);
    expect(spending([stay])).toMatchObject({ total: 1200, count: 1 });
    const days = datesBetween(trip.startDate, trip.endDate);
    expect(days.reduce((sum, day) => sum + spending([stay].filter(event => event.date === day)).total, 0)).toBe(1200);
    const html = renderToStaticMarkup(<TripSummary trip={trip} events={[stay]} days={days} count={days.length} />);
    const cards = html.match(/<article class="expense-day"[\s\S]*?<\/article>/g)!;
    expect(cards[0]).toContain("1.200,00");
    expect(cards.slice(1).every(card => !card.includes("1.200,00"))).toBe(true);
    expect(html).toContain("Hospedagem");
    expect(html).toContain("no dia do check-in");
    expect(spending([{ ...stay, status: "cancelado" }]).total).toBe(0);
    expect(spending([{ ...stay, isFree: true, pricePerPerson: 0 }]).freeCount).toBe(1);
  });
  it("integra busca, filtros, visão geral e Mapa sem gerar cópias por noite", () => {
    const events = [stay, ...demoEvents];
    const filters = { ...emptyFilters, group: "lodging", date: "2026-10-31" };
    expect(explorationResults(events, filters, "all").programs.map(e => e.id)).toEqual([stay.id]);
    expect(explorationResults(events, { ...emptyFilters, search: "hospedagem" }, "all").programs).toHaveLength(1);
    expect(itineraryResults(events, { ...emptyFilters, group: "lodging" }, "2026-10-31", "all").programs).toEqual([stay]);
    const view = tripOverview(trip, [stay]);
    expect(view.active).toHaveLength(1);
    expect(view.days.every(day => day.count === 1)).toBe(true);
    const html = renderToStaticMarkup(<TripOverview trip={trip} events={[stay]} now={new Date(2026,9,20)} onDay={vi.fn()} onSelect={vi.fn()}/>);
    expect(html.match(/Hotel do Cerrado/g)).toHaveLength(1);
    expect(html).toContain("4 noites");
  });
  it("mantém o custo e o formato dos programas e hotéis legados sem details", () => {
    const legacy = { ...demoEvents[0], category: "Hotel", pricePerPerson: 50, peopleCount: 3 };
    expect(isLodging(legacy)).toBe(false);
    expect(cost(legacy)).toBe(150);
    expect(occursOnDay(legacy, "2026-10-30")).toBe(false);
  });
});

describe("validação e privacidade da hospedagem", () => {
  it("separa dados da reserva sem modificar o registro fornecido", () => {
    const baseline = structuredClone(stay);
    const { publicInput, reservation } = splitLodgingReservation(stay);
    expect(JSON.stringify(publicInput)).not.toContain("PRIVATE");
    expect(reservation.bookingReference).toBe("PRIVATE-CODE");
    expect(stay).toEqual(baseline);
    expect(visibleDetails(stay.details, false).every(field => !field.private)).toBe(true);
  });
  it("oculta reserva em fichas públicas e em exportações", () => {
    const html = renderToStaticMarkup(<EventDetails event={stay} trip={trip} admin={false} onClose={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()}/>);
    expect(html).not.toContain("PRIVATE");
    expect(html).toContain("4 noites");
    expect(prepareRows(trip, [stay])[0].cells.join(" ")).not.toContain("PRIVATE");
    expect(prepareRows(trip, [stay])).toHaveLength(1);
  });
  it.each([
    { type: "lodging" },
    { type: "lodging", checkOutDate: "2026-02-30" },
    { type: "lodging", checkOutDate: "2026-11-02", guests: 0 },
    { type: "lodging", checkOutDate: "2026-11-02", guests: 1.5 },
    { type: "lodging", checkOutDate: "2026-11-02", guests: "4" },
    { type: "lodging", checkOutDate: "2026-11-02", bookingUrl: "javascript:alert(1)" },
    { type: "lodging", checkOutDate: "2026-11-02", checkOutTime: "25:00" },
  ])("rejeita detalhes inválidos %j", details => expect(validDetails(details)).toBe(false));
});
