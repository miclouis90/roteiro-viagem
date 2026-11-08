import { describe, expect, it } from "vitest";
import { demoTrip } from "../data/demo";
import { agendaFilter, unifiedAgenda } from "./unifiedAgenda";
import { groupTripHistory } from "./filterHomeTrips";
import type { PersonalEvent } from "./personalEvents";
import { agendaMonth } from "./agenda";
const trip = { ...demoTrip, id: "same", startDate: "2026-10-29", endDate: "2026-11-02" };
const event: PersonalEvent = { id: "same", ownerId: "alice", title: "Noite de música", category: "show", city: "São Paulo", location: "Teatro Municipal", date: "2026-10-30", startTime: "21:00", endTime: "02:00", priceCents: 99999, notes: "PRIVATE", ticketUrl: "https://example.test/PRIVATE" };
describe("Agenda unificada", () => {
  it("mantém origens distintas, períodos inclusivos e eventos pontuais mesmo quando seus IDs coincidem", () => {
    const data = unifiedAgenda([trip], [event, { ...event, id: "early", startTime: "09:00" }], "", "all");
    expect(data.periods).toHaveLength(1); expect(data.points).toHaveLength(2);
    expect(data.periods[0]).toMatchObject({ startDate: "2026-10-29", endDate: "2026-11-02" });
    expect(data.points[1]).toEqual({ id: "same", title: event.title, date: "2026-10-30", time: "21:00" });
    expect(data.eventsByDay.get("2026-10-30")?.map(item => item.id)).toEqual(["early", "same"]); expect(data.eventsByDay.has("2026-10-31")).toBe(false);
    expect(JSON.stringify(data.points)).not.toMatch(/PRIVATE|priceCents|ticketUrl/);
  });
  it("filtra Tudo/Viagens/Eventos sem modificar as origens ou duplicar registros", () => {
    expect(unifiedAgenda([trip], [event], "", "trips").points).toEqual([]);
    expect(unifiedAgenda([trip], [event], "", "events").periods).toEqual([]);
    expect(agendaFilter("invalid")).toBe("all"); expect(agendaFilter("events")).toBe("events");
    const before = JSON.stringify([trip, event]); unifiedAgenda([trip], [event], "", "all"); expect(JSON.stringify([trip, event])).toBe(before);
  });
  it("busca nomes, destinos, cidade, local e tipo sem acentos; não pesquisa notas ou links privados", () => {
    expect(unifiedAgenda([trip], [event], " BRASILIA ", "all").trips).toHaveLength(1);
    expect(unifiedAgenda([trip], [event], "musica", "all").events).toHaveLength(1);
    expect(unifiedAgenda([trip], [event], "teatro", "all").events).toHaveLength(1);
    expect(unifiedAgenda([trip], [event], "sao paulo", "events").events).toHaveLength(1);
    expect(unifiedAgenda([trip], [event], "show", "all").events).toHaveLength(1);
    expect(unifiedAgenda([trip], [event], "PRIVATE", "all").events).toEqual([]);
  });
  it("indexa muitos eventos por dia e mês sem perder coincidências ou transportar eventos para outro dia", () => {
    const events = Array.from({ length: 2000 }, (_, i) => ({ ...event, id: `event-${i}`, date: i < 1000 ? "2026-10-30" : "2027-01-01" }));
    const data = unifiedAgenda([trip], events, "", "all"), weeks = agendaMonth(data.periods, "2026-10", data.points);
    expect(data.eventsByDay.get("2026-10-30")).toHaveLength(1000);
    expect(weeks.flatMap(week => week.points.flat())).toHaveLength(1000);
    expect(weeks.flatMap(week => week.points.flat()).every(point => point.date === "2026-10-30")).toBe(true);
    expect(agendaMonth(data.periods, "2027-01", data.points).flatMap(week => week.points.flat())).toHaveLength(1000);
  });
  it("agrupa o histórico por ano de partida, sem duplicar viagens que atravessam a virada", () => {
    const crossing = { ...trip, id: "crossing", startDate: "2024-12-29", endDate: "2025-01-03" }, recent = { ...trip, id: "recent", startDate: "2025-05-01", endDate: "2025-05-03" };
    const result = groupTripHistory([crossing, recent, { ...crossing, id: "older", startDate: "2020-01-01" }]);
    expect(result.map(group => group.year)).toEqual(["2025", "2024", "2020"]);
    expect(result.flatMap(group => group.trips.map(item => item.id))).toEqual(["recent", "crossing", "older"]);
  });
});
