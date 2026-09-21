import { describe, expect, it } from "vitest";
import { filterEvents } from "./filters";
import { emptyFilters } from "../components/trip/EventFilters";
import { eventInput, tripInput } from "./inputs";
import { tripLabels, eventLabels } from "./labels";
import { categories } from "../data/categories";
import { demoEvents, demoTrip } from "../data/demo";
describe("Preservação de dados na nova interface", () => {
  it("combina busca, data, categoria, status, prioridade e preço", () => {
    const selected = demoEvents[1];
    const result = filterEvents(demoEvents, {
      search: "arte",
      date: selected.date,
      category: "Museu",
      status: selected.status,
      priority: selected.priority,
      payment: "free",
    });
    expect(result.map((e) => e.id)).toEqual([selected.id]);
    expect(
      filterEvents(demoEvents, {
        ...emptyFilters,
        category: "Museu",
        payment: "paid",
      }),
    ).toEqual([]);
  });
  it("não altera a ordem do array original ao ordenar a agenda", () => {
    const list = [demoEvents[2], demoEvents[0]];
    expect(filterEvents(list, emptyFilters).map((e) => e.startTime)).toEqual([
      "09:00",
      "13:00",
    ]);
    expect(list[0]).toBe(demoEvents[2]);
  });
  it("remove IDs e timestamps ao copiar entradas preservando todos os campos", () => {
    const t = tripInput({
      ...demoTrip,
      createdAt: "legacy",
    } as typeof demoTrip);
    expect(t).not.toHaveProperty("id");
    expect(t).not.toHaveProperty("createdAt");
    expect(t.startDate).toBe(demoTrip.startDate);
    const e = eventInput({
      ...demoEvents[0],
      createdAt: "legacy",
    } as (typeof demoEvents)[0]);
    expect(e).not.toHaveProperty("id");
    expect(e).not.toHaveProperty("createdAt");
    expect(e.pricePerPerson).toBe(demoEvents[0].pricePerPerson);
    expect(e.peopleCount).toBe(demoEvents[0].peopleCount);
  });
  it("mantém os valores do banco e todas as 18 categorias", () => {
    expect(Object.keys(tripLabels)).toEqual([
      "planejamento",
      "confirmada",
      "concluída",
    ]);
    expect(Object.keys(eventLabels)).toEqual([
      "ideia",
      "reservado",
      "confirmado",
      "realizado",
      "cancelado",
    ]);
    expect(eventLabels.realizado).toBe("Feito");
    expect(categories).toHaveLength(18);
    expect(new Set(categories.map((c) => c.name)).size).toBe(18);
    expect(categories.every((c) => !!c.icon && !!c.tone)).toBe(true);
  });
});
