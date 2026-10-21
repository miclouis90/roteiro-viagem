// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EventForm } from "./EventForm";
import { demoEvents, demoTrip } from "../data/demo";
import { saveEvent } from "../services/repository";
import { validDetails } from "../data/eventDetails";
import type { TripEvent } from "../types";

vi.mock("../services/repository", () => ({ saveEvent: vi.fn().mockResolvedValue("saved-flight") }));
vi.mock("../hooks/useToast", () => ({ useToast: () => vi.fn() }));
const flight: TripEvent = { ...demoEvents[0], id: "old-flight", category: "Voo", startTime: "07:45", endTime: "09:20", details: { type: "flight", departureTime: "07:45", arrivalTime: "09:20", boardingTime: "07:10", company: "Example", notes: "Nota preservada" } };
let root: Root, container: HTMLDivElement;
const onSaved = vi.fn(), onClose = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); } });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function mount(event?: TripEvent, expandDetails = true) {
  await act(async () => root.render(<EventForm trip={demoTrip} kind="transport" event={event} expandDetails={expandDetails} onClose={onClose} onSaved={onSaved} />));
}
function field(label: string) {
  return [...container.querySelectorAll('label')].find(element => element.textContent?.trim().startsWith(label))?.querySelector('input') as HTMLInputElement;
}
async function change(element: HTMLInputElement, value: string) {
  expect(element).toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => { setter.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function button(text: string) {
  const element = [...container.querySelectorAll('button')].find(element => element.textContent === text);
  expect(element).toBeTruthy();
  await act(async () => element!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}
async function submit() {
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}
function saved() { return vi.mocked(saveEvent).mock.calls.at(-1)![1]; }

it("cria voo essencial com uma única partida, sem horários duplicados", async () => {
  await mount(undefined, false);
  expect(field('Data da partida *')).toBeTruthy();
  expect(field('Horário da partida *')).toBeTruthy();
  await change(field('Nome *'), 'Voo de ida');
  await change(field('Horário da partida *'), '23:40');
  await submit();
  expect(saved()).toMatchObject({ category: 'Voo', date: demoTrip.startDate, startTime: '23:40', endTime: '' });
  expect(saved().details).toBeUndefined();
  expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'saved-flight', startTime: '23:40' }));
});

it("salva embarque e chegada no dia seguinte sem usar Horário final ou novo campo de schema", async () => {
  await mount();
  expect(field('Partida')).toBeUndefined();
  expect(field('Horário final')).toBeUndefined();
  expect(container.querySelectorAll('input[type="time"]')).toHaveLength(3);
  await change(field('Nome *'), 'Voo noturno');
  await change(field('Horário da partida *'), '23:40');
  await change(field('Horário de embarque'), '23:00');
  await change(field('Chegada'), '01:20');
  await change(field('Notas do voo'), 'Chegada em 30/10/2026, horário local.');
  await submit();
  expect(saved()).toMatchObject({ startTime: '23:40', endTime: '', details: { type: 'flight', boardingTime: '23:00', arrivalTime: '01:20', notes: 'Chegada em 30/10/2026, horário local.' } });
  expect(saved().details).not.toHaveProperty('departureTime');
  expect(saved().details).not.toHaveProperty('arrivalDate');
  expect(validDetails(saved().details)).toBe(true);
  expect(container.querySelector('[role="alert"]')).toBeNull();
});

it("ao abrir, cancelar ou salvar outro campo não reconcilia divergências históricas", async () => {
  const old = { ...flight, details: { ...flight.details!, departureTime: '08:10', arrivalTime: '10:00' } };
  const baseline = structuredClone(old);
  await mount(old);
  expect(container.querySelector('.flight-time-review')?.textContent).toContain('07:45');
  expect(container.querySelector('.flight-time-review')?.textContent).toContain('08:10');
  expect(container.querySelector('.flight-time-review')?.textContent).toContain('09:20');
  expect(container.querySelector('.flight-time-review')?.textContent).toContain('10:00');
  expect(saveEvent).not.toHaveBeenCalled();
  await button('Cancelar');
  expect(onClose).toHaveBeenCalledOnce();
  expect(saveEvent).not.toHaveBeenCalled();
  await change(field('Nome *'), 'Nome atualizado');
  await submit();
  expect(saved()).toMatchObject({ title: 'Nome atualizado', startTime: '07:45', endTime: '09:20', details: old.details });
  expect(old).toEqual(baseline);
});

it.each(['07:45', '08:10'])("unifica partida legada somente após escolher %s", async time => {
  await mount({ ...flight, details: { ...flight.details!, departureTime: '08:10' } });
  await button('Usar partida ' + time);
  await submit();
  expect(saved().startTime).toBe(time);
  expect(saved().details?.departureTime).toBe(time);
  expect(saved().details?.boardingTime).toBe('07:10');
});

it("editar a partida atualiza o espelho legado e preserva o embarque", async () => {
  await mount(flight);
  await change(field('Horário da partida *'), '08:00');
  await submit();
  expect(saved()).toMatchObject({ startTime: '08:00', details: { departureTime: '08:00', boardingTime: '07:10' } });
});

it("editar apenas a partida não sobrescreve uma chegada divergente", async () => {
  await mount({ ...flight, details: { ...flight.details!, arrivalTime: '10:00' } });
  await change(field('Horário da partida *'), '08:00');
  await submit();
  expect(saved()).toMatchObject({ startTime: '08:00', endTime: '09:20', details: { arrivalTime: '10:00' } });
});

it.each(['09:20', '10:00'])("unifica chegada divergente somente após escolher %s", async time => {
  await mount({ ...flight, details: { ...flight.details!, arrivalTime: '10:00' } });
  await button('Usar chegada ' + time);
  await submit();
  expect(saved().endTime).toBe(time);
  expect(saved().details?.arrivalTime).toBe(time);
});

it("edita a chegada para depois da meia-noite mantendo as regras existentes", async () => {
  await mount({ ...flight, startTime: '23:40', endTime: '', details: { ...flight.details!, departureTime: '23:40' } });
  await change(field('Chegada'), '01:20');
  await submit();
  expect(saved()).toMatchObject({ startTime: '23:40', endTime: '', details: { arrivalTime: '01:20' } });
});

it("preserva voo antigo sem details e usa seu horário final como chegada no formulário", async () => {
  const old = { ...flight };
  delete old.details;
  await mount(old);
  expect(field('Chegada').value).toBe('09:20');
  await submit();
  expect(saved()).toMatchObject({ startTime: '07:45', endTime: '09:20' });
  expect(saved().details).toBeUndefined();
  await change(field('Chegada'), '09:50');
  await submit();
  expect(saved()).toMatchObject({ endTime: '09:50', details: { type: 'flight', arrivalTime: '09:50' } });
});

it("permite remover a chegada sem manter o horário final oculto", async () => {
  await mount(flight);
  await change(field('Chegada'), '');
  await submit();
  expect(saved().endTime).toBe('');
  expect(saved().details).not.toHaveProperty('arrivalTime');
  expect(saved().details?.boardingTime).toBe('07:10');
});

it("preserva a chegada ao trocar de Aeroporto para Voo, que compartilham detalhes", async () => {
  await mount({ ...flight, category: 'Aeroporto' });
  await change(field('Chegada'), '10:30');
  await button('Voo');
  expect(field('Chegada').value).toBe('10:30');
  expect(field('Horário final')).toBeUndefined();
  await button('Usar chegada 10:30');
  await submit();
  expect(saved()).toMatchObject({ category: 'Voo', endTime: '10:30', details: { arrivalTime: '10:30', boardingTime: '07:10' } });
});

it("horário final antigo após meia-noite só é adaptado após confirmação explícita", async () => {
  const old = { ...flight, startTime: '23:40', endTime: '01:20', details: { type: 'flight' as const, boardingTime: '23:00' } };
  await mount(old);
  expect(saveEvent).not.toHaveBeenCalled();
  await button('Confirmar chegada 01:20');
  await submit();
  expect(saved()).toMatchObject({ startTime: '23:40', endTime: '', details: { arrivalTime: '01:20', boardingTime: '23:00' } });
  expect(old.endTime).toBe('01:20');
});

it.each(['Café', 'Transfer', 'Aeroporto'])("preserva os campos e a validação do tipo %s", async category => {
  await mount({ ...demoEvents[0], category, startTime: '09:00', endTime: '10:00' });
  expect(field('Data *')).toBeTruthy();
  expect(field('Horário *')).toBeTruthy();
  expect(field('Horário final')).toBeTruthy();
  expect(field('Data da partida')).toBeUndefined();
  await change(field('Horário final'), '08:00');
  await submit();
  expect(saveEvent).not.toHaveBeenCalled();
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('posterior ao inicial no mesmo dia');
  await change(field('Horário final'), '11:00');
  await submit();
  expect(saved()).toMatchObject({ category, startTime: '09:00', endTime: '11:00' });
});
