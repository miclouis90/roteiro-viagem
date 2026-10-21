// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EventForm } from "./EventForm";
import { demoEvents, demoTrip } from "../data/demo";
import { saveEvent } from "../services/repository";
import type { TripEvent } from "../types";
import { FirebaseError } from "firebase/app";
vi.mock("../services/repository", () => ({ saveEvent: vi.fn().mockResolvedValue("one-stay") }));
vi.mock("../hooks/useToast", () => ({ useToast: () => vi.fn() }));
let root: Root, container: HTMLDivElement;
const existing: TripEvent = { ...demoEvents[0], id: "hotel", category: "Hotel", title: "Pouso do Cerrado", location: "Rua do Sol, 10", startTime: "15:00", endTime: "", pricePerPerson: 900, peopleCount: 1, details: { type: "lodging", checkOutDate: "2026-11-02", checkOutTime: "11:00", guests: 3, bookingReference: "REF-PRIVATE", notes: "Observação protegida" } };
beforeEach(() => {
  vi.clearAllMocks(); vi.mocked(saveEvent).mockResolvedValue("one-stay"); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); } });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function mount(event?: TripEvent, privateAllowed = true) {
  await act(async () => root.render(<EventForm trip={demoTrip} event={event} expandDetails privateReservationAllowed={privateAllowed} onClose={vi.fn()} onSaved={vi.fn()} />));
}
function field(label: string) {
  return [...container.querySelectorAll("label")].find(el => el.textContent?.trim().startsWith(label))?.querySelector("input") as HTMLInputElement;
}
async function change(label: string, value: string) {
  const input = field(label); expect(input).toBeTruthy();
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(input,value); input.dispatchEvent(new Event("input",{bubbles:true})); });
}
async function choose(label: string) {
  const button = [...container.querySelectorAll("button")].find(el => el.textContent === label)!;
  expect(button).toBeTruthy(); await act(async () => button.click());
}
async function submit() { await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles:true,cancelable:true }))); }
const saved = () => vi.mocked(saveEvent).mock.calls.at(-1)![1];

it("cria uma única estadia com o essencial e sem horário obrigatório", async () => {
  await mount(); await choose("Hospedagem");
  await change("Nome da hospedagem", "Hotel do Cerrado"); await change("Local / endereço", "Rua do Sol, 10");
  await change("Data de check-out", "2026-11-02");
  expect(field("Horário *")).toBeUndefined(); expect(field("Horário final")).toBeUndefined();
  await submit();
  expect(saveEvent).toHaveBeenCalledOnce();
  expect(saved()).toMatchObject({ category:"Hotel", date:demoTrip.startDate, startTime:"", endTime:"", peopleCount:1, pricePerPerson:0, details:{type:"lodging",checkOutDate:"2026-11-02"} });
});
it("salva horários, hóspedes e valor total sem multiplicação, com reserva progressiva", async () => {
  await mount(); await choose("Hospedagem"); await choose("Airbnb/aluguel");
  await change("Nome da hospedagem", "Apartamento central"); await change("Local / endereço", "Quadra 100, Brasília");
  await change("Data de check-out", "2026-11-02"); await change("Horário de check-in", "15:00");
  await change("Horário de check-out", "10:00"); await change("Quantidade de hóspedes", "4");
  await change("Valor total da hospedagem", "1500"); await change("Código de reserva", "CODE");
  await change("Link da reserva", "https://example.com/reserva"); await change("Observações da hospedagem", "Contato privado");
  await submit();
  expect(saveEvent).toHaveBeenCalledOnce();
  expect(saved()).toMatchObject({ pricePerPerson:1500,peopleCount:1,startTime:"15:00",endTime:"",details:{type:"lodging",checkOutDate:"2026-11-02",checkOutTime:"10:00",guests:4,bookingReference:"CODE",bookingUrl:"https://example.com/reserva",notes:"Contato privado"} });
});
it("edita a mesma estadia mantendo id e informações de reserva", async () => {
  await mount(existing); await change("Valor total da hospedagem", "1100"); await change("Data de check-out", "2026-11-03");
  await submit();
  expect(vi.mocked(saveEvent).mock.calls[0][2]).toBe(existing.id);
  expect(saved()).toMatchObject({pricePerPerson:1100,peopleCount:1,details:{guests:3,bookingReference:"REF-PRIVATE",checkOutDate:"2026-11-03"}});
  expect(existing.pricePerPerson).toBe(900);
});
it.each(["2026-10-29","2026-10-28","2026-11-04"])("recusa intervalo inválido com check-out %s", async end => {
  await mount(existing); await change("Data de check-out",end); await submit();
  expect(saveEvent).not.toHaveBeenCalled(); expect(container.querySelector('[role="alert"]')?.textContent).toContain("check-out");
});
it("exige o endereço e recusa hóspedes fracionários", async () => {
  await mount(existing); await change("Local / endereço", ""); await submit(); expect(saveEvent).not.toHaveBeenCalled();
  await change("Local / endereço", "Brasília"); await change("Quantidade de hóspedes", "1.5"); await submit();
  expect(saveEvent).not.toHaveBeenCalled();
});
it("não oferece campos privados para visitante com edição por link", async () => {
  const details = { ...existing.details! };
  delete details.bookingReference;
  delete details.notes;
  await mount({...existing,details},false);
  expect(field("Código de reserva")).toBeUndefined(); expect(field("Link da reserva")).toBeUndefined();
  await submit(); expect(saved().details).not.toHaveProperty("bookingReference");
});
it("preserva horários e preço de outra categoria após visitar Hospedagem", async () => {
  await mount({...demoEvents[0],startTime:"09:00",endTime:"10:00",peopleCount:2});
  await choose("Hospedagem"); await choose("Comer"); await choose("Café"); await submit();
  expect(saved()).toMatchObject({category:"Café",startTime:"09:00",endTime:"10:00",peopleCount:2,pricePerPerson:demoEvents[0].pricePerPerson});
  expect(saved().details).toBeUndefined();
});
it.each([
  ["permission-denied", "regras publicadas"],
  ["invalid-argument", "dados inválidos"],
  ["unavailable", "conexão"],
])("exibe diagnóstico seguro de %s e mantém o formulário preenchido", async (code, message) => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.mocked(saveEvent).mockRejectedValueOnce(new FirebaseError(code, "PRIVATE-CODE https://example.com/SECRET"));
  await mount(existing); await submit();
  expect(container.querySelector('[role="alert"]')?.textContent?.toLowerCase()).toContain(message);
  expect(field("Nome da hospedagem").value).toBe(existing.title);
  expect(field("Data de check-out").value).toBe("2026-11-02");
  expect(JSON.stringify(warn.mock.calls)).not.toMatch(/PRIVATE-CODE|SECRET|https:/);
  expect(warn.mock.calls[0][1]).toMatchObject({code});
});
it("salva hospedagem gratuita e valida preço negativo antes de enviar", async () => {
  await mount(existing); await change("Valor total da hospedagem", "-1"); await submit();
  expect(saveEvent).not.toHaveBeenCalled();
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("valor total válido");
  const free = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  await act(async () => free.click()); await submit();
  expect(saved()).toMatchObject({isFree:true,pricePerPerson:0,peopleCount:1});
});
