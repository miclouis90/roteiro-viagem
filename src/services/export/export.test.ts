import { describe, it, expect } from "vitest";
import { demoTrip, demoEvents } from "../../data/demo";
import { exportDate, exportTime, exportFilename, prepareRows, groupRows, headers } from "./data";
import { createCsv, csvCell } from "./csv";
import { createExcel } from "./excel";
import { createPdf } from "./pdf";
const event = { ...demoEvents[0], date: "2026-10-29", startTime: "07:45", endTime: "08:20", category: "Voo", title: 'Café; "Mel"', notes: "Linha 1\nLinha 2", pricePerPerson: 20, peopleCount: 2, isFree: false, status: "confirmado" as const };
describe("exportação do roteiro", () => {
  it("formata datas sem conversão de fuso", () => { expect(exportDate(event.date)).toBe("29/10/2026"); expect(exportDate("")).toBe(""); });
  it("preserva horários e campos ausentes", () => { expect(exportTime("07:45:00")).toBe("07:45"); expect(exportTime("")).toBe(""); expect(exportTime("25:00")).toBe(""); });
  it("exporta apenas os campos permitidos", () => {
    const row = prepareRows(demoTrip, [event])[0];
    expect(row.cells).toHaveLength(headers.length);
    expect(row.cells.slice(0, 8)).toEqual(["29/10/2026", "quinta-feira", "07:45", "08:20", event.title, "Transporte", "Voo", event.location]);
    expect(row.cells[10]).toBe(40);
    expect(JSON.stringify(row)).not.toContain(event.id);
  });
  it("distingue preço indefinido, grátis e ausente", () => {
    const values = [ { ...event, pricePerPerson: 0 }, { ...event, isFree: true }, { ...event, pricePerPerson: undefined } ];
    expect(values.map(e => prepareRows(demoTrip, [e as typeof event])[0].cells[10])).toEqual(["A definir", 0, ""]);
  });
  it("mantém cancelados e a regra financeira existente", () => { const row = prepareRows(demoTrip, [{ ...event, status: "cancelado" }])[0]; expect(row.cells[8]).toBe("Cancelado"); expect(row.cells[10]).toBe(0); });
  it("ordena e agrupa todos os dias sem mutar os eventos", () => {
    const events = [{ ...event, date: "2026-11-02" }, event, { ...event, startTime: "06:00" }];
    const rows = prepareRows(demoTrip, events);
    expect(rows[0].cells[2]).toBe("06:00"); expect(groupRows(rows).map(([day, list]) => [day, list.length])).toEqual([["2026-10-29", 2], ["2026-11-02", 1]]);
    expect(events[0].date).toBe("2026-11-02");
  });
  it("gera CSV BOM, separador pt-BR, aspas e multiline", () => {
    const csv = createCsv(prepareRows(demoTrip, [event]));
    expect(csv.startsWith('\uFEFF"Data";')).toBe(true);
    expect(csv).toContain('"Café; ""Mel"""'); expect(csv).toContain('"Linha 1\nLinha 2"'); expect(csv).toContain("40,00");
  });
  it("neutraliza fórmulas em textos CSV", () => { for (const text of ["=1+1", "+cmd", "@SUM(1)", " -1+1", "\t=1"]) expect(csvCell(text)).toContain("'"); });
  it("normaliza nomes de arquivo", () => { expect(exportFilename("Brasília da Mel", "pdf")).toBe("rumo-brasilia-da-mel-roteiro.pdf"); expect(exportFilename("../../", "csv")).toBe("rumo-viagem-roteiro.csv"); });
  it("suporta roteiro vazio", () => { expect(prepareRows(demoTrip, [])).toEqual([]); expect(createCsv([]).split("\r\n")).toHaveLength(1); });
  it("produz XLSX reabrível com valores numéricos e filtros", async () => {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const data = await createExcel(prepareRows(demoTrip, [event]), "BRL");
    await workbook.xlsx.load(data as never);
    const sheet = workbook.getWorksheet("Roteiro")!;
    expect(sheet.getCell("K2").value).toBe(40); expect(sheet.getCell("E2").value).toBe(event.title); expect(sheet.autoFilter).toBeTruthy();
  }, 20000);
  it("produz PDF real inclusive com notas longas", async () => {
    const data = await createPdf(demoTrip, prepareRows(demoTrip, [{ ...event, notes: "Observação longa. ".repeat(800) }]));
    expect(new TextDecoder().decode(data.slice(0, 5))).toBe("%PDF-");
  });
});
