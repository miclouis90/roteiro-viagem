import { describe, expect, it } from "vitest";
import { agendaMonth, agendaPeriodsOnDate, dateInAgendaMonth, isAgendaDate, isAgendaMonth, shiftAgendaMonth, validAgendaPeriods, type AgendaPeriod } from "./agenda";

const period = (id: string, startDate: string, endDate: string): AgendaPeriod => ({ id, title: id, startDate, endDate });

describe("períodos da agenda", () => {
  it("inclui partida, retorno, viagens de um dia, passadas e futuras sem depender de hoje", () => {
    const items = [period("antiga", "2020-01-01", "2020-01-02"), period("futura", "2030-12-31", "2031-01-02"), period("dia", "2031-01-02", "2031-01-02")];
    expect(agendaPeriodsOnDate(items, "2020-01-01").map(item => item.id)).toEqual(["antiga"]);
    expect(agendaPeriodsOnDate(items, "2020-01-02").map(item => item.id)).toEqual(["antiga"]);
    expect(agendaPeriodsOnDate(items, "2031-01-02").map(item => item.id)).toEqual(["futura", "dia"]);
    expect(agendaPeriodsOnDate(items, "2031-01-03")).toEqual([]);
  });
  it("desenha o período inteiro ao atravessar semanas, meses e anos", () => {
    const item = period("virada", "2026-12-29", "2027-01-10");
    for (const month of ["2026-12", "2027-01"]) {
      const weeks = agendaMonth([item], month);
      const covered = weeks.flatMap(week => week.segments.flatMap(segment => week.dates.slice(segment.start, segment.end + 1)));
      const expected = weeks.flatMap(week => week.dates).filter(day => day >= item.startDate && day <= item.endDate);
      expect(covered).toEqual(expected);
      expect(new Set(covered).size).toBe(covered.length);
    }
    const segments = agendaMonth([item], "2027-01").flatMap(week => week.segments);
    expect(segments.some(segment => segment.continuesBefore)).toBe(true);
    expect(segments.some(segment => segment.continuesAfter)).toBe(true);
  });
  it("separa viagens sobrepostas sem perder nenhuma e reutiliza espaço livre", () => {
    const weeks = agendaMonth([period("a", "2026-11-01", "2026-11-03"), period("b", "2026-11-02", "2026-11-04"), period("c", "2026-11-05", "2026-11-07")], "2026-11");
    expect(weeks[0].segments.map(segment => [segment.period.id, segment.lane])).toEqual([["a", 0], ["b", 1], ["c", 0]]);
    expect(weeks[0].lanes).toBe(2);
    expect(agendaPeriodsOnDate(weeks[0].segments.map(segment => segment.period), "2026-11-02")).toHaveLength(2);
  });
  it("mantém sete colunas, alinhamento dos dias e anos bissextos", () => {
    for (const month of ["2026-02", "2026-08", "2028-02"]) expect(agendaMonth([], month).every(week => week.dates.length === 7)).toBe(true);
    const february = agendaMonth([], "2028-02").flatMap(week => week.dates).filter(day => day.startsWith("2028-02"));
    expect(february).toHaveLength(29); expect(february.at(-1)).toBe("2028-02-29");
    expect(agendaMonth([], "2026-08")[0].dates).toEqual(["2026-07-26", "2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31", "2026-08-01"]);
  });
  it("navega entre anos e ajusta o dia sem pular fevereiro", () => {
    expect(shiftAgendaMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftAgendaMonth("2026-01", -1)).toBe("2025-12");
    expect(dateInAgendaMonth("2027-02", "2027-01-31")).toBe("2027-02-28");
    expect(dateInAgendaMonth("2028-02", "2028-01-31")).toBe("2028-02-29");
    expect(dateInAgendaMonth("2027-02", "2028-02-29")).toBe("2027-02-28");
  });
  it("recusa datas malformadas, não normaliza datas impossíveis e não altera os dados", () => {
    for (const value of ["", "2026-02-29", "2026-02-31", "2026-13-01", "2026-1-01", "x", "2026-11-01T12:00:00Z"]) expect(isAgendaDate(value)).toBe(false);
    expect(isAgendaDate("2028-02-29")).toBe(true); expect(isAgendaMonth("2026-13")).toBe(false); expect(isAgendaMonth("2026-11")).toBe(true);
    const item = period("ok", "2026-11-01", "2026-11-05"), before = { ...item };
    expect(validAgendaPeriods([item, item, period("bad", "2026-11-10", "2026-11-01"), period("missing", "", "")])).toEqual([item]);
    agendaMonth([item], "2026-11"); expect(item).toEqual(before);
  });
});
