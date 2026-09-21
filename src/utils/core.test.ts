import { describe, expect, it } from "vitest";
import { dateKey, datesBetween, daysBetween, localDate } from "./dates";
import { cost, safeUrl } from "./money";
import { demoEvents } from "../data/demo";
describe("Datas locais", () => {
  it("preserva o dia ao formatar sem conversão UTC", () => {
    expect(dateKey(localDate("2026-10-29"))).toBe("2026-10-29");
  });
  it("inclui chegada e saída ao atravessar meses", () => {
    expect(daysBetween("2026-10-29", "2026-11-03")).toBe(6);
    expect(datesBetween("2026-10-29", "2026-11-03")).toEqual([
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ]);
  });
  it("considera ano bissexto e viagem de um dia", () => {
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(3);
    expect(daysBetween("2026-01-01", "2026-01-01")).toBe(1);
  });
  it("atravessa a mudança de horário de verão sem duplicar dias", () => {
    expect(datesBetween("2026-03-07", "2026-03-10")).toHaveLength(4);
  });
});
describe("Custos e links", () => {
  it("multiplica o valor pelo grupo e exclui cancelados e gratuitos", () => {
    const e = {
      ...demoEvents[0],
      pricePerPerson: 32.5,
      peopleCount: 3,
      isFree: false,
    };
    expect(cost(e)).toBe(97.5);
    expect(cost({ ...e, isFree: true })).toBe(0);
    expect(cost({ ...e, status: "cancelado" })).toBe(0);
  });
  it("impede esquemas executáveis em links", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("data:text/html,test")).toBeUndefined();
    expect(safeUrl("https://example.com")).toBe("https://example.com/");
  });
});
