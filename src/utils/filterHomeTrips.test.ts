import { describe, expect, it } from "vitest";
import { demoTrip } from "../data/demo";
import { filterHomeTrips } from "./filterHomeTrips";
const mel = { ...demoTrip, id: "mel", title: "Brasília da Mel", destinationCity: "Brasília", startDate: "2026-10-29", endDate: "2026-11-02", status: "confirmada" as const };
const past = { ...mel, id: "past", title: "Férias", destinationCity: "Recife", startDate: "2025-01-01", endDate: "2025-01-05", status: "concluída" as const };
describe("listagem da Home", () => {
  it("acomoda uma ou várias viagens sem duplicar seções", () => {
    expect(filterHomeTrips([mel], "", "", "2026-09-26")).toEqual({upcoming:[mel],others:[]});
    const later = {...mel,id:"later",startDate:"2027-01-01"};
    expect(filterHomeTrips([later,past,mel], "", "", "2026-09-26")).toEqual({upcoming:[mel,later],others:[past]});
  });
  it("combina busca sem acentos e status", () => {
    expect(filterHomeTrips([mel,past], " BRASILIA ", "confirmada", "2026-09-26").upcoming).toEqual([mel]);
    expect(filterHomeTrips([mel,past], "recife", "concluída", "2026-09-26").others).toEqual([past]);
    expect(filterHomeTrips([mel,past], "mel", "planejamento", "2026-09-26")).toEqual({upcoming:[],others:[]});
  });
});
