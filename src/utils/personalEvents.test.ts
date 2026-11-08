import { describe, expect, it } from "vitest";
import { parsePersonalPrice, personalEventCategories, personalEventError, personalEventOvernight, sortPersonalEvents, validatePersonalEvent, type PersonalEventInput } from "./personalEvents";
const input: PersonalEventInput = { title: "Show no parque", category: "show", date: "2028-02-29", startTime: "22:00", city: "São Paulo", location: "Parque" };
describe("eventos pessoais", () => {
  it("aceita os cinco tipos e preserva cadastro mínimo sem inventar preço", () => {
    for (const category of personalEventCategories) expect(validatePersonalEvent({ ...input, category })).toEqual({ ...input, category });
    expect(validatePersonalEvent(input)).not.toHaveProperty("priceCents");
  });
  it("normaliza opcionais vazios e mantém valor zero, centavos, links e observações privados", () => {
    expect(validatePersonalEvent({ ...input, title: " Show ", endTime: "", ticketUrl: " ", notes: " " })).toEqual({ ...input, title: "Show" });
    expect(validatePersonalEvent({ ...input, priceCents: 0, endTime: "02:00", ticketUrl: " HTTPS://example.test/ingresso?a=1 ", notes: " Reserva pessoal " })).toMatchObject({ priceCents: 0, endTime: "02:00", ticketUrl: "https://example.test/ingresso?a=1", notes: "Reserva pessoal" });
    expect(personalEventOvernight({ startTime: "22:00", endTime: "02:00" })).toBe(true);
    expect(personalEventOvernight({ startTime: "14:00", endTime: "16:00" })).toBe(false);
  });
  it("recusa datas impossíveis, campos vazios, horários e valores inválidos", () => {
    for (const patch of [{ title: "  " }, { city: "" }, { location: "" }, { category: "Café" }, { date: "2026-02-29" }, { date: "2026-04-31" }, { date: "2100-02-29" }, { startTime: "24:00" }, { endTime: "ab:cd" }, { priceCents: -1 }, { priceCents: 0.1 }, { priceCents: NaN }, { priceCents: 1000000001 }, { notes: "x".repeat(3001) }]) expect(() => validatePersonalEvent({ ...input, ...patch } as PersonalEventInput)).toThrow();
    expect(validatePersonalEvent({ ...input, date: "2000-02-29" }).date).toBe("2000-02-29");
  });
  it("bloqueia links executáveis, credenciais e entradas incompletas", () => {
    for (const ticketUrl of ["javascript:alert(1)", "data:text/html,test", "ftp://example.test", "https://", "https://a:b@example.test/", "https://example.test/um espaço"]) expect(() => validatePersonalEvent({ ...input, ticketUrl })).toThrow();
  });
  it("converte valores para centavos uma vez, sem perder arredondamento nem confundir vazio com grátis", () => {
    expect(parsePersonalPrice("")).toBeUndefined(); expect(parsePersonalPrice("0")).toBe(0); expect(parsePersonalPrice("89,39")).toBe(8939); expect(parsePersonalPrice("0.29")).toBe(29); expect(parsePersonalPrice("1,5")).toBe(150);
    for (const value of ["-1", "1,005", "1.000,00", "Infinity", "10000000,01"]) expect(parsePersonalPrice(value)).toBeNaN();
  });
  it("ordena passado/futuro por data e horário sem alterar as origens", () => {
    const rows = [{ ...input, ownerId: "a", id: "b", date: "2028-03-01" }, { ...input, ownerId: "a", id: "c", startTime: "21:00" }, { ...input, ownerId: "a", id: "a", date: "2020-01-01" }];
    expect(sortPersonalEvents(rows).map(row => row.id)).toEqual(["a", "c", "b"]); expect(rows[0].id).toBe("b");
  });
  it("diferencia erros sem expor payload, URL, notas ou mensagem original do SDK", () => {
    expect(personalEventError({ code: "permission-denied", message: "SEGREDO" })).toContain("acesso");
    expect(personalEventError({ code: "unavailable" })).toContain("conexão"); expect(personalEventError({ code: "invalid-argument" })).toContain("Revise");
    expect(personalEventError({ message: "SEGREDO" })).not.toContain("SEGREDO");
  });
});
