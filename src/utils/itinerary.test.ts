import { describe, expect, it } from "vitest";
import { demoEvents } from "../data/demo";
import { emptyFilters } from "../components/trip/EventFilters";
import { filterEvents } from "./filters";
import { explorationResults, hasProgramDate, itineraryResults } from "./itinerary";
import { collectPlaces } from "./places";
import type { TripEvent } from "../types";

const saved = { ...demoEvents[0], id: "saved", date: "", title: "Café guardado", location: "Rua dos Ipês", category: "Café" };
describe("roteiro unificado", () => {
  it("mantém lugares sem data fora da timeline e disponíveis em Todos/Lugares", () => {
    const events = [...demoEvents, saved];
    const result = itineraryResults(events, emptyFilters, "2026-10-29", "all");
    expect(result.programs).toHaveLength(4);
    expect(result.places).toEqual([saved]);
    expect(itineraryResults(events, emptyFilters, "2026-10-29", "places").places).toHaveLength(events.length);
    expect(itineraryResults(events, emptyFilters, "2026-10-29", "programs").places).toEqual([]);
    expect(events).toHaveLength(demoEvents.length + 1);
  });
  it("busca nomes, endereços e categorias em todos os dias sem novas consultas", () => {
    const events = [...demoEvents, saved];
    expect(itineraryResults(events, { ...emptyFilters, search: "ipes" }, "2026-10-29", "all").places).toEqual([saved]);
    expect(itineraryResults(events, { ...emptyFilters, search: demoEvents[6].title }, "2026-10-29", "all").programs.map(event => event.id)).toEqual([demoEvents[6].id]);
    expect(filterEvents(events, { ...emptyFilters, search: "cafe" }).map(event => event.id)).toContain(saved.id);
  });
  it("combina grupo, status, destaque e preço com os filtros existentes", () => {
    const event = { ...saved, status: "confirmado" as const, priority: "imperdível" as const, isFree: true };
    const filters = { ...emptyFilters, group: "food", status: "confirmado", priority: "imperdível", payment: "free" };
    expect(itineraryResults([event], filters, "2026-10-29", "places").places).toEqual([event]);
    expect(itineraryResults([event], { ...filters, group: "culture" }, "2026-10-29", "places").places).toEqual([]);
  });
  it("trata datas ausentes ou inválidas como registros sem programação", () => {
    for (const date of ["", "2026-02-30", "inválida", undefined]) expect(hasProgramDate({ date } as { date: string })).toBe(false);
    expect(hasProgramDate({ date: "2026-10-29" })).toBe(true);
  });
  it("permite buscar e organizar lugares legados sem data e horário", () => {
    const undated = { ...saved, date: undefined, startTime: undefined } as unknown as TripEvent;
    expect(collectPlaces(itineraryResults([undated, ...demoEvents], emptyFilters, "2026-10-29", "places").places)[0].name).toBe("Rua dos Ipês");
    const results = itineraryResults([undated, ...demoEvents], { ...emptyFilters, search: "ipes" }, "2026-10-29", "places");
    expect(results.programs).toEqual([]);
    expect(collectPlaces(results.places)[0].name).toBe("Rua dos Ipês");
  });
});

describe("Explorar a viagem inteira", () => {
  it("ordena todos os programas por data/horário e separa os salvos sem data", () => {
    const outside = { ...demoEvents[0], id: "outside", date: "2027-01-01" };
    const events = [outside, saved, ...demoEvents.slice().reverse()];
    const original = events.slice();
    const result = explorationResults(events, emptyFilters, "all");
    expect(result.programs.map(event => event.id)).toEqual([...demoEvents.map(event => event.id), outside.id]);
    expect(result.places).toEqual([saved]);
    expect(events).toEqual(original);
    expect(explorationResults(events, emptyFilters, "programs").places).toEqual([]);
    expect(explorationResults(events, emptyFilters, "places").places).toHaveLength(events.length);
  });
  it("busca nome, local e categoria globalmente, combinando os filtros existentes", () => {
    const events = [...demoEvents, saved];
    expect(explorationResults(events, { ...emptyFilters, search: "mesa para dois" }, "all").programs).toEqual([demoEvents[6]]);
    expect(explorationResults(events, { ...emptyFilters, search: "lago sul" }, "all").programs).toEqual([demoEvents[6]]);
    expect(explorationResults(events, { ...emptyFilters, search: "cafe" }, "all").places).toEqual([saved]);
    expect(explorationResults(events, { ...emptyFilters, group: "food" }, "all").programs.map(event => event.date)).toEqual(["2026-10-29", "2026-10-29", "2026-10-31"]);
    expect(explorationResults(events, { ...emptyFilters, group: "food", status: "confirmado" }, "all").programs).toEqual([demoEvents[0]]);
    expect(explorationResults(events, { ...emptyFilters, search: "museu" }, "all").programs).toEqual([demoEvents[1]]);
  });
});
